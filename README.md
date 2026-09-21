# Sögur Forge

Sögur Forge is a focused, self-hostable workspace for writing novels and organising the story around them.

The manuscript is the centre of the application. Characters, locations, ideas, world building and planning tools exist to support the writing rather than turn it into database administration.

## Status

Early development. The first goal is a Docker-first, PostgreSQL-backed writing workspace suitable for running on a home server or VPS.


## Account email and verification

The first account created on a fresh Sögur Forge installation becomes the administrator. Existing installations automatically preserve access by promoting the oldest account and treating existing email addresses as verified.

For verified self-registration, configure these environment variables on the `app` service:

- `APP_BASE_URL` — the public Sögur Forge URL, for example `https://forge.example.com`
- `SMTP_HOST`
- `SMTP_PORT` — defaults to `587`
- `SMTP_SECURE` — `true` for implicit TLS such as port 465, otherwise `false`
- `SMTP_USER` and `SMTP_PASSWORD` when authentication is required
- `SMTP_FROM` — sender address/name; falls back to `SMTP_USER`

The administrator can disable new registrations or email-verification enforcement from the in-app Admin page.


## Backup provider controls

The administrator chooses which backup destinations users can see. The clean account-data export is always available; backup destinations are policy controlled.

The browser-download backup requires no provider credentials. Cloud destinations require OAuth application credentials to be configured on the Sögur Forge server before the administrator can enable them:

- Dropbox: `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`
- Google Drive: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`
- OneDrive: `ONEDRIVE_CLIENT_ID`, `ONEDRIVE_CLIENT_SECRET`

These are application credentials owned by the server administrator. When cloud upload support is connected, each user will authorise their own storage account separately; one user's access token will never be shared with another user.
