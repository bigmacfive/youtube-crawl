/**
 * Transcript fetcher — calls Python youtube_transcript_api via subprocess.
 * YouTube now requires Proof of Origin Tokens that only the Python library handles.
 * Auto-installs the Python dependency on first use if missing.
 * Retries up to 2 times on transient YouTube failures.
 */

import { execFile } from "node:child_process";
import { resolve } from "node:path";

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptLanguageOption {
  code: string;
  label: string;
  is_generated: boolean;
  is_translatable: boolean;
}

export interface TranscriptResult {
  video_id: string;
  language_code: string;
  language_label: string;
  is_generated: boolean;
  available_languages: TranscriptLanguageOption[];
  segments: TranscriptSegment[];
}

const SCRIPT_PATH = resolve(
  process.cwd(),
  "scripts",
  "fetch-transcript.py",
);

let depChecked = false;

function ensurePythonDep(): Promise<void> {
  if (depChecked) return Promise.resolve();

  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      ["-W", "ignore", "-c", "import youtube_transcript_api"],
      { timeout: 5_000 },
      (error) => {
        if (!error) {
          depChecked = true;
          resolve();
          return;
        }
        execFile(
          "pip3",
          ["install", "--user", "youtube-transcript-api"],
          { timeout: 60_000 },
          (installErr, _stdout, installStderr) => {
            if (installErr) {
              reject(
                new Error(
                  `Failed to install youtube-transcript-api. Run manually: pip3 install youtube-transcript-api\n${installStderr}`,
                ),
              );
              return;
            }
            depChecked = true;
            resolve();
          },
        );
      },
    );
  });
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseStderrMessage(stderr: string): string {
  const stderrText = stderr.trim();
  if (!stderrText) return "Failed to fetch transcript.";

  const lines = stderrText.split("\n").filter(Boolean);
  for (const candidate of [stderrText, lines[lines.length - 1] || ""]) {
    try {
      const obj = JSON.parse(candidate) as { error?: string };
      if (obj.error) return obj.error;
    } catch {}
  }

  const lastLine = lines[lines.length - 1] || "";
  if (lastLine.includes("Error") || lastLine.includes("error")) {
    return lastLine;
  }
  return "Failed to fetch transcript.";
}

function runPythonScript(args: string[]): Promise<TranscriptResult> {
  return new Promise((resolve, reject) => {
    execFile("python3", ["-W", "ignore", ...args], { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject(new Error("Transcript fetch timed out (30s)."));
          return;
        }
        reject(new Error(parseStderrMessage(stderr || "")));
        return;
      }

      const out = stdout?.trim();
      if (!out) {
        reject(new Error("Empty response from transcript script."));
        return;
      }

      try {
        resolve(JSON.parse(out) as TranscriptResult);
      } catch {
        reject(new Error("Failed to parse transcript output."));
      }
    });
  });
}

function isRetryable(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("empty response") ||
    lower.includes("no transcript") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower.includes("failed to fetch") ||
    lower.includes("timed out")
  );
}

export async function fetchTranscript(payload: {
  videoId: string;
  languages: string[];
}): Promise<TranscriptResult> {
  await ensurePythonDep();

  const { videoId, languages } = payload;
  const args = [SCRIPT_PATH, videoId];
  if (languages.length > 0) {
    args.push(languages.join(","));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await runPythonScript(args);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES && isRetryable(lastError.message)) {
        console.warn(`[transcript] Attempt ${attempt + 1} failed: ${lastError.message} — retrying in ${RETRY_DELAY_MS}ms`);
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError!;
}
