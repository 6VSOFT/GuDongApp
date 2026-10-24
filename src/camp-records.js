export function campCheckHistory(history = []) {
  return history
    .filter((item) => item.artifact === null)
    .map((item) => {
      const result = item.result || "";
      const divider = result.lastIndexOf(" · ");
      return {
        round: item.round,
        targetName:
          item.targetName ||
          (divider >= 0 ? result.slice(0, divider) : "未记录对象"),
        camp:
          item.camp ||
          (result.endsWith("老朝奉阵营")
            ? "老朝奉阵营"
            : result.endsWith("许愿阵营")
              ? "许愿阵营"
              : "结果未记录"),
      };
    });
}
