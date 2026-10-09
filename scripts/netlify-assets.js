import fs from "node:fs";
// Netlify serves the optional reference video as a static file, outside Functions.
fs.copyFileSync(
  "【桌遊雙-古董局中局-全規則教學影片】.mp4",
  "dist/teaching.mp4",
);
