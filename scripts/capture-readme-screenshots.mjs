// Run with: npm install --no-save playwright && npx playwright install chromium && node scripts/capture-readme-screenshots.mjs
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const APP_URL = (process.env.APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUTPUT_DIR = path.join(process.cwd(), "output", "playwright", "readme");

const segments = [
  {
    start: 0,
    duration: 32,
    end: 32,
    timestamp: "00:00",
    text: "Today we are building a local-first workflow for reading YouTube transcripts without sending everything to a hosted backend by default.",
  },
  {
    start: 32,
    duration: 38,
    end: 70,
    timestamp: "00:32",
    text: "The first step is simple input hygiene: accept watch URLs, shorts URLs, short links, or raw video ids so the app does not force one brittle entry point.",
  },
  {
    start: 70,
    duration: 41,
    end: 111,
    timestamp: "01:10",
    text: "Before opening any AI panel, the interface shows metadata, language, duration, and transcript segment counts so the user can verify the source.",
  },
  {
    start: 111,
    duration: 45,
    end: 156,
    timestamp: "01:51",
    text: "The workspace keeps the raw transcript in the center and treats summary, detail, and chat as optional lenses that the user can activate only when needed.",
  },
  {
    start: 156,
    duration: 45,
    end: 201,
    timestamp: "02:36",
    text: "That matters for cost control because long transcripts can become expensive if every route eagerly calls a model before the user even knows whether the video is worth studying.",
  },
  {
    start: 201,
    duration: 48,
    end: 249,
    timestamp: "03:21",
    text: "On the backend a small Python worker uses youtube-transcript-api, while the Next.js app handles preview, storage, and provider-specific requests from the browser.",
  },
  {
    start: 249,
    duration: 45,
    end: 294,
    timestamp: "04:09",
    text: "API keys stay in local browser storage, and the server only sees them on the exact request that needs summary generation or transcript-aware chat.",
  },
  {
    start: 294,
    duration: 46,
    end: 340,
    timestamp: "04:54",
    text: "A small retrieval step narrows the transcript into relevant chunks for chat so follow-up questions stay grounded instead of pasting a wall of text every turn.",
  },
  {
    start: 340,
    duration: 43,
    end: 383,
    timestamp: "05:40",
    text: "Because the app stores the current workspace and recent videos locally, coming back to a channel review later feels more like reopening a desk than starting over.",
  },
  {
    start: 383,
    duration: 43,
    end: 426,
    timestamp: "06:23",
    text: "The goal is not to automate interpretation away, but to make transcript review faster, cheaper, and easier to keep under the user's control.",
  },
];

const transcript = {
  videoId: "jNQXAC9IVRw",
  canonicalUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  title: "Building a Local-First Transcript Workflow",
  authorName: "youtube-crawl demo",
  thumbnailUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
  language: {
    code: "en",
    label: "English",
    isGenerated: false,
  },
  availableLanguages: [
    {
      code: "en",
      label: "English",
      isGenerated: false,
      isTranslatable: true,
    },
    {
      code: "ko",
      label: "Korean",
      isGenerated: true,
      isTranslatable: true,
    },
  ],
  stats: {
    segmentCount: segments.length,
    durationSeconds: segments.at(-1)?.end ?? 0,
    wordCount: segments
      .flatMap((segment) => segment.text.split(/\s+/))
      .filter(Boolean).length,
    characterCount: segments.map((segment) => segment.text).join("\n").length,
  },
  transcript: segments.map((segment) => segment.text).join("\n"),
  timestampedTranscript: segments
    .map((segment) => `[${segment.timestamp}] ${segment.text}`)
    .join("\n"),
  segments,
};

const summaryContent = `TL;DR: A local-first transcript workflow should validate the video first, keep the raw script central, and only call AI when the reader explicitly asks for help.

## Key Points
- Normalize many YouTube URL formats so input is not fragile.
- Show metadata before the workspace so the user can verify the source.
- Keep transcript reading primary and AI views optional.
- Store keys locally and send them only on the request that needs them.
- Use chunk retrieval so chat stays grounded in the transcript.

## Timestamp Guide
- [00:32] Input handling and URL normalization
- [01:10] Preview-first verification
- [03:21] Python worker plus Next.js routing
- [04:09] Local storage and BYOK privacy model

## Why It Matters
The product reduces unnecessary model calls, keeps user trust high, and makes long-form review feel more like working from a research desk than a chat box.`;

const detailContent = `## Executive Frame
This walkthrough argues that transcript tools work better when they behave like local workspaces first and AI wrappers second.

Instead of generating everything immediately, the app lets the reader inspect the source, read the raw script, and then decide whether summary, detail, or chat is worth the cost.

## Main Themes
- [00:32] Robust input parsing removes friction from the first interaction.
- [01:10] Preview metadata creates a verification checkpoint before analysis.
- [02:36] On-demand AI keeps token cost and latency under control.
- [04:09] Local key storage improves trust for personal workflows.

## Important Statements
- The transcript remains the center of gravity for the workspace.
- AI outputs are framed as lenses, not replacements for source reading.
- Retrieval keeps follow-up answers tied to specific transcript chunks.

## Deeper Breakdown
The architecture splits responsibility cleanly. Python is used where transcript extraction is more reliable, while Next.js keeps the user flow simple and stores local workspace state in the browser.

The user experience is intentionally staged. Load a link, inspect metadata, read the source, and only then decide whether to summarize or ask follow-up questions.

## Practical Takeaways
- Default to raw transcript view.
- Defer expensive generation until a tab is opened.
- Make storage behavior explicit in the settings page.
- Keep screenshots and README examples aligned with the real routes.`;

const chatMessages = [
  {
    role: "user",
    content: "What is the main product idea here?",
  },
  {
    role: "assistant",
    content:
      "The core idea is a local-first transcript desk: verify the video first, keep the raw transcript as the default workspace, and layer summary or chat on top only when the user asks for it.",
    sources: [
      {
        label: "00:32-01:10",
        excerpt:
          "The first step is simple input hygiene and a preview checkpoint before analysis.",
        start: 32,
        end: 111,
      },
      {
        label: "01:51-03:21",
        excerpt:
          "The workspace keeps the raw transcript central and defers AI until needed.",
        start: 111,
        end: 249,
      },
    ],
  },
];

const workspace = {
  url: transcript.canonicalUrl,
  language: "en",
  provider: "openai",
  instruction: "Answer in Korean when the user asks in Korean and cite timestamps when helpful.",
  activeTab: "script",
  transcript,
  selectedVideo: {
    videoId: transcript.videoId,
    title: transcript.title,
    canonicalUrl: transcript.canonicalUrl,
    authorName: transcript.authorName,
    thumbnailUrl: transcript.thumbnailUrl,
  },
  summaryState: {
    status: "loaded",
    content: summaryContent,
    error: "",
  },
  detailState: {
    status: "loaded",
    content: detailContent,
    error: "",
  },
  chatMessages,
  providerModels: {
    openai: "gpt-5",
    anthropic: "claude-sonnet-4-20250514",
    google: "gemini-2.5-flash",
  },
  apiKeys: {
    openai: "demo-key",
    anthropic: "",
    google: "",
  },
};

const history = [
  {
    id: `${transcript.videoId}-demo`,
    videoId: transcript.videoId,
    title: transcript.title,
    authorName: transcript.authorName,
    thumbnailUrl: transcript.thumbnailUrl,
    canonicalUrl: transcript.canonicalUrl,
    language: transcript.language.code,
    savedAt: Date.now() - 55 * 60 * 1000,
    transcript,
    chatMessages,
    summaryContent,
    detailContent,
  },
];

const settings = {
  provider: workspace.provider,
  instruction: workspace.instruction,
  providerModels: workspace.providerModels,
  apiKeys: workspace.apiKeys,
};

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1512, height: 982 },
    colorScheme: "light",
  });
  const page = await context.newPage();

  await seedStorage(page);

  await captureHome(page);
  await capturePreview(page);
  await captureWorkspace(page);
  await captureSummary(page);
  await captureSettings(page);

  await browser.close();
}

