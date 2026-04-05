# Security Policy

## Reporting a vulnerability

Please do not open a public GitHub issue for security-sensitive problems.

Report security issues privately to the maintainers through GitHub Security Advisories for this repository if enabled, or contact the repository owners directly before public disclosure.

## What counts as sensitive here

Trove handles:

- local browser cookies
- authenticated session reuse
- local raw JSONL artifacts
- personal saved content and chat exports

Please treat bugs involving authentication, cookie handling, local credential exposure, or leakage of synced personal data as security issues.

## Safe reporting guidelines

- Do not include raw cookies, session tokens, or unsanitized personal payloads in reports.
- Sanitize screenshots, stack traces, and fixtures before sharing them.
- If reproduction requires real source data, reduce it to the minimum necessary fields first.
