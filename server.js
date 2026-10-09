import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createHash, randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import * as game from "./game.js";
const base = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, { maxHttpBufferSize: 12000 });
const dataDir = process.env.DATA_DIR || path.join(base, ".data");
fs.mkdirSync(dataDir, { recursive: true });
const store = path.join(dataDir, "rooms.json");
let rooms = new Map();
try {
  rooms = new Map(
    JSON.parse(fs.readFileSync(store, "utf8")).filter(
      ([, r]) => Date.now() - r.createdAt < 7 * 86400000,
    ),
  );
  for (const r of rooms.values())
    r.players.forEach((p) => {
      p.online = false;
      p.socketId = null;
    });
} catch {}
const lan =
  Object.values(networkInterfaces())
    .flat()
    .find((x) => x.family === "IPv4" && !x.internal)?.address || "localhost";
const inviteBase =
  process.env.PUBLIC_URL || `http://${lan}:${process.env.PORT || 5173}`;
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(store + ".tmp", JSON.stringify([...rooms]));
    fs.renameSync(store + ".tmp", store);
  }, 100);
}
function emit(r) {
  for (const p of r.players) {
    if (!p.socketId) continue;
    io.to(p.socketId).emit("state", { ...game.publicState(r), inviteBase });
    io.to(p.socketId).emit("private", game.privateState(r, p));
  }
  save();
}
function attach(s, r, p) {
  if (p.socketId && p.socketId !== s.id)
    io.sockets.sockets.get(p.socketId)?.disconnect(true);
  p.socketId = s.id;
  p.online = true;
  s.data.code = r.code;
  s.data.player = p.id;
  s.join(r.code);
  emit(r);
}
const hash = (x) => createHash("sha256").update(x).digest("hex");
io.use((s, next) => {
  const t = s.handshake.auth?.token;
  if (typeof t !== "string" || t.length < 20 || t.length > 200)
    return next(Error("无效会话"));
  s.data.auth = hash(t);
  next();
});
io.on("connection", (s) => {
  let calls = [];
  function on(event, fn) {
    s.on(event, (data = {}) => {
      try {
        calls = calls.filter((t) => Date.now() - t < 5000);
        if (calls.length > 40) throw Error("操作过于频繁，请稍后");
        calls.push(Date.now());
        fn(data);
      } catch (e) {
        s.emit("errorMessage", e.message);
      }
    });
  }
  function ctx() {
    const r = rooms.get(s.data.code);
    const p = r?.players.find(
      (x) => x.id === s.data.player && x.auth === s.data.auth,
    );
    if (!p || p.socketId !== s.id) throw Error("请先加入房间");
    return [r, p];
  }
  const validateName = (n) => {
    if (typeof n !== "string" || !n.trim() || n.length > 12)
      throw Error("雅号需为 1–12 个字");
    return n.trim();
  };
  function player(d, color) {
    if (typeof d.id !== "string" || d.id.length > 100)
      throw Error("无效身份标识");
    return {
      id: d.id,
      name: validateName(d.name),
      color,
      ready: false,
      online: true,
      auth: s.data.auth,
    };
  }
  function ensureFree() {
    for (const r of rooms.values()) {
      const p = r.players.find((x) => x.auth === s.data.auth);
      if (p && r.phase !== "finished")
        throw Error("你已在房间 " + r.code + "，请先回席或离开");
    }
  }
  on("create", (d) => {
    ensureFree();
    if (rooms.size >= 500) throw Error("房间已满，请稍后");
    let code;
    do {
      code = String(randomInt(100000, 1000000));
    } while (rooms.has(code));
    const p = player(d, 0),
      r = game.createRoom(code, d.count, p, !!d.discussion);
    rooms.set(code, r);
    attach(s, r, p);
  });
  on("join", (d) => {
    const r = rooms.get(String(d.code));
    if (!r) throw Error("未找到此房间，请核对房间号");
    const existing = r.players.find((p) => p.id === d.id);
    if (existing) {
      if (existing.auth !== s.data.auth) throw Error("会话不匹配");
      return attach(s, r, existing);
    }
    ensureFree();
    if (r.phase !== "lobby") throw Error("对局已开始，无法中途加入");
    if (r.players.length >= r.count) throw Error("此局已满员");
    const color = Array.from({ length: r.count }, (_, i) => i).find(
      (i) => !r.players.some((p) => p.color === i),
    );
    const p = player(d, color);
    r.players.push(p);
    r.logs.push(p.name + " 已入席。");
    attach(s, r, p);
  });
  on("resume", (d) => {
    const r = rooms.get(String(d.code));
    const p = r?.players.find((p) => p.id === d.id && p.auth === s.data.auth);
    if (!p) return s.emit("roomExpired");
    attach(s, r, p);
  });
  on("ready", () => {
    const [r, p] = ctx();
    if (r.phase !== "lobby") throw Error("对局已经开始");
    p.ready = !p.ready;
    emit(r);
  });
  on("color", (d) => {
    const [r, p] = ctx();
    if (
      r.phase !== "lobby" ||
      !Number.isInteger(d.color) ||
      d.color < 0 ||
      d.color >= r.count
    )
      throw Error("无法选择此颜色");
    if (r.players.some((q) => q.id !== p.id && q.color === d.color))
      throw Error("此颜色已有同道入座");
    p.color = d.color;
    emit(r);
  });
  on("start", () => {
    const [r, p] = ctx();
    if (r.host !== p.id) throw Error("请由房主开始");
    if (r.players.some((x) => !x.online)) throw Error("请等待全员在线");
    game.start(r);
    emit(r);
  });
  for (const [event, fn] of Object.entries({
    inspect: (r, p, d) => game.inspect(r, p, d.artifacts),
    skill: game.skill,
    next: (r, p, d) => game.next(r, p, d.target),
    speech: game.speech,
    vote: (r, p, d) => game.vote(r, p, d.votes),
    continue: game.continueGame,
    guess: (r, p, d) => game.guess(r, p, d.target),
  }))
    on(event, (d) => {
      const [r, p] = ctx();
      fn(r, p, d);
      emit(r);
    });
  on("leave", () => {
    const [r, p] = ctx();
    if (r.phase === "lobby" || r.phase === "finished") {
      r.players = r.players.filter((x) => x.id !== p.id);
      if (!r.players.length) rooms.delete(r.code);
      else {
        if (r.host === p.id) r.host = r.players[0].id;
        emit(r);
      }
    } else {
      p.online = false;
      p.socketId = null;
      emit(r);
    }
    s.leave(r.code);
    s.data.code = null;
    s.data.player = null;
    s.emit("left");
    save();
  });
  s.on("disconnect", () => {
    const r = rooms.get(s.data.code);
    const p = r?.players.find((x) => x.id === s.data.player);
    if (p?.socketId === s.id) {
      p.online = false;
      p.socketId = null;
      emit(r);
    }
  });
});
setInterval(() => {
  for (const r of rooms.values())
    if (r.phase === "openDiscussion" && Date.now() >= r.discussionEnds) {
      game.beginVote(r);
      emit(r);
    }
}, 1000).unref();
app.get("/teaching.mp4", (_, res) =>
  res.sendFile(path.join(base, "【桌遊雙-古董局中局-全規則教學影片】.mp4")),
);
app.get("/health", (_, res) => res.json({ ok: true }));
if (process.argv.includes("--production")) {
  app.use(express.static(path.join(base, "dist")));
  app.get("/{*path}", (_, res) =>
    res.sendFile(path.join(base, "dist/index.html")),
  );
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
server.listen(Number(process.env.PORT) || 5173, "0.0.0.0", () =>
  console.log("鉴宝局已开席 http://localhost:" + (process.env.PORT || 5173)),
);
