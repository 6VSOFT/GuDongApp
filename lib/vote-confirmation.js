export function requireVoteConfirmation(data) {
  if (data.confirmed !== true) {
    throw Error("页面版本已更新，请刷新页面后，在投票确认弹窗点击【是】提交");
  }
}
