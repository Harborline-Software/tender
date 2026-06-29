# Security Policy

## Reporting a vulnerability
Please report security issues **privately** via GitHub Security Advisories
("Report a vulnerability" under the Security tab) — not a public issue. We aim to acknowledge
within 72 hours.

## Supported
Only the latest `main` is supported. MIT-licensed, provided as-is.

## Hygiene invariants (CI-enforced)
- No secrets/credentials/personal data are ever committed.
- The `no-personal-paths` workflow fails CI on committed personal absolute paths.
- GitHub secret-scanning + push-protection are enabled on this repository.
