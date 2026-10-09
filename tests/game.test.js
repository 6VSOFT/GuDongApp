import test from "node:test";
import assert from "node:assert/strict";
import * as g from "../game.js";
const player = (i, role) => ({
  id: "p" + i,
  name: "玩家" + i,
  color: i,
  ready: true,
  online: true,
  role,
  history: [],
  tokens: 2,
  pending: false,
  permanent: false,
});
function setup(n = 8) {
  const r = g.createRoom("123456", n, player(0));
  r.players = Array.from({ length: n }, (_, i) => player(i));
  g.start(r);
  return r;
}
function turn(r, p) {
  g.inspect(
    r,
    p,
    g.canInspect(r, p) ? r.artifacts.slice(0, p.role === "许愿" ? 2 : 1) : [],
  );
  if (r.phase === "inspect" && r.step === "skill")
    g.skill(r, p, { skip: true });
  if (r.phase === "inspect")
    g.next(
      r,
      p,
      r.players.find((x) => x.id !== p.id && !r.acted.includes(x.id)).id,
    );
}
test("方震直接查验阵营：每轮一次、不能查自己、遭袭失效且结果保密", () => {
  const r = setup(8),
    p = r.players.find((x) => x.role === "方震");
  const bad = r.players.find((x) => x.role === "老朝奉"),
    good = r.players.find((x) => x.role === "许愿");
  r.turn = p.id;
  r.step = "inspect";
  assert.throws(() => g.checkCamp(r, p, { target: p.id }));
  assert.equal(r.step, "inspect");
  g.checkCamp(r, p, { target: bad.id });
  assert.equal(p.skillResult, `${bad.name} · 老朝奉阵营`);
  assert.equal(r.step, "next");
  assert.throws(() => g.checkCamp(r, p, { target: good.id }));
  assert.equal(p.history.filter((h) => h.artifact === null).length, 1);
  assert.equal(JSON.stringify(g.publicState(r)).includes("skillResult"), false);
  r.round = 2;
  r.step = "inspect";
  p.blocked = true;
  assert.throws(() => g.checkCamp(r, p, { target: good.id }));
  assert.equal(r.step, "inspect");
  p.blocked = false;
  g.checkCamp(r, p, { target: good.id });
  assert.equal(p.skillResult, `${good.name} · 许愿阵营`);
  assert.equal(p.history.filter((h) => h.artifact === null).length, 2);
  assert.throws(() => g.checkCamp(r, good, { target: bad.id }));
});
for (const n of [6, 7, 8])
  test(`${n} 人完整三轮对局、每轮两真两假及尾家续轮`, () => {
    const r = setup(n);
    assert.equal(new Set(r.players.map((p) => p.role)).size, n);
    assert.equal(
      r.players.some((p) => p.role === "姬云浮"),
      n === 8,
    );
    assert.equal(
      r.players.some((p) => p.role === "郑国渠"),
      n > 6,
    );
    let lastTail;
    for (let round = 1; round <= 3; round++) {
      if (lastTail) assert.equal(r.turn, lastTail);
      assert.equal(Object.values(r.truth).filter(Boolean).length, 2);
      assert.equal(r.round, round);
      while (r.phase === "inspect")
        turn(
          r,
          r.players.find((p) => p.id === r.turn),
        );
      lastTail = r.tail;
      assert.equal(
        r.speaker,
        r.players[(r.players.findIndex((p) => p.id === r.tail) + 1) % n].id,
      );
      while (r.phase === "discussion")
        g.speech(
          r,
          r.players.find((p) => p.id === r.speaker),
        );
      for (const p of r.players) g.vote(r, p, [0, 0, 0, 0]);
      assert.equal(r.phase, "result");
      assert.equal(r.result.filter((a) => a.truth !== null).length, 1);
      for (const p of r.players) g.continueGame(r, p);
    }
    assert.equal(r.phase, "guess");
    assert.equal(r.players[0].tokens, 6);
    for (const p of r.players.filter((p) => p.role !== "郑国渠"))
      g.guess(r, p, r.players.find((q) => q.id !== p.id).id);
    assert.equal(r.phase, "finished");
    assert.ok(r.winner);
  });
