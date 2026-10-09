import { getStore } from "@netlify/blobs";
import { createHandler } from "../../lib/cloud-game.js";
import { checkedBlobFetch } from "../../lib/blob-fetch.js";
export default (request) =>
  createHandler(
    getStore({
      name: "gudong-rooms-v1",
      consistency: "strong",
      fetch: checkedBlobFetch(),
    }),
  )(request);
