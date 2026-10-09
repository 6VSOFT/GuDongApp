import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import { createHash } from "node:crypto";
let buildId;
export default defineConfig({
  plugins: [
    react(),
    {
      name: "gudong-offline-cache",
      generateBundle(_, bundle) {
        const assets = Object.keys(bundle)
          .filter((name) => name.endsWith(".js") || name.endsWith(".css"))
          .map((name) => "/" + name);
        buildId = createHash("sha256")
          .update(assets.join(","))
          .digest("hex")
          .slice(0, 12);
        this.emitFile({
          type: "asset",
          fileName: "precache.json",
          source: JSON.stringify([
            "/",
            ...assets,
            "/bronze-hero.png",
            "/icon.svg",
            "/icon-192.png",
            "/icon-512.png",
            "/manifest.webmanifest",
          ]),
        });
      },
      closeBundle() {
        if (buildId)
          fs.writeFileSync(
            "dist/sw.js",
            fs
              .readFileSync("public/sw.js", "utf8")
              .replace("__BUILD_ID__", buildId),
          );
      },
    },
  ],
  server: { host: "0.0.0.0" },
});
