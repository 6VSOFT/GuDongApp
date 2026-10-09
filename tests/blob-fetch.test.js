import test from "node:test";
import assert from "node:assert/strict";
import { checkedBlobFetch } from "../lib/blob-fetch.js";
test("云存储不把服务错误或缺少确认的写入当作成功", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    for (const response of [
      new Response(null, { status: 503 }),
      new Response(null, { status: 200 }),
    ]) {
      await assert.rejects(
        checkedBlobFetch(async () => response)("https://example.com", {
          method: "put",
        }),
      );
    }
    const conflict = new Response(null, { status: 412 });
    assert.equal(
      await checkedBlobFetch(async () => conflict)("https://example.com", {
        method: "put",
      }),
      conflict,
    );
    const written = new Response(null, {
      status: 200,
      headers: { etag: "version" },
    });
    assert.equal(
      await checkedBlobFetch(async () => written)("https://example.com", {
        method: "put",
      }),
      written,
    );
  } finally {
    console.error = original;
  }
});
