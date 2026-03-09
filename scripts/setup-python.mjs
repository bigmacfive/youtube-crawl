import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const python = process.env.PYTHON || "python3";
const requirementsPath = path.join(root, "requirements.txt");
const venvPath = path.join(root, ".venv");
const pipPath =
  process.platform === "win32"
    ? path.join(venvPath, "Scripts", "pip.exe")
    : path.join(venvPath, "bin", "pip");

run(python, ["-m", "venv", ".venv"]);
run(pipPath, ["install", "-r", requirementsPath]);
writeRuntimeConfig();

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function writeRuntimeConfig() {
  const pythonPathEntries =
    process.platform === "win32"
      ? [path.join(venvPath, "Lib", "site-packages")]
      : fs
          .readdirSync(path.join(venvPath, "lib"))
          .map((version) => path.join(venvPath, "lib", version, "site-packages"))
          .filter((candidate) => fs.existsSync(candidate));

  const payload = {
    pythonCommand: process.platform === "win32" ? "python" : "python3",
    pythonPathEntries,
  };

  fs.writeFileSync(
    path.join(root, ".python-runtime.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}
