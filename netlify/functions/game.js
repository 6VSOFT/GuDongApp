import { getStore } from "@netlify/blobs";
import { createHandler } from "../../lib/cloud-game.js";
export default (request) =>
  createHandler(getStore({ name: "gudong-rooms-v1", consistency: "strong" }))(
    request,
  );
