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
