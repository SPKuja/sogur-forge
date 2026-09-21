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

Google Drive and OneDrive OAuth application credentials are configured in the in-app Admin panel when a provider is first enabled. They do not need to be placed in the Docker stack. Users then connect their own cloud accounts from User Settings.

## Admin email configuration

Application email is configured from Admin -> Server controls. SMTP host, port, TLS, username, password, sender and the public Sögur Forge URL are stored as application settings; the SMTP password is encrypted with a key derived from AUTH_SECRET. Existing SMTP environment variables remain supported as a recovery/fallback path, but in-app admin settings take priority.

The same email configuration is used for account verification, password-reset links and future account notifications.

## Personal backup destinations

The administrator only decides which backup methods are permitted. Dropbox, Google Drive and OneDrive destination choices belong to each user and are configured in that user's Settings page. Per-user provider and folder preferences are stored separately. Provider OAuth connection and scheduled cloud uploads will use those saved personal destinations rather than a shared administrator storage account.


## Google Drive and OneDrive OAuth backups

Google Drive and OneDrive are connected by each user from Settings -> Cloud backups. The administrator only enables or disables each provider and configures the server's OAuth application registration from the Admin panel.

Register the callback URL shown by Sögur Forge in the provider's developer console. For Google, enable the Drive API and request the `drive.file` scope. For Microsoft, register a web application and grant delegated `Files.ReadWrite.AppFolder`, plus OpenID profile/email and offline access.

Google backups are placed in an app-created Sögur Forge folder. OneDrive backups use the application's OneDrive App Folder. Any folder entered by the user is created beneath that provider-owned Sögur Forge area.

## Cloud OAuth application setup in Admin

Google Drive and OneDrive application credentials are configured in the Sögur Forge Admin panel, not in the Docker stack. Under Backup policy, enabling an unconfigured provider opens a setup dialog showing the exact callback URL and fields for its Client ID and Client secret.

Cloud application secrets are encrypted with AUTH_SECRET before they are stored. The public Sögur Forge URL configured under Admin -> Email delivery is used to generate the callback URL.

Changing an already configured OAuth Client ID or secret deliberately clears existing user connections for that provider because refresh tokens belong to the OAuth application that issued them. Users can reconnect with one click afterwards.


## Credential display policy

Secrets are write-only in the Sögur Forge administration UI. SMTP passwords and OAuth client secrets can be entered or replaced, but the stored value is never returned to or displayed by the Admin panel. User OAuth access and refresh tokens are never exposed through the UI or data exports.

OAuth Client IDs are intentionally still visible because they are public identifiers rather than secrets and are included in provider authorization URLs. Sensitive values are encrypted at rest with a key derived from AUTH_SECRET and are only decrypted internally when Sögur Forge needs to authenticate to the relevant service.
