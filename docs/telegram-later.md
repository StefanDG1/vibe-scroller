# Connect Telegram later

The owner deferred Telegram on 2026-09-30. The web capture form and in-app inbox are the current entry points. Browser notification permission is optional and requires a gesture. Permission alone does not implement background push. Email needs a verified sender and delivery test.

1. Open Telegram's official BotFather and create a VibeScroller bot with `/newbot`. Choose the display name and a unique bot username ending in `bot`.
2. Store the bot token in the deployment secret store as `TELEGRAM_BOT_TOKEN`. Do not paste it into chat, Git, support email or a screenshot.
3. Generate an independent high-entropy webhook secret. Configure the HTTPS webhook with the Bot API's `setWebhook` and `secret_token`. Verify delivery through `getWebhookInfo`.
4. Add a browser-authenticated pairing flow. Bind a numeric Telegram user ID, not a username, to the selected workspace with a single-use token expiring after 10 minutes. Confirm the exact numeric identity in the browser.
5. Validate `X-Telegram-Bot-Api-Secret-Token` before parsing the bounded update body. Persist the update ID in an idempotent receipt and rate-limit the linked numeric user.
6. Capture permitted URLs through the same tenant-authorized transaction as the web inbox. Messages cannot approve code, spend money, change connections or publish PRs.
7. Reply with a safe status and an authenticated application link. Never send transcripts, repository code, evidence grants or provider credentials through Telegram.
8. Test expired/reused tokens, foreign users, forwarded messages, duplicate updates, malicious URLs, unlinking and webhook-secret rotation in staging. Record evidence separately from the web notification tests.
9. Publish provider/privacy disclosures and enable the connection only after the tests pass. Disconnection deletes the token binding and stops future notifications while preserving the user's library.

This checklist is preparation. A live bot or completed Telegram integration is not claimed.
