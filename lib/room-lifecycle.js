export const INACTIVITY_MS = 24 * 60 * 60 * 1000;
export const isInactive = (room, now = Date.now()) =>
  Boolean(
    room &&
    room.phase !== "closed" &&
    now - (room.lastActionAt ?? room.createdAt) >= INACTIVITY_MS,
  );
export function closeInactive(room) {
  room.phase = "closed";
  room.dissolved = true;
  room.dissolveReason = "inactive";
  room.version = (room.version || 0) + 1;
}
// Compare-and-swap prevents cleanup from closing a room that just became active.
export async function expireInactiveRooms(store) {
  let closed = 0;
  for await (const page of store.list({ prefix: "rooms/", paginate: true })) {
    for (let i = 0; i < page.blobs.length; i += 8) {
      await Promise.all(
        page.blobs.slice(i, i + 8).map(async ({ key }) => {
          const row = await store.getWithMetadata(key, { type: "json" });
          if (!isInactive(row?.data)) return;
          closeInactive(row.data);
          const result = await store.setJSON(key, row.data, {
            onlyIfMatch: row.etag,
          });
          if (result.modified) closed++;
        }),
      );
    }
  }
  return closed;
}
