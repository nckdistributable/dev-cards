//! Alertmanager webhook payload types, message formatting and chunking.

use serde::Deserialize;
use std::collections::HashMap;

/// Maximum number of characters per outgoing VK Teams message.
///
/// `sendText` is a GET request, so the text travels in the URL. We keep a
/// conservative bound and split strictly on alert-block boundaries.
const MAX_CHARS: usize = 3500;

/// Top-level Alertmanager webhook body. Only the fields we need are declared;
/// unknown fields are ignored and missing ones fall back to defaults so that
/// a partial or empty payload never fails deserialization.
#[derive(Debug, Default, Deserialize)]
pub struct Webhook {
    #[serde(default)]
    pub alerts: Vec<Alert>,
}

/// A single alert entry inside `alerts[]`.
#[derive(Debug, Default, Deserialize)]
pub struct Alert {
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub labels: HashMap<String, String>,
    #[serde(default)]
    pub annotations: HashMap<String, String>,
}

impl Alert {
    fn label<'a>(&'a self, key: &str, fallback: &'a str) -> &'a str {
        self.labels.get(key).map(String::as_str).unwrap_or(fallback)
    }

    /// summary, falling back to description.
    fn text(&self) -> Option<&str> {
        self.annotations
            .get("summary")
            .or_else(|| self.annotations.get("description"))
            .map(String::as_str)
    }
}

/// Format a single alert into one text block (header + optional detail lines).
pub fn format_alert(alert: &Alert) -> String {
    let name = alert.label("alertname", "unknown");
    let severity = alert.label("severity", "unknown");

    let mut block = if alert.status == "resolved" {
        format!("✅ [RESOLVED] {name}")
    } else if severity == "critical" {
        format!("🔥 [FIRING] {name} (critical)")
    } else {
        format!("⚠️ [FIRING] {name} ({severity})")
    };

    if let Some(instance) = alert.labels.get("instance") {
        block.push('\n');
        block.push_str(instance);
    }
    if let Some(text) = alert.text() {
        block.push('\n');
        block.push_str(text);
    }

    block
}

/// Build one or more messages from the alerts, packing whole alert blocks
/// together while keeping each message at or below `MAX_CHARS`.
///
/// Blocks are never split in the middle: a block is either fully in a message
/// or moved to the next one. A single block longer than `MAX_CHARS` is emitted
/// on its own (it cannot be split further without breaking the boundary rule).
pub fn build_messages(alerts: &[Alert]) -> Vec<String> {
    const SEP: &str = "\n\n";
    let mut messages = Vec::new();
    let mut current = String::new();

    for alert in alerts {
        let block = format_alert(alert);
        if current.is_empty() {
            current = block;
            continue;
        }
        let combined = current.chars().count() + SEP.chars().count() + block.chars().count();
        if combined <= MAX_CHARS {
            current.push_str(SEP);
            current.push_str(&block);
        } else {
            messages.push(std::mem::take(&mut current));
            current = block;
        }
    }

    if !current.is_empty() {
        messages.push(current);
    }
    messages
}

