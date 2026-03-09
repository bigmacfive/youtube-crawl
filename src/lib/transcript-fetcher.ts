/**
 * Transcript fetcher — calls Python youtube_transcript_api via subprocess.
 * YouTube now requires Proof of Origin Tokens that only the Python library handles.
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

export function fetchTranscript(payload: {
  videoId: string;
  languages: string[];
}): Promise<TranscriptResult> {
  const { videoId, languages } = payload;
  const args = [SCRIPT_PATH, videoId];

  if (languages.length > 0) {
    args.push(languages.join(","));
  }

  return new Promise((resolve, reject) => {
    execFile("python3", args, { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        // Try to extract a meaningful message from stderr
        const stderrText = stderr?.trim() || "";
        let message = "Failed to fetch transcript.";

        if (stderrText) {
          // Try to parse JSON error from stderr
          try {
            const parsed = JSON.parse(stderrText) as { error?: string };
            if (parsed.error) {
              message = parsed.error;
            }
          } catch {
            // Use last line of stderr as message (skip warnings)
            const lines = stderrText.split("\n").filter(Boolean);
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
