import { spawnSync } from "node:child_process";
import process from "node:process";

const repoName = "NisanProClean";
const cwd = process.cwd();

if (!cwd.toLowerCase().endsWith(`\\${repoName.toLowerCase()}`) && !cwd.toLowerCase().endsWith(`/${repoName.toLowerCase()}`)) {
  console.error(`Release gate blocked: wrong workspace (${cwd}). Expected .../${repoName}`);
  process.exit(1);
}

const run = (label, command, args) => {
  console.log(`\n[release-gate] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`[release-gate] failed at "${label}"`);
    process.exit(result.status ?? 1);
  }
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const gitCommand = process.platform === "win32" ? "git.exe" : "git";

console.log("\n[release-gate] workspace status check");
const gitStatus = spawnSync(gitCommand, ["status", "--short"], {
  encoding: "utf8",
  shell: false,
  env: process.env,
});
if (gitStatus.status !== 0) {
  console.error("[release-gate] git status failed");
  process.exit(gitStatus.status ?? 1);
}
const statusOutput = (gitStatus.stdout || "").trim();
if (statusOutput) {
  console.error("[release-gate] blocked: working tree is not clean");
  console.error(statusOutput);
  process.exit(1);
}
console.log("[release-gate] workspace clean");

run("lint", npmCommand, ["run", "-s", "lint"]);
run("e2e smoke", npmCommand, ["run", "-s", "test:e2e"]);

console.log("\n[release-gate] AutoQA execute is required after this script.");
console.log("[release-gate] Example (Codex AutoQA tool): autoqa_execute_run_plan with tests/smoke.spec.ts");