async function seedStorage(page) {
  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ workspaceData, historyData, settingsData }) => {
      window.localStorage.clear();
      window.localStorage.setItem("youtube-crawl.theme", "light");
      window.localStorage.setItem(
        "transcript-desk.workspace.v2",
        JSON.stringify(workspaceData),
      );
      window.localStorage.setItem(
        "transcript-desk.history",
        JSON.stringify(historyData),
      );
      window.localStorage.setItem(
        "transcript-desk.settings",
        JSON.stringify(settingsData),
      );
    },
    {
      workspaceData: workspace,
      historyData: history,
      settingsData: settings,
    },
  );
}

async function captureHome(page) {
  await page.goto(`${APP_URL}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Recent");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "home.png"),
    fullPage: true,
  });
}

async function capturePreview(page) {
  await page.goto(`${APP_URL}/preview`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Video Overview");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "preview.png"),
    fullPage: true,
  });
}

async function captureWorkspace(page) {
  await page.goto(`${APP_URL}/workspace`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Chat");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "workspace.png"),
    fullPage: true,
  });
}

async function captureSummary(page) {
  await page.goto(`${APP_URL}/workspace`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Summary/i }).first().click();
  await page.waitForSelector("text=Core Takeaway");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "summary.png"),
    fullPage: true,
  });
}

async function captureSettings(page) {
  await page.goto(`${APP_URL}/settings`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Provider");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "settings.png"),
    fullPage: true,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
