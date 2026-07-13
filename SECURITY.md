# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — do **not** open a public issue.

Use **GitHub Security Advisories**: on the repository's **Security** tab, choose
**"Report a vulnerability"**. This opens a private channel with the maintainers.

Include, if you can: a description of the issue, affected version/commit, steps
to reproduce, and any suggested fix.

## Response expectations

- **Acknowledgement:** within 72 hours.
- **Assessment & triage:** we confirm the report and share an initial severity
  assessment as soon as we can after acknowledgement.
- **Fix & disclosure:** we coordinate a fix and disclosure timeline with you.
  Please give us reasonable time to remediate before any public disclosure.

This is a pre-1.0, MIT-licensed project maintained on a best-effort basis;
timelines are targets, not guarantees.

## Supported versions

Only the latest `main` is supported. Fixes land on `main`; there are no
backported release branches. Provided as-is under the MIT license.

## Hygiene invariants (CI-enforced)

Every pull request runs checks that help keep the repository clean:

- **Secret scanning** — GitHub secret-scanning and push-protection are enabled;
  a CI job also scans diffs for credentials.
- **No personal paths** — the `no-personal-paths` workflow fails CI on committed
  personal absolute paths.

No secrets, credentials, or personal data should ever be committed.
