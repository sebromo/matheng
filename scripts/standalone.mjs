import { spawn } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export async function prepareStandalone(root = process.cwd()) {
  const serverPath = resolve(root, ".next/standalone/server.js");
  if (!existsSync(serverPath)) {
    throw new Error("Standalone output is missing; run npm run build first");
  }

  const standaloneNext = resolve(root, ".next/standalone/.next");
  await mkdir(resolve(standaloneNext, "static"), { recursive: true });
  await cp(resolve(root, ".next/static"), resolve(standaloneNext, "static"), {
    recursive: true,
    force: true,
  });

  if (existsSync(resolve(root, "public"))) {
    await cp(
      resolve(root, "public"),
      resolve(root, ".next/standalone/public"),
      {
        recursive: true,
        force: true,
      },
    );
  }
}

export function startStandalone({
  root = process.cwd(),
  hostname = "0.0.0.0",
  port = "3000",
} = {}) {
  const serverPath = resolve(root, ".next/standalone/server.js");
  const server = spawn(process.execPath, [serverPath], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, HOSTNAME: hostname, PORT: port },
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.kill(signal));
  }

  server.on("exit", (code, signal) => {
    process.exitCode = signal ? 1 : (code ?? 1);
  });

  return server;
}
