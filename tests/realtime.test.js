import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn) => {
  for (let i = 0; i < 600; i++) {
    if (fn()) return;
    await delay(10);
  }
  throw Error("等待客户端同步超时");
};
test(
  "6 个独立 Socket 客户端：入座、鉴定隐私、三轮投票、身份指认、越权拒绝与重连",
  { timeout: 30000 },
  async () => {
    const dataDir = path.resolve(".work", "integration-" + randomUUID());
    fs.mkdirSync(dataDir, { recursive: true });
    const child = spawn(process.execPath, ["server.js", "--production"], {
      env: { ...process.env, PORT: "5189", DATA_DIR: dataDir },
      stdio: "pipe",
    });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    const clients = [];
    try {
      await until(() => output.includes("鉴宝局已开席"));
      for (let i = 0; i < 6; i++) {
        const c = { id: randomUUID(), token: randomUUID(), name: "测试" + i };
        c.socket = io("http://localhost:5189", {
          auth: { token: c.token },
          transports: ["websocket"],
          reconnection: false,
        });
        c.socket.on("state", (r) => (c.state = r));
        c.socket.on("private", (p) => (c.private = p));
        c.socket.on("errorMessage", (m) => (c.error = m));
        clients.push(c);
        await until(() => c.socket.connected);
      }
      const host = clients[0];
      host.socket.emit("create", { id: host.id, name: host.name, count: 6 });
      await until(() => host.state?.phase === "lobby");
      const code = host.state.code;
      for (const c of clients.slice(1)) {
        c.socket.emit("join", { id: c.id, name: c.name, code });
        await until(() => c.state?.code === code);
      }
      for (const c of clients) c.socket.emit("ready");
      await until(() => host.state.players.every((p) => p.ready));
      host.socket.emit("start");
      await until(() =>
        clients.every((c) => c.state.phase === "inspect" && c.private.role),
      );
      const attacker = io("http://localhost:5189", {
        auth: { token: randomUUID() },
        transports: ["websocket"],
        reconnection: false,
      });
      let error;
      attacker.on("errorMessage", (m) => (error = m));
      await until(() => attacker.connected);
      attacker.emit("join", { code, id: host.id, name: "冒名" });
      await until(() => error);
      assert.match(error, /会话不匹配/);
      attacker.disconnect();
      const reconnect = clients[1];
      reconnect.socket.disconnect();
      await until(
        () =>
          host.state.players.find((p) => p.id === reconnect.id).online ===
          false,
      );
      reconnect.socket.connect();
      await until(() => reconnect.socket.connected);
      reconnect.socket.emit("resume", { code, id: reconnect.id });
      await until(
        () =>
          host.state.players.find((p) => p.id === reconnect.id).online &&
          reconnect.private.role,
      );
      assert.ok(reconnect.private.role);
      let actions = 0;
      while (host.state.phase !== "finished") {
        assert.ok(actions++ < 200, "流程不能无限循环");
        const r = host.state;
        if (r.phase === "inspect") {
          const c = clients.find((c) => c.id === r.turn);
          if (r.step === "inspect") {
            const old = c.private.history.length;
            c.socket.emit("inspect", {
              artifacts: c.private.canInspect
                ? r.artifacts.slice(0, c.private.role === "许愿" ? 2 : 1)
                : [],
            });
            await until(
              () =>
                host.state.phase !== "inspect" || host.state.step !== "inspect",
            );
            if (c.private.canInspect)
              await until(() => c.private.history.length > old);
            for (const other of clients.filter((x) => x !== c))
              assert.ok(!JSON.stringify(other.state).includes("history"));
          } else if (r.step === "skill") {
            c.socket.emit("skill", { skip: true });
            await until(
              () =>
                host.state.phase !== "inspect" || host.state.step !== "skill",
            );
          } else {
            const target = r.players.find(
              (p) => p.id !== c.id && !r.acted.includes(p.id),
            ).id;
            c.socket.emit("next", { target });
            await until(
              () => host.state.turn !== c.id || host.state.phase !== "inspect",
            );
          }
        } else if (r.phase === "discussion") {
          const speaker = r.speaker;
          clients.find((c) => c.id === speaker).socket.emit("speech");
          await until(
            () =>
              host.state.speaker !== speaker ||
              host.state.phase !== "discussion",
          );
        } else if (r.phase === "vote") {
          for (const c of clients)
            c.socket.emit("vote", { votes: [1, 0, 0, 0] });
          await until(() => host.state.phase === "result");
          assert.equal(host.state.result[0].truth, null);
        } else if (r.phase === "result") {
          for (const c of clients) c.socket.emit("continue");
          await until(() => host.state.phase !== "result");
        } else if (r.phase === "guess") {
          for (const c of clients.filter((c) => c.private.role !== "郑国渠"))
            c.socket.emit("guess", {
              target: clients.find((x) => x.id !== c.id).id,
            });
          await until(() => host.state.phase === "finished");
        } else throw Error("未知阶段 " + r.phase);
      }
      assert.equal(host.state.round, 3);
      assert.equal(host.state.revealed.length, 6);
      assert.ok(host.state.winner);
      await until(() => {
        try {
          return (
            JSON.parse(
              fs.readFileSync(path.join(dataDir, "rooms.json"), "utf8"),
            )[0][1].phase === "finished"
          );
        } catch {
          return false;
        }
      });
    } finally {
      clients.forEach((c) => c.socket.disconnect());
      child.kill();
    }
  },
);
