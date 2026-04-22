# s2t — Facebook Video to Text Skill

A CLI tool that downloads audio from a Facebook video and generates a transcript or summary using **Gemini 1.5 Flash**.

## Prerequisites

- **Node.js** v18+
- **ffmpeg** — required by `yt-dlp` for audio extraction
  ```bash
  # macOS (via Homebrew)
  brew install ffmpeg
  ```
- **Gemini API Key** — get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your API key to `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

## Usage

```bash
npx ts-node src/fb-s2t.ts <facebook-video-url> [mode]
```

### Modes

| Mode | Description |
|------|-------------|
| `transcript` | *(default)* Full word-for-word transcript with speaker labels |
| `summary` | Concise summary + key points bullet list |
| `both` | Transcript + summary + key points |

### Examples

```bash
# Full transcript
npx ts-node src/fb-s2t.ts "https://www.facebook.com/watch?v=123456789"

# Summary only
npx ts-node src/fb-s2t.ts "https://www.facebook.com/watch?v=123456789" summary

# Transcript + summary
npx ts-node src/fb-s2t.ts "https://www.facebook.com/watch?v=123456789" both
```

## How It Works

```
Facebook URL
     │
     ▼
yt-dlp (extracts audio-only MP3)
     │
     ▼
Base64 encode audio
     │
     ▼
Gemini 1.5 Flash (multimodal audio understanding)
     │
     ▼
Transcript / Summary printed to console
```

## Notes

- Works best with **public** Facebook videos.
- Private/restricted videos may require Facebook cookies — see [yt-dlp cookie docs](https://github.com/yt-dlp/yt-dlp#changes-to-yt-dl-youtube-cookie-file).
- Gemini 1.5 Flash supports up to **9.5 hours** of audio per request.
- Audio files are automatically cleaned up after transcription.
