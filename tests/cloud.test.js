import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createHandler } from "../lib/cloud-game.js";
import { createCloudTransport } from "../src/cloud-transport.js";
const clone = (x) => (x == null ? null : structuredClone(x));
function memoryStore() {
  const entries = new Map();
  let version = 0;
  return {
    entries,
    async get(key) {
      return clone(entries.get(key)?.data);
    },
    async getWithMetadata(key) {
      return clone(entries.get(key));
    },
    async setJSON(key, data, options = {}) {
      await new Promise((r) => setTimeout(r, 1));
      const current = entries.get(key);
      if (
        (options.onlyIfNew && current) ||
        (options.onlyIfMatch && options.onlyIfMatch !== current?.etag)
      )
        return { modified: false };
      const etag = String(++version);
      entries.set(key, { data: clone(data), etag });
      return { modified: true, etag };
    },
  };
}
const user = () => ({
  id: randomUUID(),
  token: randomUUID(),
  name: "测试同道",
});
function api(store) {
  return async (u, event, data = {}, requestId = randomUUID()) => {
    const response = await createHandler(store)(
      new Request("https://gudongapp.netlify.app/api/game", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + u.token,
        },
        body: JSON.stringify({
          event,
          id: u.id,
          name: u.name,
          requestId,
          ...data,
        }),
      }),
    );
    const result = await response.json();
    return { status: response.status, ...result };
  };
}
test(
  "Netlify 冷启动持久化、并发入座/准备/投票与完整三轮结算",
  { timeout: 20000 },
  async () => {
    const store = memoryStore(),
      send = api(store),
      users = Array.from({ length: 6 }, user);
    let r = await send(users[0], "create", { count: 6 });
    assert.equal(r.status, 200);
    const code = r.state.code;
    const joins = await Promise.all(
      users.slice(1).map((u) => send(u, "join", { code })),
    );
    assert.ok(joins.every((x) => x.status === 200));
    r = await send(users[0], "state", { code });
    assert.equal(r.state.players.length, 6);
    assert.equal(new Set(r.state.players.map((p) => p.color)).size, 6);
    assert.equal(
      (await send({ ...user(), id: users[0].id }, "resume", { code })).status,
      403,
    );
    const ready = await Promise.all(
      users.map((u) => send(u, "ready", { code })),
    );
    assert.ok(ready.every((x) => x.status === 200));
    r = await send(users[0], "start", { code });
    assert.equal(r.state.phase, "inspect");
    let steps = 0;
    while (r.state.phase !== "finished") {
      assert.ok(steps++ < 150);
      const state = r.state;
      if (state.phase === "inspect") {
        const u = users.find((u) => u.id === state.turn);
        const own = await send(u, "state", { code });
        if (state.step === "inspect" && own.private.role === "方震")
          r = await send(u, "checkCamp", {
            code,
            target: users.find((x) => x.id !== u.id).id,
          });
        else if (state.step === "inspect")
          r = await send(u, "inspect", {
            code,
            artifacts: own.private.canInspect
              ? state.artifacts.slice(0, own.private.role === "许愿" ? 2 : 1)
              : [],
          });
        else if (state.step === "skill")
          r = await send(u, "skill", { code, skip: true });
        else
          r = await send(u, "next", {
            code,
            target: state.players.find(
              (p) => p.id !== u.id && !state.acted.includes(p.id),
            ).id,
          });
      } else if (state.phase === "discussion")
        r = await send(
          users.find((u) => u.id === state.speaker),
          "speech",
          { code },
        );
      else if (state.phase === "vote") {
        const votes = await Promise.all(
          users.map((u) => send(u, "vote", { code, votes: [1, 0, 0, 0] })),
        );
        assert.ok(votes.every((x) => x.status === 200));
        r = await send(users[0], "state", { code });
        assert.equal(r.state.phase, "result");
        assert.equal(r.state.result[0].truth, null);
        assert.equal(r.state.result.filter((p) => p.truth !== null).length, 1);
      } else if (state.phase === "result") {
        const acks = await Promise.all(
          users.map((u) => send(u, "continue", { code })),
        );
        assert.ok(acks.every((x) => x.status === 200));
        r = await send(users[0], "state", { code });
      } else if (state.phase === "guess") {
        const guesses = await Promise.all(
          users.map((u) =>
            send(u, "guess", {
              code,
              target: users.find((x) => x.id !== u.id).id,
            }),
          ),
        );
        assert.ok(guesses.every((x) => x.status === 200));
        r = await send(users[0], "state", { code });
      } else assert.fail("未知阶段 " + state.phase);
      assert.equal(r.status, 200);
    }
    assert.equal(r.state.round, 3);
    assert.equal(r.state.revealed.length, 6);
    assert.ok(r.state.winner);
    assert.equal(r.state.inviteBase, "https://gudongapp.netlify.app");
  },
);
test("Netlify 重试幂等、角色隐私和并发建局会话独占", async () => {
  const store = memoryStore(),
    send = api(store),
    u = user(),
    requestId = randomUUID();
  const creates = await Promise.all([
    send(u, "create", { count: 6 }, requestId),
    send(u, "create", { count: 6 }, requestId),
  ]);
  assert.ok(creates.every((x) => x.status === 200));
  assert.equal(creates[0].state.code, creates[1].state.code);
  const code = creates[0].state.code;
  const toggle = randomUUID();
  await send(u, "ready", { code }, toggle);
  await send(u, "ready", { code }, toggle);
  let r = await send(u, "state", { code });
  assert.equal(r.state.players[0].ready, true);
  assert.equal(r.state.truth, undefined);
  assert.equal(r.state.players[0].auth, undefined);
  assert.equal((await send(u, "create", { count: 6 })).status, 400);
  await send(u, "leave", { code });
  assert.equal((await send(u, "resume", { code })).status, 404);
});
test("Netlify 旧房间未结束的公开讨论直接转投票；超额票与越权被拒绝", async () => {
  const store = memoryStore(),
    send = api(store),
    u = user(),
    created = await send(u, "create", { count: 6 });
  const code = created.state.code;
  const row = store.entries.get("rooms/" + code);
  row.data.phase = "openDiscussion";
  row.data.discussionEnds = Date.now() + 5 * 60 * 1000;
  row.data.votes = {};
  row.data.players[0].tokens = 2;
  const r = await send(u, "state", { code });
  assert.equal(r.state.phase, "vote");
  assert.equal(
    (await send(u, "vote", { code, votes: [3, 0, 0, 0] })).status,
    400,
  );
  assert.equal((await send(user(), "start", { code })).status, 403);
});
test("房主解散进行中的房间：全员退出、无法回席、可重新开局", async () => {
  const store = memoryStore(),
    send = api(store),
    users = Array.from({ length: 6 }, user);
  const created = await send(users[0], "create", { count: 6 });
  const code = created.state.code;
  for (const u of users.slice(1)) await send(u, "join", { code });
  for (const u of users) await send(u, "ready", { code });
  await send(users[0], "start", { code });
  assert.equal((await send(users[1], "dissolve", { code })).status, 403);
  assert.equal(
    (await send(users[0], "state", { code })).state.phase,
    "inspect",
  );
  const requestId = randomUUID();
  assert.equal(
    (await send(users[0], "dissolve", { code }, requestId)).dissolved,
    true,
  );
  assert.equal(
    (await send(users[0], "dissolve", { code }, requestId)).dissolved,
    true,
  );
  for (const u of users) {
    assert.equal((await send(u, "state", { code })).dissolved, true);
    assert.equal((await send(u, "resume", { code })).dissolved, true);
    assert.equal(
      (await send(u, "vote", { code, votes: [0, 0, 0, 0] })).dissolved,
      true,
    );
    assert.equal((await send(u, "create", { count: 6 })).status, 200);
  }
  assert.equal((await send(user(), "join", { code })).status, 404);
});

