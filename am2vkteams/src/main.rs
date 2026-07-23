//! am2vkteams — a bridge between Prometheus Alertmanager and the VK Teams Bot API.
//!
//! Alertmanager POSTs its webhook payload to `POST /alert`; we reply `200 "ok"`
//! immediately and deliver the formatted alerts to VK Teams from a background
//! task, so a slow VK Teams API can never make Alertmanager time out or retry.

mod format;
mod numira;
mod vkteams;

use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use std::sync::Arc;
use std::time::Duration;

/// Immutable runtime configuration and the shared HTTP client.
struct AppState {
    client: reqwest::Client,
    api_url: String,
    token: String,
    chat_id: String,
    numira_url: Option<String>,
    numira_token: Option<String>,
    numira_agent: String,
}

#[tokio::main]
async fn main() {
    let token = require_env("VKT_TOKEN");
    let chat_id = require_env("VKT_CHAT_ID");
    let api_url = env_or("VKT_API_URL", "https://myteam.mail.ru/bot/v1");
    let listen_addr = env_or("LISTEN_ADDR", "127.0.0.1:9095");

    // Numira is enabled only when both URL and token are present.
    let numira_url = optional_env("NUMIRA_URL");
    let numira_token = optional_env("NUMIRA_TOKEN");
    let numira_agent = env_or("NUMIRA_AGENT", "default");
    if numira_url.is_some() && numira_token.is_some() {
        eprintln!("numira: LLM analysis enabled");
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .unwrap_or_else(|e| {
            eprintln!("error: cannot build HTTP client: {e}");
            std::process::exit(1);
        });

    let state = Arc::new(AppState {
        client,
        api_url,
        token,
        chat_id,
        numira_url,
        numira_token,
        numira_agent,
    });

    let app = Router::new()
        .route("/alert", post(handle_alert))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&listen_addr)
        .await
        .unwrap_or_else(|e| {
            eprintln!("error: cannot bind to {listen_addr}: {e}");
            std::process::exit(1);
        });
    eprintln!("am2vkteams listening on {listen_addr}, endpoint POST /alert");

    if let Err(e) = axum::serve(listener, app).await {
        eprintln!("error: server stopped: {e}");
        std::process::exit(1);
    }
}

/// Webhook handler. Acknowledges immediately and does the delivery work in a
/// detached task.
async fn handle_alert(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<format::Webhook>,
) -> (StatusCode, &'static str) {
    tokio::spawn(process(state, payload));
    (StatusCode::OK, "ok")
}

/// Deliver the alerts to VK Teams and, optionally, an LLM analysis afterwards.
async fn process(state: Arc<AppState>, payload: format::Webhook) {
    if payload.alerts.is_empty() {
        return;
    }

    for message in format::build_messages(&payload.alerts) {
        vkteams::send_text(
            &state.client,
            &state.api_url,
            &state.token,
            &state.chat_id,
            &message,
        )
        .await;
    }

    // Optional LLM analysis of firing alerts — best effort, never fatal.
    if let (Some(url), Some(nt)) = (&state.numira_url, &state.numira_token) {
        if let Some(context) = format::build_llm_context(&payload.alerts) {
            if let Some(analysis) =
                numira::analyze(&state.client, url, nt, &state.numira_agent, &context).await
            {
                let message = format!("🤖 {analysis}");
                vkteams::send_text(
                    &state.client,
                    &state.api_url,
                    &state.token,
                    &state.chat_id,
                    &message,
                )
                .await;
            }
        }
    }
}

/// Read a required env var, exiting with a clear message when it is missing.
fn require_env(key: &str) -> String {
    match std::env::var(key) {
        Ok(v) if !v.is_empty() => v,
        _ => {
            eprintln!("error: required environment variable {key} is not set");
            std::process::exit(1);
        }
    }
}

/// Read an env var, returning `None` when it is unset or empty.
fn optional_env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.is_empty())
}

/// Read an env var or fall back to `default`.
fn env_or(key: &str, default: &str) -> String {
    optional_env(key).unwrap_or_else(|| default.to_string())
}
