import test from "node:test";
import assert from "node:assert/strict";
import { campCheckHistory } from "../src/camp-records.js";
test("方震验人记录兼容新旧数据，并保留昵称中的分隔符", () => {
  const history = [
    { round: 1, artifact: null, result: "青山 · 听雨 · 老朝奉阵营" },
    {
      round: 2,
      artifact: null,
      result: "旧名字 · 许愿阵营",
      targetName: "现在的名字",
      camp: "许愿阵营",
    },
    { round: 2, artifact: 0, result: "真品" },
  ];
  const original = structuredClone(history);
  assert.deepEqual(campCheckHistory(history), [
    { round: 1, targetName: "青山 · 听雨", camp: "老朝奉阵营" },
    { round: 2, targetName: "现在的名字", camp: "许愿阵营" },
  ]);
  assert.deepEqual(history, original);
  assert.deepEqual(campCheckHistory(), []);
});
