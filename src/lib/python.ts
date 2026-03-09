import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

interface PythonTranscriptLanguage {
  code: string;
  label: string;
  is_generated: boolean;
  is_translatable: boolean;
}

interface PythonTranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface PythonTranscriptResult {
  video_id: string;
  language_code: string;
  language_label: string;
  is_generated: boolean;
  available_languages: PythonTranscriptLanguage[];
  segments: PythonTranscriptSegment[];
}

export async function fetchTranscriptWithPython(payload: {
  videoId: string;
  languages: string[];
}): Promise<PythonTranscriptResult> {
  const runtimeConfig = await readRuntimeConfig();
  const pythonCommand = resolvePythonCommand(runtimeConfig);
  const scriptPath = path.join(process.cwd(), "scripts", "fetch_transcript.py");
  const env = buildPythonEnv(runtimeConfig);

  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand, [scriptPath], {
      cwd: process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to start the local transcript worker. Run npm run setup first. ${error.message}`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const details = stderr.trim() || stdout.trim() || "Unknown Python error.";
        reject(
          new Error(
            `The local transcript worker failed. Run npm run setup first if Python dependencies are missing. ${details}`,
          ),
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout) as PythonTranscriptResult);
      } catch (error) {
        reject(
          new Error(
            `The local transcript worker returned invalid JSON. ${(error as Error).message}`,
          ),
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function resolvePythonCommand(runtimeConfig: PythonRuntimeConfig | null): string {
  return (
    runtimeConfig?.pythonCommand ??
    (process.platform === "win32" ? "python" : "python3")
  );
}

function buildPythonEnv(runtimeConfig: PythonRuntimeConfig | null) {
  const pythonPathEntries = runtimeConfig?.pythonPathEntries ?? [];

  if (pythonPathEntries.length === 0) {
    return process.env;
  }

  const pythonPath = process.env.PYTHONPATH
    ? `${pythonPathEntries.join(path.delimiter)}${path.delimiter}${process.env.PYTHONPATH}`
    : pythonPathEntries.join(path.delimiter);

  return {
    ...process.env,
    PYTHONPATH: pythonPath,
  };
}

interface PythonRuntimeConfig {
  pythonCommand?: string;
  pythonPathEntries?: string[];
}

async function readRuntimeConfig(): Promise<PythonRuntimeConfig | null> {
  const configPath = path.join(process.cwd(), ".python-runtime.json");

  try {
    const raw = await readFile(configPath, "utf8");
    return JSON.parse(raw) as PythonRuntimeConfig;
  } catch {
    return null;
  }
}
