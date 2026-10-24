import test from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { displayText, localizeTree } from "../src/language.js";

test("界面简繁转换涵盖规则、角色技能和确认文案", () => {
  assert.equal(displayText("游戏规则", "zh-Hant"), "遊戲規則");
  assert.equal(displayText("是否确认投票？", "zh-Hant"), "是否確認投票？");
  assert.equal(displayText("是否发动技能？", "zh-Hant"), "是否發動技能？");
  assert.equal(displayText("方震不能查验阵营", "zh-Hant"), "方震不能查驗陣營");
  assert.equal(displayText("游戏规则", "zh-Hans"), "游戏规则");
});
test("显示语言不改变角色标识、输入值、链接或点击行为", () => {
  const click = () => {};
  const original = h(
    "button",
    { value: "许愿", "aria-label": "确认投票", onClick: click },
    "确认投票",
  );
  const translated = localizeTree(original, "zh-Hant");
  assert.equal(translated.props.value, "许愿");
  assert.equal(translated.props.onClick, click);
  assert.equal(translated.props["aria-label"], "確認投票");
  assert.equal(translated.props.children, "確認投票");
  assert.equal(localizeTree(original, "zh-Hans").props.children, "确认投票");
  const input = localizeTree(
    h("input", { value: "用户昵称", placeholder: "输入昵称" }),
    "zh-Hant",
  );
  assert.equal(input.props.value, "用户昵称");
  assert.equal(input.props.placeholder, "輸入暱稱");
  const preserved = h("span", { translate: "no" }, "用户昵称");
  assert.equal(localizeTree(preserved, "zh-Hant"), preserved);
});