test("云端传输：状态轮询、重连回席与事件处理兼容客户端", async () => {
  const store = memoryStore(),
    u = user(),
    handler = createHandler(store);
  const fetcher = (url, options = {}) =>
    handler(new Request("https://gudongapp.netlify.app/api/game", options));
  const transport = createCloudTransport({ fetcher, pollMs: 10 });
  transport.auth = { token: u.token };
  let state,
    secret,
    connected = false;
  transport.on("connect", () => (connected = true));
  transport.on("state", (r) => (state = r));
  transport.on("private", (p) => (secret = p));
  transport.connect();
  const wait = async (fn) => {
    for (let i = 0; i < 150; i++) {
      if (fn()) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw Error("同步超时");
  };
  try {
    await wait(() => connected);
    transport.emit("create", { id: u.id, name: u.name, count: 6 });
    await wait(() => state?.code);
    assert.ok(state._enter);
    assert.ok(secret);
    transport.emit("ready", { id: u.id, code: state.code });
    await wait(() => state.players[0].ready);
    let dissolved = false;
    transport.on("roomDissolved", () => (dissolved = true));
    await api(store)(u, "dissolve", { code: state.code });
    await wait(() => dissolved);
    const resumed = createCloudTransport({ fetcher, pollMs: 10 });
    resumed.auth = { token: u.token };
    let resumedDissolved = false;
    resumed.on("roomDissolved", () => (resumedDissolved = true));
    try {
      resumed.emit("resume", { id: u.id, code: state.code });
      await wait(() => resumedDissolved);
    } finally {
      resumed.disconnect();
    }
  } finally {
    transport.disconnect();
  }
});
