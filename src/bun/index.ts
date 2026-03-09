/// <reference types="bun-types" />

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { ApplicationMenu, BrowserWindow } from "electrobun/bun";

const APP_TITLE = "Transcript Desk";
const HEALTH_APP_NAME = "Transcript Desk";
const DESKTOP_PORT = process.env.TRANSCRIPT_DESK_PORT ?? "3195";
const DESKTOP_BASE_URL = `http://127.0.0.1:${DESKTOP_PORT}`;
const DESKTOP_HEALTH_URL = `${DESKTOP_BASE_URL}/api/health`;

let nextServerProcess: Bun.Subprocess | null = null;

ApplicationMenu.setApplicationMenu([
  {
    label: APP_TITLE,
    submenu: [
      { role: "about" },
      { type: "divider" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "showAll" },
      { type: "divider" },
      { role: "quit" },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "divider" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "pasteAndMatchStyle" },
      { role: "delete" },
      { role: "selectAll" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      { role: "close" },
      { type: "divider" },
      { role: "toggleFullScreen" },
    ],
  },
]);

registerCleanup();
void bootstrap();

async function bootstrap() {
  try {
    const devUrl = process.env.ELECTROBUN_NEXT_URL?.trim();

    if (devUrl) {
      createMainWindow(devUrl);
      return;
    }

    await startPackagedNextServer();
    await waitForHealth(DESKTOP_HEALTH_URL);
    createMainWindow(DESKTOP_BASE_URL);
  } catch (error) {
    createErrorWindow(
      error instanceof Error ? error.message : "Failed to launch the desktop app.",
    );
  }
}

async function startPackagedNextServer() {
  const standaloneDir = resolve(import.meta.dir, "..", "next", "standalone");
  const serverEntry = join(standaloneDir, "server.js");

  if (!existsSync(serverEntry)) {
    throw new Error(
      "The packaged Next runtime is missing. Run npm run desktop:build first.",
    );
  }

  nextServerProcess = Bun.spawn({
    cmd: [process.execPath, serverEntry],
    cwd: standaloneDir,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      PORT: DESKTOP_PORT,
    },
    stdout: "ignore",
    stderr: "inherit",
  });

  nextServerProcess.exited.then((code) => {
    if (code !== 0) {
      console.error(`[desktop] embedded Next server exited with code ${code}`);
    }
  });
}

async function waitForHealth(url: string, timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (nextServerProcess?.exitCode !== null && nextServerProcess.exitCode !== 0) {
      throw new Error(
        `The embedded Next server exited early with code ${nextServerProcess.exitCode}.`,
      );
    }

    try {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as { ok?: boolean; app?: string };

        if (data.ok && data.app === HEALTH_APP_NAME) {
          return;
        }
      }
    } catch {}

    await Bun.sleep(250);
  }

  throw new Error(`Timed out while waiting for ${url}.`);
}

function createMainWindow(url: string) {
  new BrowserWindow({
    title: APP_TITLE,
    url,
    renderer: "native",
    titleBarStyle: "hiddenInset",
    frame: {
      width: 960,
      height: 640,
      x: 180,
      y: 120,
    },
  });
}

function createErrorWindow(message: string) {
  new BrowserWindow({
    title: `${APP_TITLE} Error`,
    url: null,
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(APP_TITLE)} Error</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px;
        background: #f7f9fc;
        color: #1f2328;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(720px, 100%);
        border: 1px solid #d7dde8;
        background: #ffffff;
        box-shadow: 0 22px 60px rgba(15, 23, 42, 0.08);
        padding: 28px;
      }
      h1 {
        margin: 0 0 14px;
        font-size: 28px;
      }
      p {
        margin: 0;
        white-space: pre-wrap;
        font-size: 14px;
        line-height: 1.8;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(APP_TITLE)} could not start</h1>
      <p>${escapeHtml(message)}</p>
    </main>
  </body>
</html>`,
    renderer: "native",
    titleBarStyle: "default",
    frame: {
      width: 760,
      height: 520,
      x: 180,
      y: 120,
    },
  });
}

function registerCleanup() {
  const cleanup = () => {
    if (nextServerProcess && nextServerProcess.exitCode === null) {
      nextServerProcess.kill("SIGTERM");
    }
  };

  process.on("beforeExit", cleanup);
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