/// Build a compact textual context for the LLM from firing alerts only.
///
/// Returns `None` when there are no firing alerts (resolved ones are skipped
/// and never analyzed).
pub fn build_llm_context(alerts: &[Alert]) -> Option<String> {
    let mut lines = Vec::new();
    for alert in alerts {
        if alert.status == "resolved" {
            continue;
        }
        let name = alert.label("alertname", "unknown");
        let severity = alert.label("severity", "unknown");
        let instance = alert.label("instance", "-");
        let summary = alert.text().unwrap_or("-");
        lines.push(format!(
            "- {name} (severity={severity}, instance={instance}): {summary}"
        ));
    }
    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn alert(status: &str, labels: &[(&str, &str)], annotations: &[(&str, &str)]) -> Alert {
        Alert {
            status: status.to_string(),
            labels: labels
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
            annotations: annotations
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
        }
    }

    #[test]
    fn resolved_block() {
        let a = alert(
            "resolved",
            &[("alertname", "InstanceDown"), ("instance", "srv-1")],
            &[("summary", "recovered")],
        );
        assert_eq!(format_alert(&a), "✅ [RESOLVED] InstanceDown\nsrv-1\nrecovered");
    }

    #[test]
    fn critical_firing_block() {
        let a = alert(
            "firing",
            &[
                ("alertname", "InstanceDown"),
                ("severity", "critical"),
                ("instance", "agg-server (prod)"),
            ],
            &[("summary", "Сервер недоступен")],
        );
        assert_eq!(
            format_alert(&a),
            "🔥 [FIRING] InstanceDown (critical)\nagg-server (prod)\nСервер недоступен"
        );
    }

    #[test]
    fn warning_firing_block() {
        let a = alert(
            "firing",
            &[("alertname", "HighLatency"), ("severity", "warning")],
            &[("summary", "p99 high")],
        );
        assert_eq!(format_alert(&a), "⚠️ [FIRING] HighLatency (warning)\np99 high");
    }

    #[test]
    fn description_fallback_when_no_summary() {
        let a = alert(
            "firing",
            &[("alertname", "DiskFull"), ("severity", "warning")],
            &[("description", "disk 95%")],
        );
        assert_eq!(format_alert(&a), "⚠️ [FIRING] DiskFull (warning)\ndisk 95%");
    }

    #[test]
    fn missing_labels_and_annotations() {
        let a = alert("firing", &[], &[]);
        // no alertname, no severity, no instance, no summary
        assert_eq!(format_alert(&a), "⚠️ [FIRING] unknown (unknown)");
    }

    #[test]
    fn single_alert_one_message() {
        let a = alert("firing", &[("alertname", "X"), ("severity", "critical")], &[]);
        let msgs = build_messages(&[a]);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0], "🔥 [FIRING] X (critical)");
    }

    #[test]
    fn empty_alerts_no_messages() {
        assert!(build_messages(&[]).is_empty());
    }

    #[test]
    fn chunking_splits_on_block_boundaries() {
        // Build many alerts whose combined length exceeds several MAX_CHARS.
        let filler = "y".repeat(300); // each block ~ header + filler
        let alerts: Vec<Alert> = (0..40)
            .map(|i| {
                alert(
                    "firing",
                    &[("alertname", "A"), ("severity", "warning")],
                    &[("summary", &format!("{i}-{filler}"))],
                )
            })
            .collect();

        let msgs = build_messages(&alerts);
        assert!(msgs.len() > 1, "expected multiple chunks, got {}", msgs.len());

        for m in &msgs {
            assert!(
                m.chars().count() <= MAX_CHARS,
                "message exceeds MAX_CHARS: {} chars",
                m.chars().count()
            );
            // Every message must start with a full block header — never a
            // fragment of a previous block.
            assert!(
                m.starts_with("⚠️ [FIRING] A (warning)"),
                "message does not start at a block boundary: {m:?}"
            );
        }

        // No block is lost: number of headers across all messages == alert count.
        let total_blocks: usize = msgs
            .iter()
            .map(|m| m.matches("[FIRING]").count())
            .sum();
        assert_eq!(total_blocks, 40);
    }

    #[test]
    fn llm_context_skips_resolved() {
        let alerts = vec![
            alert("firing", &[("alertname", "A"), ("severity", "critical")], &[("summary", "boom")]),
            alert("resolved", &[("alertname", "B")], &[]),
        ];
        let ctx = build_llm_context(&alerts).expect("firing alert present");
        assert!(ctx.contains("A (severity=critical, instance=-): boom"));
        assert!(!ctx.contains("B"));
    }

    #[test]
    fn llm_context_none_when_only_resolved() {
        let alerts = vec![alert("resolved", &[("alertname", "B")], &[])];
        assert!(build_llm_context(&alerts).is_none());
    }

    #[test]
    fn deserialize_fixture_payload() {
        let raw = r#"{
            "version": "4",
            "status": "firing",
            "alerts": [
                {
                    "status": "firing",
                    "labels": {"alertname": "InstanceDown", "severity": "critical", "instance": "agg-server (prod)"},
                    "annotations": {"summary": "Сервер недоступен более 2 минут"},
                    "startsAt": "2026-07-23T10:00:00Z"
                }
            ]
        }"#;
        let webhook: Webhook = serde_json::from_str(raw).expect("valid payload");
        assert_eq!(webhook.alerts.len(), 1);
        let a = &webhook.alerts[0];
        assert_eq!(a.status, "firing");
        assert_eq!(a.labels.get("alertname").unwrap(), "InstanceDown");
        assert_eq!(a.labels.get("severity").unwrap(), "critical");
        assert_eq!(a.annotations.get("summary").unwrap(), "Сервер недоступен более 2 минут");
    }

    #[test]
    fn deserialize_empty_object() {
        let webhook: Webhook = serde_json::from_str("{}").expect("empty object ok");
        assert!(webhook.alerts.is_empty());
    }
}
