// Web Crypto keeps the same rule engine usable in Node and the offline demo.
const randomInt = (min, max) => {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  const range = max - min,
    limit = Math.floor(4294967296 / range) * range;
  const values = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return min + (values[0] % range);
};
export const ROLE_INFO = {
  许愿: "每轮可鉴定两件宝物。",
  方震: "不能鉴定宝物；每轮可查验一名玩家的阵营。",
  黄烟烟: "三轮中随机一轮无法鉴定宝物。",
  木户加奈: "三轮中随机一轮无法鉴定宝物。",
  姬云浮: "不受老朝奉影响；被药不然袭击后，整局无法再鉴定。",
  老朝奉: "发动后，后续玩家看到的真伪互换；己方与姬云浮不受影响。",
  药不然: "袭击一名玩家，使其下次行动无法鉴定或使用技能；袭击方震会连带许愿。",
  郑国渠: "覆盖一件宝物，使后续玩家无法鉴定该宝物。",
};
export const evil = (p) => ["老朝奉", "药不然", "郑国渠"].includes(p.role);
export const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const check = (ok, msg) => {
  if (!ok) throw Error(msg);
};
export function createRoom(code, count, player) {
  check([6, 7, 8].includes(count), "请选择 6–8 人");
  return {
    code,
    count,
    host: player.id,
    players: [player],
    phase: "lobby",
    round: 0,
    score: 0,
    logs: ["鉴宝席已设，静候同道。"],
    createdAt: Date.now(),
  };
}
export function start(r) {
  check(
    r.phase === "lobby" &&
      r.players.length === r.count &&
      r.players.every((p) => p.ready),
    "请等待全员入座并准备",
  );
  let roles = Object.keys(ROLE_INFO)
    .filter((n) => r.count === 8 || n !== "姬云浮")
    .filter((n) => r.count !== 6 || n !== "郑国渠");
  roles = shuffle(roles);
  r.players.forEach((p, i) =>
    Object.assign(p, {
      role: roles[i],
      history: [],
      tokens: 0,
      failRound: randomInt(1, 4),
      pending: false,
      permanent: false,
    }),
  );
  r.deck = shuffle(Array.from({ length: 12 }, (_, i) => i));
  beginRound(r, r.players[randomInt(r.count)].id);
}
function beginRound(r, first) {
  r.round++;
  r.artifacts = r.deck.slice((r.round - 1) * 4, r.round * 4);
  const trueIds = shuffle(r.artifacts).slice(0, 2);
  r.truth = Object.fromEntries(
    r.artifacts.map((a) => [a, trueIds.includes(a)]),
  );
  r.flipped = false;
  r.covered = [];
  r.acted = [];
  r.votes = {};
  r.acks = [];
  r.result = null;
  r.tail = null;
  r.players.forEach((p) => {
    p.tokens += 2;
    p.inspection = null;
    p.skillResult = null;
    p.blocked = false;
  });
  r.logs.push(`第 ${r.round} 轮开始，四件兽首已入席。`);
  beginTurn(r, first);
}
function beginTurn(r, id) {
  const p = r.players.find((p) => p.id === id);
  p.blocked = p.pending;
  p.pending = false;
  r.turn = id;
  r.step = "inspect";
  r.phase = "inspect";
  r.logs.push(`${p.name} 开始鉴定。`);
}
export function canInspect(r, p) {
  return (
    p.role !== "方震" &&
    !p.blocked &&
    !p.permanent &&
    !(["黄烟烟", "木户加奈"].includes(p.role) && p.failRound === r.round)
  );
}
export function inspect(r, p, artifacts) {
  check(
    r.phase === "inspect" && r.turn === p.id && r.step === "inspect",
    "当前不能鉴定",
  );
  const allowed = canInspect(r, p);
  const expected = p.role === "许愿" ? 2 : 1;
  check(Array.isArray(artifacts), "鉴定参数无效");
  if (allowed)
    check(
      artifacts.length === expected &&
        new Set(artifacts).size === expected &&
        artifacts.every((a) => r.artifacts.includes(a)),
      "请选择正确数量的本轮兽首",
    );
  p.inspection = [];
  if (!allowed)
    p.inspection = [
      p.blocked
        ? "遭药不然袭击，本次无法鉴定及使用能力。"
        : p.permanent
          ? "遭袭后已失去鉴定能力。"
          : p.role === "方震"
            ? "方震不具备鉴宝能力，可查验阵营。"
            : "本轮无法鉴定。",
    ];
  else
    for (const a of artifacts) {
      const truth = r.truth[a];
      const result = r.covered.includes(a)
        ? "无法鉴定"
        : (r.flipped && !evil(p) && p.role !== "姬云浮" ? !truth : truth)
          ? "真品"
          : "赝品";
      p.history.push({ round: r.round, artifact: a, result });
      p.inspection.push(
        `${["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"][a]}首 · ${result}`,
      );
    }
  r.step = "skill";
  maybeFinishTurn(r, p);
}
export function checkCamp(r, p, { skip = false, target }) {
  check(p.role === "方震", "只有方震可以查验阵营");
  check(
    r.phase === "inspect" &&
      r.turn === p.id &&
      ["inspect", "skill"].includes(r.step),
    "当前不能查验阵营",
  );
  if (!skip) {
    check(!p.blocked, "遭袭时不能查验阵营");
    check(
      !p.history.some((h) => h.round === r.round && h.artifact === null),
      "本轮已查验过阵营",
    );
    check(
      r.players.some((q) => q.id === target && q.id !== p.id),
      "请选择其他玩家",
    );
  }
  if (r.step === "inspect") inspect(r, p, []);
  skill(r, p, { skip, target });
}
export function skill(r, p, { skip, target }) {
  check(
    r.phase === "inspect" && r.turn === p.id && r.step === "skill",
    "当前不能发动能力",
  );
  if (!skip) {
    check(!p.blocked, "遭袭时不能发动能力");
    check(
      ["方震", "老朝奉", "药不然", "郑国渠"].includes(p.role),
      "该角色没有主动技能",
    );
    if (p.role === "老朝奉") {
      r.flipped = true;
      p.skillResult = "已翻转本轮后续鉴定结果。";
    } else if (p.role === "郑国渠") {
      const a = Number(target);
      check(r.artifacts.includes(a), "请选择本轮兽首");
      r.covered.push(a);
      p.skillResult = "已覆盖该兽首。";
    } else {
      const victim = r.players.find((x) => x.id === target && x.id !== p.id);
      check(victim, "请选择其他玩家");
      if (p.role === "方震") {
        check(
          !p.history.some((h) => h.round === r.round && h.artifact === null),
          "本轮已查验过阵营",
        );
        p.skillResult = `${victim.name} · ${evil(victim) ? "老朝奉阵营" : "许愿阵营"}`;
        p.history.push({
          round: r.round,
          artifact: null,
          result: p.skillResult,
        });
      } else if (p.role === "药不然") {
        const targets =
          victim.role === "方震"
            ? [victim, r.players.find((x) => x.role === "许愿")]
            : [victim];
        targets.filter(Boolean).forEach((x) => {
          x.pending = true;
          if (x.role === "姬云浮") x.permanent = true;
        });
        p.skillResult = "袭击已安排，目标下次行动生效。";
      }
    }
  }
  r.step = "next";
  maybeFinishTurn(r, p);
}
function maybeFinishTurn(r, p) {
  if (r.step === "next" && r.acted.length === r.count - 1) {
    r.acted.push(p.id);
    r.tail = p.id;
    r.phase = "discussion";
    r.speechIndex = 0;
    const tail = r.players.findIndex((x) => x.id === p.id);
    r.speechOrder = Array.from(
      { length: r.count },
      (_, i) => r.players[(tail + 1 + i) % r.count].id,
    );
    r.speaker = r.speechOrder[0];
    r.logs.push("鉴定完毕，按座位顺序逐一发言。");
  }
}
export function next(r, p, target) {
  check(
    r.phase === "inspect" && r.step === "next" && r.turn === p.id,
    "当前不能交接",
  );
  check(
    target !== p.id &&
      !r.acted.includes(target) &&
      r.players.some((x) => x.id === target),
    "请选择尚未行动的玩家",
  );
  r.acted.push(p.id);
  beginTurn(r, target);
}
export function speech(r, p) {
  check(r.phase === "discussion" && r.speaker === p.id, "请等待自己的发言");
  r.speechIndex++;
  if (r.speechIndex === r.count) {
    r.speaker = null;
    beginVote(r);
  } else r.speaker = r.speechOrder[r.speechIndex];
}
export function beginVote(r) {
  r.phase = "vote";
  delete r.discussionEnds;
  r.logs.push("所有人发言完毕，开始秘密投票。");
}
export function vote(r, p, votes) {
  check(r.phase === "vote" && !r.votes[p.id], "当前不能投票，或已提交");
  check(
    Array.isArray(votes) &&
      votes.length === 4 &&
      votes.every((v) => Number.isInteger(v) && v >= 0) &&
      votes.reduce((a, b) => a + b, 0) <= p.tokens,
    "票数超过持有筹码或无效",
  );
  r.votes[p.id] = votes;
  p.tokens -= votes.reduce((a, b) => a + b, 0);
  if (Object.keys(r.votes).length === r.count) settleRound(r);
}
export function settleRound(r) {
  const totals = r.artifacts.map((a, i) => ({
    artifact: a,
    votes: Object.values(r.votes).reduce((s, v) => s + v[i], 0),
  })); // Earlier zodiac wins tied priority, matching the spoken rule.
  totals.sort((a, b) => b.votes - a.votes || a.artifact - b.artifact);
  r.protected = [
    ...(r.protected || []),
    ...totals
      .slice(0, 2)
      .map((x) => ({ artifact: x.artifact, truth: r.truth[x.artifact] })),
  ];
  r.result = totals.map((x, i) => ({
    ...x,
    protected: i < 2,
    truth: i === 1 ? r.truth[x.artifact] : null,
  }));
  r.phase = "result";
  r.acks = [];
  r.logs.push("投票揭晓：保护前两名，仅公开第二名真伪。");
}
export function continueGame(r, p) {
  check(r.phase === "result", "请先完成本轮");
  if (!r.acks.includes(p.id)) r.acks.push(p.id);
  if (r.acks.length === r.count) {
    if (r.round < 3) beginRound(r, r.tail);
    else {
      r.score = r.protected.filter((a) => a.truth).length;
      if (r.score === 6) finish(r);
      else {
        r.phase = "guess";
        r.guesses = {};
        r.logs.push("三轮鉴宝结束，进入身份指认。");
      }
    }
  }
}
export function guess(r, p, target) {
  check(
    r.phase === "guess" && !Object.hasOwn(r.guesses, p.id),
    "当前不能指认，或已提交",
  );
  check(
    p.role !== "郑国渠" &&
      target !== p.id &&
      r.players.some((x) => x.id === target),
    "请选择有效玩家",
  );
  r.guesses[p.id] = target;
  const required = r.players.filter((x) => x.role !== "郑国渠");
  if (Object.keys(r.guesses).length === required.length) {
    const chief = r.players.find((x) => x.role === "老朝奉"),
      xu = r.players.find((x) => x.role === "许愿"),
      yao = r.players.find((x) => x.role === "药不然"),
      fang = r.players.find((x) => x.role === "方震");
    const bonusXu = r.guesses[chief.id] !== xu.id ? 2 : 0;
    const bonusFang = r.guesses[yao.id] !== fang.id ? 1 : 0;
    const tally = {};
    r.players
      .filter((x) => !evil(x))
      .forEach((x) => {
        const t = r.guesses[x.id];
        tally[t] = (tally[t] || 0) + 1;
      });
    const max = Math.max(...Object.values(tally));
    const winners = Object.keys(tally).filter((x) => tally[x] === max);
    const bonusChief = winners.length === 1 && winners[0] === chief.id ? 1 : 0;
    r.score += bonusXu + bonusFang + bonusChief;
    r.scoreBreakdown = {
      antiques: r.protected.filter((x) => x.truth).length,
      xu: bonusXu,
      fang: bonusFang,
      chief: bonusChief,
    };
    finish(r);
  }
}
function finish(r) {
  r.phase = "finished";
  r.winner = r.score >= 6 ? "许愿阵营" : "老朝奉阵营";
  r.logs.push(`终局揭晓：${r.winner}获胜。`);
}
export function publicState(r) {
  return {
    code: r.code,
    count: r.count,
    host: r.host,
    phase: r.phase,
    round: r.round,
    score: r.phase === "finished" || r.phase === "guess" ? r.score : 0,
    players: r.players.map(({ id, name, color, ready, online }) => ({
      id,
      name,
      color,
      ready,
      online,
    })),
    artifacts: r.artifacts,
    turn: r.turn,
    step: r.step,
    acted: r.acted,
    logs: r.logs,
    speaker: r.speaker,
    speechIndex: r.speechIndex,
    voteCount: Object.keys(r.votes || {}).length,
    result: r.result,
    ackCount: r.acks?.length || 0,
    winner: r.winner,
    scoreBreakdown: r.phase === "finished" ? r.scoreBreakdown : null,
    revealed:
      r.phase === "finished"
        ? r.players.map(({ id, name, role }) => ({ id, name, role }))
        : null,
  };
}
export function privateState(r, p) {
  return {
    role: p.role,
    camp: evil(p) ? "老朝奉阵营" : "许愿阵营",
    description: ROLE_INFO[p.role],
    history: p.history || [],
    inspection: p.inspection,
    skillResult: p.skillResult,
    canInspect: canInspect(r, p),
    hasSkill:
      !p.blocked && ["方震", "老朝奉", "药不然", "郑国渠"].includes(p.role),
    tokens: p.tokens || 0,
    ally: ["老朝奉", "药不然"].includes(p.role)
      ? r.players.find(
          (q) => q.id !== p.id && ["老朝奉", "药不然"].includes(q.role),
        )?.name
      : null,
    voted: !!r.votes?.[p.id],
    guessed: !!r.guesses?.[p.id],
  };
}
