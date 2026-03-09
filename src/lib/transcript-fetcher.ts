/**
 * Transcript fetcher — calls Python youtube_transcript_api via subprocess.
 * YouTube now requires Proof of Origin Tokens that only the Python library handles.
 * Auto-installs the Python dependency on first use if missing.
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
      ["-c", "import youtube_transcript_api"],
      { timeout: 5_000 },
      (error) => {
        if (!error) {
          depChecked = true;
          resolve();
          return;
        }
        // Auto-install
        execFile(
          "pip3",
          ["install", "--user", "youtube-transcript-api"],
          { timeout: 60_000 },
          (installErr, _stdout, installStderr) => {
            if (installErr) {
              reject(
                new Error(
                  `youtube-transcript-api 설치 실패. 수동 설치: pip3 install youtube-transcript-api\n${installStderr}`,
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

  return new Promise((resolve, reject) => {
    execFile("python3", args, { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        const stderrText = stderr?.trim() || "";
        let message = "Failed to fetch transcript.";

        if (stderrText) {
          // Try parsing the whole stderr or its last line as JSON
          const lines = stderrText.split("\n").filter(Boolean);
          let parsed = false;
          for (const candidate of [stderrText, lines[lines.length - 1] || ""]) {
            try {
              const obj = JSON.parse(candidate) as { error?: string };
              if (obj.error) {
                message = obj.error;
                parsed = true;
                break;
              }
            } catch {}
          }
          if (!parsed) {
            const lastLine = lines[lines.length - 1] || "";
            if (lastLine.includes("Error") || lastLine.includes("error")) {
              message = lastLine;
            }
          }
        }

        if (error.killed) {
          message = "Transcript fetch timed out (30s).";
        }

        reject(new Error(message));
        return;
      }

      try {
        const result = JSON.parse(stdout) as TranscriptResult;
        resolve(result);
      } catch {
        reject(new Error("Failed to parse transcript output."));
      }
    });
  });
}
