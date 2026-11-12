# Security

## Reporting a problem

If you find a security problem in TradeHub, please do not open a public issue. Use
GitHub's "Report a vulnerability" button on the repository's Security tab so it can be
fixed before it is disclosed.

## What is in place

- Passwords are stored as bcrypt hashes; sign-in sessions are signed tokens that expire after 30 days.
- Rate limits on the whole API, with stricter limits on sign-in, sign-up and on anything that writes data.
- Secure HTTP headers (Content-Security-Policy, HSTS, no-sniff, frame blocking) on every response.
- All input is validated on the server, and every database query is parameterised.
- Uploaded photos are checked by content, size-limited, renamed, and served as static files only.
- Phone numbers and emails are only revealed to the other person once both sides accept a trade.
- Users can report listings; admins can take them down. Users can delete their account and data.
- CI runs tests, a dependency audit and CodeQL code scanning on every change; Dependabot proposes updates.

## Before going live

- Set a long random `JWT_SECRET` and `NODE_ENV=production` (the server refuses to start without the secret).
- Serve the site over HTTPS only (most hosts do this for you) and set `TRUST_PROXY`.
- Keep `/data` (database and photos) on a persistent, backed-up disk.
- Set `ADMIN_EMAILS` to the accounts allowed to moderate.
