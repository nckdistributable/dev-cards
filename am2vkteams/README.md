# am2vkteams

A small, production-ready bridge between **Prometheus Alertmanager** and the
**VK Teams Bot API**. Alertmanager has no native VK Teams integration:

```
Alertmanager --webhook_configs (POST JSON)--> am2vkteams --> VK Teams Bot API
```

The service runs on the same VM as Alertmanager, under systemd. It is written
in Rust and ships as a single static `x86_64-unknown-linux-musl` binary with no
runtime dependencies (rustls only, no OpenSSL).

## How it works

1. Listens on `LISTEN_ADDR` (default `127.0.0.1:9095`), endpoint `POST /alert`.
2. Accepts the standard Alertmanager webhook payload. Only `alerts[].status`,
   `labels` and `annotations` are parsed; unknown and missing fields are
   ignored, so payload variations never break it.
3. Replies `200 "ok"` **immediately** and delivers messages from a background
   task, so a slow VK Teams API can never make Alertmanager time out or retry.
4. Formats one block per alert:
   - resolved → `✅ [RESOLVED] {alertname}`
   - firing + `severity=critical` → `🔥 [FIRING] {alertname} (critical)`
   - other firing → `⚠️ [FIRING] {alertname} ({severity})`
   - followed by `instance` and `summary` (or `description` if no summary).
5. Sends via `GET {VKT_API_URL}/messages/sendText`. Because the text travels in
   the URL, long payloads are split into messages of ≤ 3500 characters, cut
   strictly on alert-block boundaries.
6. Delivery errors (network, non-2xx) are logged to stderr (journald) — no
   retries, no crashes.

## Configuration (environment only)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VKT_TOKEN` | ✅ | — | VK Teams bot token |
| `VKT_CHAT_ID` | ✅ | — | Target chat id |
| `VKT_API_URL` | | `https://myteam.mail.ru/bot/v1` | Bot API base URL |
| `LISTEN_ADDR` | | `127.0.0.1:9095` | HTTP listen address |
| `NUMIRA_URL` | | — | Enables LLM analysis (with `NUMIRA_TOKEN`) |
| `NUMIRA_TOKEN` | | — | Bearer token for Numira |
| `NUMIRA_AGENT` | | `default` | Numira agent id |

Missing required variables produce a clear error at startup. See
[`deploy/am2vkteams.env.example`](deploy/am2vkteams.env.example).

### Optional LLM analysis (Numira)

When both `NUMIRA_URL` and `NUMIRA_TOKEN` are set, after the raw alerts are
delivered the firing alerts are summarized and sent to
`POST {NUMIRA_URL}/api/agents/invoke` (bearer auth, 60 s timeout). The reply is
posted as a separate `🤖 …` message. The exact Numira API contract is not yet
confirmed, so the whole call is isolated in `src/numira.rs` — adjusting to the
final docs means editing only that file. Any LLM error or timeout is silently
ignored and never affects raw-alert delivery; resolved alerts are not analyzed.

## Build

```sh
rustup target add x86_64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl
```

The release profile enables `lto` and `strip`; the resulting binary is at
`target/x86_64-unknown-linux-musl/release/am2vkteams`.

## Deploy

```sh
# 1. Copy the binary
scp target/x86_64-unknown-linux-musl/release/am2vkteams user@vm:/tmp/
ssh user@vm 'sudo mv /tmp/am2vkteams /usr/local/bin/ && sudo chmod 755 /usr/local/bin/am2vkteams'

# 2. Create the env file (from the example) and lock it down
sudo cp deploy/am2vkteams.env.example /etc/am2vkteams.env
sudo chmod 600 /etc/am2vkteams.env
sudo editor /etc/am2vkteams.env   # fill in VKT_TOKEN, VKT_CHAT_ID, ...

# 3. Install and start the service
sudo cp deploy/am2vkteams.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now am2vkteams
sudo systemctl status am2vkteams
journalctl -u am2vkteams -f
```

The unit runs with `DynamicUser=yes`, `NoNewPrivileges=yes` and further
hardening — the service needs no privileges and no persistent state.

## Wire up Alertmanager

Add a webhook to an existing receiver in `alertmanager.yml`:

```yaml
  webhook_configs:
    - url: 'http://127.0.0.1:9095/alert'
      send_resolved: true
```

Reload Alertmanager:

```sh
curl -X POST http://127.0.0.1:9093/-/reload
```

## Verify

Send a test payload directly to the service:

```sh
curl -sS -X POST http://127.0.0.1:9095/alert \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {"alertname": "InstanceDown", "severity": "critical", "instance": "agg-server (prod)"},
        "annotations": {"summary": "Сервер недоступен более 2 минут"}
      }
    ]
  }'
# -> ok
```

End-to-end through Alertmanager:

```sh
amtool alert add InstanceDown severity=critical instance="agg-server (prod)" \
  --annotation=summary="e2e test"
```

## Getting the token and chat id

- **Token:** talk to the **Metabot** in VK Teams, `/newbot`, follow the prompts.
- **chatId of a group chat:** add the bot to the chat, then read the chat id
  from the bot API `GET {VKT_API_URL}/events/get` response.

## Development

```sh
cargo test
cargo clippy --all-targets -- -D warnings
```
