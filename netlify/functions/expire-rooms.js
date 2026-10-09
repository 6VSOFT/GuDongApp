import { getStore } from "@netlify/blobs";
import { checkedBlobFetch } from "../../lib/blob-fetch.js";
import { expireInactiveRooms } from "../../lib/room-lifecycle.js";
export default async () => {
  const closed = await expireInactiveRooms(
    getStore({
      name: "gudong-rooms-v1",
      consistency: "strong",
      fetch: checkedBlobFetch(),
    }),
  );
  console.log("Inactive rooms dissolved:", closed);
};
export const config = { schedule: "*/5 * * * *" };
