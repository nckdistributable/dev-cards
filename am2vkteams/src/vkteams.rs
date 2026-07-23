//! VK Teams Bot API client. Only the `sendText` call is needed.

/// Send a single text message via `GET {api_url}/messages/sendText`.
///
/// Delivery errors (network failures, non-2xx responses from VK Teams) are
/// logged to stderr and swallowed: the bridge never retries and never fails
/// because a notification could not be delivered.
pub async fn send_text(
    client: &reqwest::Client,
    api_url: &str,
    token: &str,
    chat_id: &str,
    text: &str,
) {
    let url = format!("{}/messages/sendText", api_url.trim_end_matches('/'));
    let result = client
        .get(&url)
        .query(&[("token", token), ("chatId", chat_id), ("text", text)])
        .send()
        .await;

    match result {
        Ok(resp) if resp.status().is_success() => {}
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            eprintln!("vkteams: sendText returned {status}: {body}");
        }
        Err(err) => {
            eprintln!("vkteams: sendText request failed: {err}");
        }
    }
}
