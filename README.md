# LexVoice



English | [简体中文](README.zh-CN.md) · [中文文档站](https://lexvoice.cn/zh/)

欢迎加入微信群交流
<img width="897" height="923" alt="770bdaa5d79907b957e851c2901f30ec" src="https://github.com/user-attachments/assets/43971425-2bdd-4bcb-b9bf-d4e0e037b776" />

LexVoice is an Obsidian plugin for recording audio, transcribing speech, building a live outline while you record, and turning meetings into reusable Markdown — todos, learning cards, people records, and ASR hotwords.

It is **not** a hosted cloud service and ships **no API keys**. You connect your own speech-to-text (ASR) service and, optionally, your own large language model (LLM). Recordings stay in your vault; nothing is uploaded to any LexVoice server (there is none).

LexVoice started as a plain record → transcribe → summarize plugin. But the valuable part of a meeting is rarely the raw transcript — it is *who said what, what to do next, what you learned, and the terms you will hear again*. So LexVoice was rebuilt from a transcription tool into a **meeting workbench**: recording is just the entry point; the live outline, the sediment review, and the object library are the point.

LexVoice supports desktop and mobile Obsidian workflows. Mobile recording uses the device microphone and supports segmented or whole-audio transcription after capture. System audio, virtual audio devices, multichannel capture, desktop device diagnostics, and realtime streaming ASR providers that require custom authentication headers require the desktop app.

## Features

### Live outline
Chapters grow as you record, so you can glance at "what was just discussed" mid-meeting instead of waiting until the end. After recording, chapters link to the player — click a chapter to jump to that position in the audio. When recording stops, AI completes the chapters into a full set of meeting notes.

### In-meeting notes
While recording, jot live notes under the outline. The first character can trigger different handling:

Trigger the AI assistant:
- `#term` — hit an unfamiliar term? Type `#<term>` and the AI explains it in the context of the current discussion.
- `?question` — type `?<question>` and the AI answers using the current transcript and outline.
- `!highlight` — type `!<point>` to mark something important and have the final notes treat it accordingly.

Mark only (no AI call):
- `@assignee` — record "@alice follows up"; the final notes prefer assigning that todo to them.
- `/todo` — type `/<action>` to capture an explicit todo candidate.

Half-width and full-width symbols are both accepted. In-meeting notes are fed into the final summarization prompt as clearly-labeled "live supplementary material", never mixed into the raw transcript.

### Ask this note
Ask follow-up questions when the final notes miss a detail or you want to revisit a specific part of the discussion. LexVoice answers from both the organized note and the preserved raw transcript. Useful answers can be written back to one compact **Ask this note** section in the Markdown file.

### Long meetings & recovery
In standard meeting and learning-note modes, long recordings are organized in recoverable parts instead of relying on one all-or-nothing LLM response. LexVoice builds a global topic map, saves each completed part as a local checkpoint, and assembles the final note in time order.

If a request is interrupted or a model reaches its output limit, completed work is reused and only unfinished parts are retried. The raw transcript remains available, and an incomplete result is shown as **partially completed** rather than being saved as an empty note.

### Task progress
The processing panel separates transcription, AI organization, and Markdown writing. It shows the active stage, recent activity, failures, and retry or cancel actions. Failed transcription and failed AI organization remain distinct so you can resume from the step that actually failed.

### Sediment workflow
After each note, AI splits the content into four candidate groups you review assembly-line style — keep / merge / ignore:
- **People** — adjudicated one by one
- **Todos** — selected by default; edit owner, due date, sub-tasks
- **Learning** — concepts, mechanisms, cases, opinions, Q&A
- **Hotwords** — names, organizations, brands, terms, to improve later ASR accuracy

### Object library
LexVoice turns reusable meeting content into standalone Obsidian objects — people profiles, todo cards, learning cards, ASR hotwords, and concept / todo / learning-card walls. Everything lives in your own vault; the next time the same person comes up, it links to the existing profile.

<p align="center">
  <img width="220" alt="LexVoice object" src="https://github.com/user-attachments/assets/df4c5d5f-cb92-4578-a09a-466e8d866b19" />
  <img width="220" alt="Generated people profile" src="https://github.com/user-attachments/assets/fbff01f2-04b4-4995-abcd-794fc37925ea" />
</p>

### Todo enhancements
Edit owner, due date and sub-tasks inline at the candidate stage — no dialogs. Stored todos use standard Markdown task syntax (recognized by plugins like Tasks). Source information is preserved on delete / redo for traceability.

### Recording reliability
- Level meters before and after recording show whether the mic and system audio are actually working.
- Audio inputs remain user-selectable; virtual or remote device names are shown as guidance rather than being selected or rejected automatically.
- A device check in settings diagnoses "recorded but silent" problems.
- Compatible independent multichannel input can be detected and transcribed by channel, with speaker labels that can be mapped to names. Separation stays off when independent channels cannot be verified.
- Deleting a transcript offers to delete its audio file too.

### Export
From one set of notes you can generate an HTML report, an HTML slide deck, an editable `.pptx`, or an `.eml` email draft — same content, different skins.

<p align="center">
  <img width="720" alt="LexVoice export" src="https://github.com/user-attachments/assets/c1d54d4e-a95b-400f-a7f3-9e41ad81c633" />
</p>

### Note list
The sidebar can organize recent notes by folder or by time. Folder groups can be collapsed, the open note is highlighted, and search and template filters remain available in either view.

## Basic usage

1. Open the LexVoice sidebar.
2. Choose a template and an audio input.
3. Start recording; check that the level meter reacts.
4. Watch the live outline; add in-meeting notes if needed.
5. Stop recording and follow transcription and AI organization in **Task progress**.
6. Ask follow-up questions from **Ask this note**, or retry only the failed stage if processing was interrupted.
7. Open **Sediment** and review people, todos, learning cards, and hotwords.
8. If you need to share, generate an HTML report, slides, PPTX, or an email draft.

<p align="center">
  <img width="720" alt="LexVoice in the Obsidian sidebar" src="https://github.com/user-attachments/assets/f29b528a-f219-4404-92b4-0639e354d17e" />
</p>

Default folders (all configurable in settings):

| Content | Path |
|---|---|
| Recordings | `LexVoice/录音` |
| Transcribed notes | `LexVoice/转写纪要` |
| Meeting materials | `LexVoice/会议资料` |
| People | `LexVoice/人员` |
| Learning cards | `LexVoice/学习卡片` |
| Todo cards | `LexVoice/待办卡片` |
| Views | `LexVoice/视图` |
| HTML reports | `LexVoice/HTML报告` |
| Email drafts | `LexVoice/邮件草稿` |
| Glossary | `LexVoice/词汇表.md` |

## Requirements

Required:
- Obsidian 1.10.0 or later
- A speech-to-text service (cloud API or local)
- A vault folder for recordings and notes

Recommended:
- An LLM service — powers the live outline, summarization, sediment, export, and template tuning
- A virtual audio device — to record system / online-meeting audio
- A real microphone — to mix in your own voice
- A domain glossary — greatly improves recognition of names, products, organizations, and terms

## Audio input & real microphone

Capturing system audio cross-platform from the Obsidian desktop app is unreliable, so recording online meetings, web video, courses, or anything played by the computer usually needs a **virtual audio device**:

- Windows: VB-Cable
- macOS: BlackHole
- Linux: PulseAudio / PipeWire monitor source

On Windows with VB-Cable, mind the naming:
- Meeting apps, browsers, and system output → **CABLE Input**
- LexVoice reads **CABLE Output** (a recording device)
- To also record yourself, the **real microphone must be your physical mic** — not CABLE Output, BlackHole, VoiceMeeter, or Stereo Mix

If the level meter does not move, run the device check before starting a long recording.

## Privacy

No ads, no analytics, no telemetry. Settings are stored locally in `.obsidian/plugins/lexvoice/data.json`. Recordings are saved to the local vault path you choose; LexVoice has no cloud storage and uploads nothing to any LexVoice server.

However, if you use a **cloud** ASR or LLM provider, the relevant audio, transcript text, and prompt context are sent to that provider you configured. For sensitive content (client data, medical, legal, HR, recruiting, internal strategy), prefer local transcription + a local model, and obtain consent before recording. See [`PRIVACY.md`](PRIVACY.md).

## Installation

From the Obsidian Community plugins directory:

1. Open **Settings → Community plugins → Browse**.
2. Search for **LexVoice**, then choose **Install** and **Enable**.
3. Open LexVoice settings and configure your transcription service and audio input.

Manual install:

1. Download `main.js`, `manifest.json`, and `styles.css` from the same GitHub Release.
2. Copy them into `<your vault>/.obsidian/plugins/lexvoice/`.
3. Reload Obsidian and enable **LexVoice** under Community plugins.

## License & credits

LexVoice is released under the MIT License — see [`LICENSE`](LICENSE).

The HTML slide-deck feature was inspired by [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design); its HTML-first slide workflow and design principles influenced this work. Per the upstream license: Derived from alchaincyf/huashu-design.
