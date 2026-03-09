# Transcript Desk

Minimal local-first YouTube transcript workstation.

Paste a YouTube link, review the channel and video metadata, then move into a transcript-first workspace. You can use your own OpenAI, Claude, or Google API key to:

- generate an English summary
- generate a detailed breakdown on demand
- chat against the transcript
- copy or download the raw script as `txt` or `json`

The app is designed to run locally and stay fully open-source.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- `youtube-transcript-api` through a local Python worker

## Features

- Link input page that only focuses on loading the video
- Separate preview page for channel and video metadata
- Separate settings page for provider, model, API key, and caption language
- Transcript-first workspace with a document panel and AI side panel
- Summary and Detail generation only when the corresponding tab is opened
- Watch URL, short URL, and raw video id support
- Full transcript plus timestamped transcript output
- Local Python worker for more reliable subtitle extraction
- Bring-your-own-key AI panel for OpenAI, Claude, and Google
- Local browser storage for transcript state, active tab, generated documents, chat history, and API settings
- Transcript-aware chat that selects relevant chunks instead of sending the whole wall of text each turn
- Minimal One Light inspired UI

## Local Run

Requirements:

- Node.js 22+
- Python 3

Install dependencies and prepare the local Python worker:

```bash
npm install
npm run setup
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## App Flow

1. `/`: paste a YouTube link and load the transcript
2. `/preview`: inspect the channel and video metadata
3. `/workspace`: read the raw transcript first, then request Summary, Detail, or chat
4. `/settings`: manage API keys, model defaults, instruction, and caption language

## How It Works

1. The frontend sends the pasted YouTube link to `/api/transcript`.
2. The Next.js route calls `scripts/fetch_transcript.py`.
3. The Python worker uses `youtube-transcript-api` to fetch subtitle tracks.
4. The app stores transcript and workspace state in local browser storage.
5. The preview page shows the fetched video metadata before entering the workspace.
6. The workspace renders the raw transcript immediately and only generates Summary or Detail when the user opens those tabs.
7. Summary, Detail, and chat requests go through `/api/assistant` using the provider and API key that the user enters.

API keys are not persisted by the server. They are cached only in local browser storage on the current device and sent only with each local request from the browser tab.

## Scripts

- `npm run setup`: create `.venv`, install Python dependencies, and write local runtime config
- `npm run dev`: start the local development server
- `npm run build`: production build
- `npm run lint`: run ESLint
- `npm run desktop:dev`: run the web server and Electrobun desktop app together
- `npm run desktop:build`: bundle the Next app and build the Electrobun desktop app
- `npm run desktop:run`: run the packaged Electrobun app entrypoint

## Verification

The project was verified locally with:

- `npm run setup`
- `npm run lint`
- `npm run build`
- `POST /api/transcript` against `https://www.youtube.com/watch?v=jNQXAC9IVRw`

End-to-end AI generation still requires real provider API keys.

## License

[MIT](./LICENSE)
