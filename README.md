# LexVoice

[English](README.md) | [简体中文](README.zh-CN.md)

LexVoice is an Obsidian desktop plugin for recording audio, transcribing speech, and turning transcripts into usable Markdown notes.

It focuses on practical work notes: meetings, interviews, small-group discussions, single-person voice notes, imported audio files, daily-note summaries, and cleanup of empty short recordings.

## What You Need

LexVoice does not ship with API keys or a hosted backend. To use cloud transcription or AI organization, prepare your own service credentials.

Required:

- Obsidian desktop app
- A speech-to-text service, either cloud-based or local
- A folder in your vault for recordings
- A folder in your vault for generated notes

Optional:

- A large-language-model API for summaries, action items, translations, and custom prompt templates
- A virtual audio device if you want to record online meetings, Bilibili desktop app audio, browser videos, or other computer playback
- A vocabulary file for domain terms, names, products, and abbreviations

## Installation

1. Close Obsidian.
2. Put this folder under your vault:

   ```
   <your vault>/.obsidian/plugins/lexvoice/
   ```

3. Start Obsidian.
4. Open Settings -> Community plugins and enable LexVoice.
5. Open LexVoice settings and configure transcription before recording.

Do not publish or share your local `data.json`. It may contain API keys and user settings.

## Basic Workflow

1. Open the LexVoice live panel.
2. Choose an audio input.
3. Choose a transcription prompt such as work notes, interview, personal notes, or learning notes.
4. Start recording.
5. LexVoice saves audio files and writes transcript sections into a Markdown note.
6. If an AI service is configured, LexVoice organizes the transcript into a readable note.

Default storage paths:

- Recordings: `LexVoice/录音`
- Notes: `LexVoice/转写纪要`

Both paths can be changed in settings.

## Main Features

- Background recording while you work in other notes
- Real-time segmented transcription
- AI-organized notes with configurable templates
- Imported audio transcription and merging
- Daily-note meeting overview when a daily note already exists
- Optional vocabulary prompt for better recognition of domain terms
- Translation or bilingual note output handled during AI organization
- Queue and retry support for failed transcription or organization tasks
- One-click cleanup for empty short recordings under 10 seconds
- Update checks from the official LexVoice GitHub release source

## Transcription Services

LexVoice sends audio to the transcription service configured in settings. Common setups include:

- SiliconFlow-compatible audio transcription
- OpenAI audio transcription
- Alibaba Cloud Model Studio / DashScope through a compatible gateway
- Local services such as faster-whisper, Xinference, whisper.cpp wrappers, or other OpenAI-compatible transcription servers

Cloud services usually require payment or account credits. Local services can be free to run, but require local installation and hardware resources.

## AI Organization

AI organization is optional. Without it, LexVoice still saves audio and transcript text. With it, LexVoice can produce:

- Meeting notes
- Interview notes
- Small-group discussion notes
- Monologue or voice-note drafts
- Action items
- Daily-note summaries
- Translated or bilingual notes
- Custom prompt templates that appear in recording, import, and re-organize flows

Configure your large-language-model service in settings before using these features.

## Computer Audio Capture

Obsidian desktop cannot directly capture system audio in a reliable cross-platform way. LexVoice cannot directly listen to whatever is playing in your headphones or speakers. To record the other side of an online meeting, the Bilibili desktop app, a browser video, or any other computer playback, route the playback output to a virtual audio device and select the corresponding LexVoice audio input mode.

Recommended routing:

1. Send the meeting app, Bilibili desktop app, browser, player, or system output to a virtual device.
2. Let LexVoice record that virtual device as the computer-audio input.
3. Monitor the same audio through your real speaker or headphones so you can still hear it.

Common tools:

- Windows: VB-Cable
- macOS: BlackHole
- Linux: PulseAudio or PipeWire monitor sources

On Windows, `CABLE Input` is confusingly named: it appears as a playback/output device. Set the meeting app, Bilibili desktop app, browser, or system output to `CABLE Input`; LexVoice records the matching `CABLE Output`, which appears under recording/input devices. To hear the audio yourself, open Control Panel -> Sound -> Recording, open `CABLE Output`, enable "Listen to this device", and choose your real headphones/speakers under "Playback through this device". Keep Windows default input set to your real microphone, not `CABLE Output`; `CABLE Output` is the recording side used by LexVoice to read computer audio. If listening latency is obvious, use a mixer such as VoiceMeeter for multi-output routing.

On macOS, create a Multi-Output Device that includes both your real headphones/speakers and BlackHole, then set system output or the meeting/video app output to that multi-output device.

These tools are optional and are not bundled with LexVoice.

## Privacy

LexVoice has no analytics, ads, or telemetry. It stores settings locally in `.obsidian/plugins/lexvoice/data.json`.

LexVoice does not operate its own cloud storage service and does not upload recordings to a LexVoice server. Recording files are saved only to the local Obsidian vault path you choose.

When you use transcription or AI features, the relevant audio, transcript, and prompt context are sent to the cloud API provider or local model endpoint you configure. Review your provider's privacy policy and obtain consent before recording or processing sensitive conversations.

For confidential, private, client, medical, legal, HR, or regulated content, prefer local speech-to-text and a local large-language model instead of cloud APIs.

See [PRIVACY.md](PRIVACY.md) for details.

## Open Source And Notices

This project is released under the MIT License. See [LICENSE](LICENSE).

Third-party services and tools mentioned in the plugin are optional integrations or setup references, not bundled dependencies. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### Design Inspiration

The HTML PPT feature was inspired by the HTML-first slide-deck workflow and design principles documented in [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design). In the language requested by that project's license notice: **Derived from alchaincyf/huashu-design**.

LexVoice does not bundle or redistribute `huashu-design` source code, scripts, assets, demos, or media. The LexVoice implementation is an independent renderer and prompt workflow written for this plugin. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the attribution and license-scope note.

## Known Limitations

- Desktop only.
- Mobile Obsidian is not supported.
- Local transcription requires a separate local service.
- System/meeting audio requires a virtual audio device.
- API keys currently live in local plugin settings; do not commit `data.json`.

## Development

LexVoice follows the standard Obsidian plugin build layout: edit the source in `src/main.ts`, run `npm install`, then use `npm run dev` while developing or `npm run build` before publishing. The generated `main.js` is kept in the repository because Obsidian loads that file directly and GitHub releases distribute `manifest.json`, `main.js`, and `styles.css`.

## Release Checklist

Before publishing a release:

- Confirm `data.json` is not committed.
- Rotate any API key that was previously committed or shared.
- Include `manifest.json`, `main.js`, `styles.css`, `README.md`, `LICENSE`, `PRIVACY.md`, `SECURITY.md`, and `THIRD_PARTY_NOTICES.md`.
- Verify `manifest.json` has a unique plugin id and a semantic version.
- Test the plugin in a separate Obsidian vault.
