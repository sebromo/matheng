import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { prepareStandalone, startStandalone } from "./standalone.mjs";

const root = process.cwd();
const serverPath = resolve(root, ".next/standalone/server.js");

if (!existsSync(serverPath) || process.env.CI !== "true") {
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
}

await prepareStandalone(root);
startStandalone({
  root,
  hostname: "127.0.0.1",
  port: process.env.PORT ?? "3001",
});

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const processHandle = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    processHandle.on("error", rejectRun);
    processHandle.on("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });
}
