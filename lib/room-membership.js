// Keep the seat and role in an ongoing game, but revoke the previous login.
export function removeLogin(room, auth) {
  const player = room.players.find((p) => p.auth === auth);
  if (!player) return false;
  if (["lobby", "finished"].includes(room.phase)) {
    room.players = room.players.filter((p) => p !== player);
    if (!room.players.length) room.phase = "closed";
    else if (room.host === player.id) room.host = room.players[0].id;
  } else {
    player.online = false;
    player.lastSeen = 0;
    player.socketId = null;
    player.auth = null;
  }
  room.lastActionAt = Date.now();
  return true;
}