test("公开状态不泄露身份、真伪、私密技能及第一名真伪", () => {
  const r = setup();
  const pub = g.publicState(r);
  const raw = JSON.stringify(pub);
  for (const role of Object.keys(g.ROLE_INFO)) assert.ok(!raw.includes(role));
  assert.equal(pub.truth, undefined);
  assert.equal(pub.guesses, undefined);
  assert.equal(pub.score, 0);
  r.votes = Object.fromEntries(r.players.map((p) => [p.id, [2, 0, 0, 0]]));
  g.settleRound(r);
  assert.equal(g.publicState(r).result[0].truth, null);
  assert.equal(g.publicState(r).result[1].truth, r.truth[r.result[1].artifact]);
});
test("仅老朝奉和药不然互认，郑国渠不知队友", () => {
  const r = setup();
  for (const p of r.players)
    assert.equal(
      !!g.privateState(r, p).ally,
      ["老朝奉", "药不然"].includes(p.role),
    );
});
test("老朝奉翻转全局后续鉴定，姬云浮与己方免疫", () => {
  const r = setup();
  r.flipped = true;
  r.covered = [];
  const a = r.artifacts[0];
  for (const role of ["黄烟烟", "姬云浮", "药不然"]) {
    const p = r.players.find((p) => p.role === role);
    p.failRound = 99;
    r.turn = p.id;
    r.step = "inspect";
    r.phase = "inspect";
    g.inspect(r, p, [a]);
    const expected = (role === "黄烟烟" ? !r.truth[a] : r.truth[a])
      ? "真品"
      : "赝品";
    assert.equal(p.history.at(-1).result, expected);
  }
});
test("覆盖阻止鉴定，许愿必须鉴定两件不同宝物", () => {
  const r = setup();
  const p = r.players.find((p) => p.role === "许愿");
  r.turn = p.id;
  r.step = "inspect";
  r.covered = [r.artifacts[0]];
  assert.throws(() => g.inspect(r, p, [r.artifacts[0], r.artifacts[0]]));
  g.inspect(r, p, r.artifacts.slice(0, 2));
  assert.equal(p.history.at(-2).result, "无法鉴定");
});
test("药不然袭击方震连带许愿；姬云浮永久失鉴", () => {
  const r = setup();
  const yao = r.players.find((p) => p.role === "药不然"),
    fang = r.players.find((p) => p.role === "方震"),
    xu = r.players.find((p) => p.role === "许愿"),
    ji = r.players.find((p) => p.role === "姬云浮");
  r.turn = yao.id;
  r.step = "skill";
  g.skill(r, yao, { target: fang.id });
  assert.ok(fang.pending && xu.pending);
  r.step = "skill";
  g.skill(r, yao, { target: ji.id });
  assert.ok(ji.permanent);
  assert.equal(g.canInspect(r, ji), false);
});
test("拒绝越权、重复投票与超额筹码，允许弃票", () => {
  const r = setup();
  const p = r.players.find((p) => p.id !== r.turn);
  assert.throws(() => g.inspect(r, p, r.artifacts.slice(0, 1)));
  r.phase = "vote";
  assert.throws(() => g.vote(r, p, [3, 0, 0, 0]));
  g.vote(r, p, [0, 0, 0, 0]);
  assert.equal(p.tokens, 2);
  assert.throws(() => g.vote(r, p, [1, 0, 0, 0]));
});
test("方震只能查阵营且不具鉴宝能力；被袭击不能使用技能", () => {
  const r = setup();
  const p = r.players.find((p) => p.role === "方震");
  r.turn = p.id;
  r.step = "inspect";
  assert.equal(g.canInspect(r, p), false);
  g.inspect(r, p, []);
  assert.equal(r.step, "skill");
  g.skill(r, p, { target: r.players.find((p) => p.role === "老朝奉").id });
  assert.match(p.skillResult, /老朝奉阵营/);
  r.step = "inspect";
  p.blocked = true;
  g.inspect(r, p, []);
  assert.equal(r.step, "skill");
  assert.throws(() =>
    g.skill(r, p, { target: r.players.find((p) => p.role === "老朝奉").id }),
  );
  g.skill(r, p, { skip: true });
  assert.equal(r.step, "next");
});
test("按用户确认，相对多数指认正确加一分；并列不给分", () => {
  for (const tied of [false, true]) {
    const r = setup();
    r.phase = "guess";
    r.guesses = {};
    r.protected = [];
    r.score = 0;
    const chief = r.players.find((p) => p.role === "老朝奉"),
      yao = r.players.find((p) => p.role === "药不然"),
      xu = r.players.find((p) => p.role === "许愿"),
      fang = r.players.find((p) => p.role === "方震");
    r.guesses[chief.id] = xu.id;
    r.guesses[yao.id] = fang.id;
    const good = r.players.filter((p) => !g.evil(p));
    const others = good.filter((p) => p !== xu);
    const choices = tied
      ? [chief.id, chief.id, yao.id, yao.id, fang.id]
      : [chief.id, chief.id, chief.id, yao.id, yao.id];
    good.forEach((p, i) =>
      g.guess(r, p, choices[i] === p.id ? xu.id : choices[i]),
    );
    assert.equal(r.phase, "finished");
    assert.equal(r.scoreBreakdown.chief, tied ? 0 : 1);
  }
});
test("推荐玩法：绝对发言结束后进入五分钟公开讨论", () => {
  const r = setup();
  r.discussion = true;
  while (r.phase === "inspect")
    turn(
      r,
      r.players.find((p) => p.id === r.turn),
    );
  while (r.phase === "discussion")
    g.speech(
      r,
      r.players.find((p) => p.id === r.speaker),
    );
  assert.equal(r.phase, "openDiscussion");
  assert.ok(r.discussionEnds - Date.now() > 299000);
  g.beginVote(r);
  assert.equal(r.phase, "vote");
});
