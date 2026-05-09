# Security Policy

## Supported versions

LexVoice is currently in early development. Security fixes are expected to target the latest published version.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the maintainer rather than opening a public issue with exploit details. If a private reporting channel is not yet available, open a minimal public issue asking for a secure contact path.

## Notes for users

- Do not publish `.obsidian/plugins/lexvoice/data.json`; it may contain API keys and prompt/context data.
- Use your own API keys and rotate them if they were ever committed or shared.
- Review configured transcription and AI endpoints before sending sensitive recordings.
