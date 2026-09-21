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


## Admin email configuration

Application email is configured from Admin -> Server controls. SMTP host, port, TLS, username, password, sender and the public Sögur Forge URL are stored as application settings; the SMTP password is encrypted with a key derived from AUTH_SECRET. Existing SMTP environment variables remain supported as a recovery/fallback path, but in-app admin settings take priority.

The same email configuration is used for account verification, password-reset links and future account notifications.

## Personal backup destinations

The administrator only decides which backup methods are permitted. Dropbox, Google Drive and OneDrive destination choices belong to each user and are configured in that user's Settings page. Per-user provider and folder preferences are stored separately. Provider OAuth connection and scheduled cloud uploads will use those saved personal destinations rather than a shared administrator storage account.


## Google Drive and OneDrive OAuth backups

Google Drive and OneDrive are connected by each user from Settings -> Cloud backups. The administrator only enables or disables each provider. The Sögur Forge server still needs an OAuth application registration for each provider so Google or Microsoft knows which application is asking for access.

Configure these variables on the app service:

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `ONEDRIVE_CLIENT_ID`
- `ONEDRIVE_CLIENT_SECRET`

Register these exact callback URLs, replacing the host with the public Sögur Forge URL configured under Admin -> Email delivery:

- Google: `https://forge.example.com/api/account/cloud-backups/googleDrive/callback`
- Microsoft: `https://forge.example.com/api/account/cloud-backups/oneDrive/callback`

For Google, enable the Drive API and request the `drive.file` scope. For Microsoft, register a web application that supports the account types you want to allow and grant delegated `Files.ReadWrite.AppFolder`, plus OpenID profile/email and offline access. User refresh tokens are encrypted with AUTH_SECRET before being stored.

Google backups are placed in an app-created Sögur Forge folder. OneDrive backups use the application's OneDrive App Folder. Any folder entered by the user is created beneath that provider-owned Sögur Forge area.
