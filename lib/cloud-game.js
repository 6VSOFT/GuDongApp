import { createHash, randomInt } from "node:crypto";
import * as game from "../game.js";
import { isInactive, closeInactive } from "./room-lifecycle.js";
import { removeLogin } from "./room-membership.js";
import { requireVoteConfirmation } from "./vote-confirmation.js";
const assert = (ok, message, status = 400) => {
  if (!ok) {
    const e = Error(message);
    e.status = status;
    throw e;
  }
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
    },
  });
const isAlive = (r) => r && r.phase !== "closed" && !isInactive(r);
const operations = {
  inspect: (r, p, d) => game.inspect(r, p, d.artifacts),
  skill: game.skill,
  checkCamp: game.checkCamp,
  next: (r, p, d) => game.next(r, p, d.target),
  speech: game.speech,
  vote: (r, p, d) => {
    requireVoteConfirmation(d);
    game.vote(r, p, d.votes);
  },
  continue: game.continueGame,
  guess: (r, p, d) => game.guess(r, p, d.target),
};
export function createHandler(store) {
  async function leavePrevious(code, auth) {
    if (!code) return;
    for (let attempt = 0; attempt < 12; attempt++) {
      const row = await store.getWithMetadata("rooms/" + code, {
        type: "json",
      });
      if (!row || row.data.phase === "closed" || !removeLogin(row.data, auth))
        return;
      row.data.version = (row.data.version || 0) + 1;
      if (
        (
          await store.setJSON("rooms/" + code, row.data, {
            onlyIfMatch: row.etag,
          })
        ).modified
      )
        return;
    }
    assert(false, "旧房间正在同步，请重试", 409);
  }
  async function read(code, includeDissolved = false) {
    const row = await store.getWithMetadata("rooms/" + code, { type: "json" });
    assert(
      isAlive(row?.data) ||
        (includeDissolved && (row?.data?.dissolved || isInactive(row?.data))),
      "此房间已结束或过期",
      404,
    );
    return row;
  }
  async function free(auth, code, requestId) {
    const session = await store.get("sessions/" + auth, { type: "json" });
    if (!session) return;
    const existing = await store.get("rooms/" + session.code, { type: "json" });
    if (
      isAlive(existing) &&
      existing.phase !== "finished" &&
      existing.players.some((p) => p.auth === auth)
    )
      assert(
        session.code === code || session.requestId === requestId,
        "你已在房间 " + session.code + "，请先回席或离开",
      );
    return session;
  }
  function present(r, p, origin) {
    const visible = structuredClone(r);
    visible.players.forEach(
      (q) => (q.online = q.online && Date.now() - (q.lastSeen || 0) < 45000),
    );
    return {
      state: {
        ...game.publicState(visible),
        version: r.version,
        inviteBase: origin,
      },
      private: game.privateState(r, p),
    };
  }
  async function update(code, auth, id, requestId, event, data, origin) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const row = await read(code, true),
        r = row.data;
      if (isInactive(r)) {
        closeInactive(r);
        const expired = await store.setJSON("rooms/" + code, r, {
          onlyIfMatch: row.etag,
        });
        if (!expired.modified) continue;
      }
      if (r.dissolved) {
        assert(
          r.players.some((p) => p.id === id && p.auth === auth),
          "此房间已解散",
          404,
        );
        return { dissolved: true, reason: r.dissolveReason };
      }
      let p = r.players.find((p) => p.id === id);
      if (event === "join" && !p) {
        assert(r.phase === "lobby", "对局已开始，无法中途加入");
        assert(r.players.length < r.count, "此局已满员");
        assert(!r.players.some((p) => p.auth === auth), "此设备已经入座");
        p = makePlayer(
          data,
          auth,
          Array.from({ length: r.count }, (_, i) => i).find(
            (i) => !r.players.some((p) => p.color === i),
          ),
        );
        r.players.push(p);
        r.logs.push(p.name + " 已入席。");
      }
      assert(p && p.auth === auth, "会话不匹配，请使用原设备入局", 403);
      if (r.requests?.some((x) => x.id === requestId && x.auth === auth))
        return present(r, p, origin);
      let dirty = event !== "state";
      if (r.phase === "openDiscussion") {
        game.beginVote(r);
        dirty = true;
      }
      if (event === "state" || event === "resume" || event === "join") {
        if (!p.online || Date.now() - (p.lastSeen || 0) > 15000) {
          p.lastSeen = Date.now();
          p.online = true;
          dirty = true;
        }
      } else if (event === "ready") {
        assert(r.phase === "lobby", "对局已经开始");
        p.ready = !p.ready;
      } else if (event === "color") {
        assert(
          r.phase === "lobby" &&
            Number.isInteger(data.color) &&
            data.color >= 0 &&
            data.color < r.count,
          "无法选择此颜色",
        );
        assert(
          !r.players.some((q) => q.id !== p.id && q.color === data.color),
          "此颜色已有同道入座",
        );
        p.color = data.color;
      } else if (event === "start") {
        assert(r.host === p.id, "请由房主开始");
        assert(
          r.players.every(
            (q) => q.online && Date.now() - (q.lastSeen || 0) < 45000,
          ),
          "请等待全员在线",
        );
        try {
          game.start(r);
        } catch (e) {
          e.status = 400;
          throw e;
        }
      } else if (event === "dissolve") {
        assert(r.host === p.id, "只有房主可以解散房间", 403);
        r.phase = "closed";
        r.dissolved = true;
      } else if (event === "leave") {
        if (["lobby", "finished"].includes(r.phase)) {
          r.players = r.players.filter((q) => q.id !== p.id);
          if (!r.players.length) r.phase = "closed";
          else if (r.host === p.id) r.host = r.players[0].id;
        } else {
          p.online = false;
          p.lastSeen = 0;
        }
      } else {
        assert(operations[event], "未知操作");
        try {
          operations[event](r, p, data);
        } catch (e) {
          e.status = 400;
          throw e;
        }
      }
      if (!dirty) return present(r, p, origin);
      if (!["state", "resume"].includes(event)) r.lastActionAt = Date.now();
      if (event !== "leave") {
        p.lastSeen = Date.now();
        p.online = true;
      }
      r.version = (r.version || 0) + 1;
      r.requests = [...(r.requests || []), { id: requestId, auth }].slice(-128);
      const result = await store.setJSON("rooms/" + code, r, {
        onlyIfMatch: row.etag,
      });
      if (result.modified)
        return event === "dissolve"
          ? { dissolved: true }
          : event === "leave"
            ? { left: true }
            : present(r, p, origin);
      await pause(randomInt(10, 50) * (attempt + 1));
    }
    const e = Error("同道正在同步，请稍后重试");
    e.status = 409;
    throw e;
  }
  function makePlayer(d, auth, color) {
    assert(
      typeof d.name === "string" &&
        d.name.trim().length > 0 &&
        d.name.length <= 12,
      "雅号需为 1–12 个字",
    );
    return {
      id: d.id,
      name: d.name.trim(),
      color,
      ready: false,
      online: true,
      auth,
      lastSeen: Date.now(),
    };
  }
  return async (request) => {
    try {
      if (request.method === "GET")
        return json({ ok: true, transport: "netlify-functions", version: 1 });
      assert(request.method === "POST", "不支持此请求", 405);
      const url = new URL(request.url),
        origin = request.headers.get("origin");
      assert(!origin || origin === url.origin, "来源不匹配", 403);
      assert(
        request.headers.get("content-type")?.includes("application/json"),
        "请求格式不正确",
        415,
      );
      const token = request.headers
        .get("authorization")
        ?.replace(/^Bearer /, "");
      assert(
        typeof token === "string" && token.length >= 20 && token.length <= 200,
        "会话无效",
        401,
      );
      const raw = await request.text();
      assert(raw.length <= 12000, "请求过大", 413);
      const { event, requestId, ...data } = JSON.parse(raw);
      assert(
        typeof requestId === "string" &&
          requestId.length >= 16 &&
          requestId.length <= 100,
        "请求标识无效",
      );
      assert(
        typeof data.id === "string" &&
          data.id.length >= 16 &&
          data.id.length <= 100,
        "玩家标识无效",
      );
      const auth = hash(token);
      if (event === "create") {
        const sessionRow = await store.getWithMetadata("sessions/" + auth, {
          type: "json",
        });
        const session = await free(auth, null, requestId);
        if (session?.requestId === requestId) {
          const r = (await read(session.code)).data;
          return json(
            present(
              r,
              r.players.find((p) => p.auth === auth),
              url.origin,
            ),
          );
        }
        assert([6, 7, 8].includes(data.count), "请选择 6–8 人");
        for (let tries = 0; tries < 12; tries++) {
          const code = String(randomInt(100000, 1000000)),
            p = makePlayer(data, auth, 0),
            r = game.createRoom(code, data.count, p);
          r.version = 1;
          r.requests = [{ id: requestId, auth }];
          const created = await store.setJSON("rooms/" + code, r, {
            onlyIfNew: true,
          });
          if (!created.modified) continue;
          const claimed = await store.setJSON(
            "sessions/" + auth,
            { code, requestId },
            sessionRow ? { onlyIfMatch: sessionRow.etag } : { onlyIfNew: true },
          );
          if (!claimed.modified) {
            r.phase = "closed";
            await store.setJSON("rooms/" + code, r, {
              onlyIfMatch: created.etag,
            });
            const current = await free(auth, null, requestId);
            if (current?.requestId === requestId) {
              const existing = (await read(current.code)).data;
              return json(
                present(
                  existing,
                  existing.players.find((p) => p.auth === auth),
                  url.origin,
                ),
              );
            }
            assert(false, "会话正在入局，请稍后重试", 409);
          }
          return json(present(r, p, url.origin));
        }
        throw Error("暂时无法开局，请重试");
      }
      assert(/^\d{6}$/.test(data.code), "请输入六位房间号");
      if (event === "join") {
        const sessionKey = "sessions/" + auth;
        const previous = await store.getWithMetadata(sessionKey, {
          type: "json",
        });
        let claim;
        if (previous?.data.code !== data.code) {
          const target = (await read(data.code)).data;
          const seated = target.players.find((p) => p.id === data.id);
          if (seated) assert(seated.auth === auth, "会话不匹配", 403);
          else {
            assert(target.phase === "lobby", "对局已开始，无法中途加入");
            assert(target.players.length < target.count, "此局已满员");
            makePlayer(data, auth, 0);
          }
          claim = await store.setJSON(
            sessionKey,
            { code: data.code, requestId, previousCode: previous?.data.code },
            previous ? { onlyIfMatch: previous.etag } : { onlyIfNew: true },
          );
          assert(claim.modified, "会话正在入局，请稍后重试", 409);
        }
        let result;
        try {
          result = await update(
            data.code,
            auth,
            data.id,
            requestId,
            event,
            data,
            url.origin,
          );
        } catch (e) {
          if (claim)
            await store.setJSON(sessionKey, previous?.data || { code: null }, {
              onlyIfMatch: claim.etag,
            });
          throw e;
        }
        if (!result.dissolved)
          await leavePrevious(
            claim ? previous?.data.code : previous?.data.previousCode,
            auth,
          );
        return json(result);
      }
      const session = await store.get("sessions/" + auth, { type: "json" });
      assert(
        !session?.code || session.code === data.code,
        "已切换房间，请在新房间继续游戏",
        403,
      );
      const result = await update(
        data.code,
        auth,
        data.id,
        requestId,
        event,
        data,
        url.origin,
      );
      if (!result.dissolved && event === "resume" && !session)
        await store.setJSON(
          "sessions/" + auth,
          { code: data.code, requestId },
          { onlyIfNew: true },
        );
      return json(result);
    } catch (e) {
      return json(
        {
          error:
            e.status || e instanceof SyntaxError
              ? e.message
              : "服务暂时不可用，请稍后重试",
        },
        e.status || (e instanceof SyntaxError ? 400 : 500),
      );
    }
  };
}
