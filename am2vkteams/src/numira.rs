//! Optional LLM analysis via the Numira agent API.
//!
//! The exact request/response contract is not yet confirmed against the real
//! Numira documentation, so the whole integration lives behind a single
//! [`analyze`] function. Adjusting to the final API means editing only this
//! file. Every failure path returns `None` — LLM analysis must never affect
//! delivery of the raw alerts.

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Request timeout for the LLM call.
const TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Serialize)]
struct InvokeRequest<'a> {
    agent_id: &'a str,
    message: String,
}

/// Best-effort response shape. The real API field name is unconfirmed, so we
/// accept the most likely candidates and use whichever is present.
#[derive(Deserialize)]
struct InvokeResponse {
    #[serde(default)]
    response: Option<String>,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    result: Option<String>,
    #[serde(default)]
    text: Option<String>,
}

/// Ask the Numira agent to analyze the firing alerts described in `context`.
///
/// Returns `Some(analysis)` on success, `None` on any error or timeout.
pub async fn analyze(
    client: &reqwest::Client,
    base_url: &str,
    token: &str,
    agent_id: &str,
    context: &str,
) -> Option<String> {
    let message = format!(
        "Проанализируй активные алерты Prometheus и укажи вероятную причину \
         и первый шаг диагностики. Ответь максимум тремя предложениями, по-русски.\n\n\
         Алерты:\n{context}"
    );

    let endpoint = format!("{}/api/agents/invoke", base_url.trim_end_matches('/'));
    let response = client
        .post(&endpoint)
        .bearer_auth(token)
        .timeout(TIMEOUT)
        .json(&InvokeRequest { agent_id, message })
        .send()
        .await
        .map_err(|e| eprintln!("numira: request failed: {e}"))
        .ok()?;

    if !response.status().is_success() {
        eprintln!("numira: invoke returned {}", response.status());
        return None;
    }

    let parsed: InvokeResponse = response
        .json()
        .await
        .map_err(|e| eprintln!("numira: cannot parse response: {e}"))
        .ok()?;

    let text = parsed
        .response
        .or(parsed.message)
        .or(parsed.result)
        .or(parsed.text)?;

    let trimmed = text.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}
