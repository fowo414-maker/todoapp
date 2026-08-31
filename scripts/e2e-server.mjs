// E2E 전용 서버: 인메모리 MongoDB 를 띄우고 그 URI 로 `next start` 를 실행한다.
// 외부 DB 없이 Playwright 테스트를 완전히 독립적으로 돌리기 위한 래퍼.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const port = process.env.PORT ?? "3100";

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri("todoapp");
console.log(`[e2e] in-memory MongoDB ready`);

const child = spawn(process.execPath, [nextBin, "start", "--port", String(port)], {
  stdio: "inherit",
  env: { ...process.env, MONGODB_URI: uri },
});

let shuttingDown = false;
async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!child.killed) child.kill();
  await mongod.stop().catch(() => {});
  process.exit(code);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
child.on("exit", (code) => shutdown(code ?? 0));
