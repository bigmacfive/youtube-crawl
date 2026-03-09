# Contributing

Thanks for contributing to `youtube-crawl`.

## Development Setup

Requirements:

- Node.js 22+
- npm 10+

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Workflow

1. Create a focused branch for your work.
2. Keep changes scoped to one bug fix, feature, or documentation update.
3. Update docs when behavior, setup, or screenshots change.
4. Run the verification steps before opening a pull request.

## Verification

Run the baseline checks locally:

```bash
npm run lint
npm run build
```

If your change affects transcript loading, also verify the flow with a real YouTube URL.

## Pull Requests

Please include:

- a short summary of the change
- why the change is needed
- verification notes
- screenshots for UI changes when relevant

## Scope

Good pull requests for this repo usually improve one of these areas:

- transcript extraction reliability
- workspace UX
- provider integrations
- local-first privacy and data handling
- documentation and onboarding
