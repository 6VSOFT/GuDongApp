const uid = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(20)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
export function createCloudTransport({
  fetcher = fetch,
  endpoint = "/api/game",
  pollMs = 1800,
} = {}) {
  const handlers = new Map();
  let enabled = false,
    connected = false,
    timer,
    code = null,
    id = null,
    revision = -1,
    queue = Promise.resolve(),
    epoch = 0;
  const dispatch = (event, value) => {
    for (const fn of handlers.get(event) || []) fn(value);
  };
  const status = (value) => {
    if (connected !== value) {
      connected = value;
      dispatch(value ? "connect" : "disconnect");
    }
  };
  let instance;
  async function request(event, data = {}, requestId = uid()) {
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetcher(endpoint, {
          method: "POST",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer " + instance.auth.token,
          },
          body: JSON.stringify({ event, requestId, ...data }),
          signal: AbortSignal.timeout(12000),
        });
        if (response.status !== 409) break;
      } catch (e) {
        if (attempt === 2) throw e;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
    const result = await response.json();
    if (!response.ok) {
      const e = Error(result.error || "暂时无法同步，请重试");
      e.status = response.status;
      throw e;
    }
    return result;
  }
  function receive(result, enter = false) {
    if (result.left) {
      code = null;
      revision = -1;
      dispatch("left");
      return;
    }
    const r = result.state;
    if (!r) return;
    if (r.code !== code) {
      code = r.code;
      revision = -1;
    }
    if (!enter && r.version <= revision) return;
    revision = r.version;
    dispatch("state", { ...r, _enter: enter });
    dispatch("private", result.private);
  }
  async function poll() {
    if (!enabled) return;
    const currentEpoch = epoch;
    try {
      if (!connected) {
        const response = await fetcher(endpoint, {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw Error("无法连接");
        if (!enabled || epoch !== currentEpoch) return;
        status(true);
      }
      if (code && id) {
        const result = await request("state", { code, id });
        if (enabled && epoch === currentEpoch) receive(result);
      }
    } catch (e) {
      if (!enabled || epoch !== currentEpoch) return;
      if (e.status === 404 || e.status === 403) {
        code = null;
        dispatch("roomExpired");
        dispatch("errorMessage", e.message);
      } else status(false);
    } finally {
      if (enabled && epoch === currentEpoch)
        timer = setTimeout(
          poll,
          typeof document !== "undefined" && document.hidden ? 6000 : pollMs,
        );
    }
  }
  instance = {
    auth: {},
    get connected() {
      return connected;
    },
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
      return instance;
    },
    off(event, fn) {
      if (!event) handlers.clear();
      else if (fn) handlers.get(event)?.delete(fn);
      else handlers.delete(event);
      return instance;
    },
    connect() {
      if (enabled) return;
      enabled = true;
      epoch++;
      poll();
    },
    disconnect() {
      enabled = false;
      epoch++;
      clearTimeout(timer);
      status(false);
    },
    emit(event, data = {}) {
      const currentEpoch = epoch;
      queue = queue.then(async () => {
        try {
          const result = await request(event, data);
          if (epoch !== currentEpoch) return;
          id = data.id || id;
          receive(result, ["create", "join", "resume"].includes(event));
        } catch (e) {
          if (epoch !== currentEpoch) return;
          if (event === "resume" && (e.status === 403 || e.status === 404))
            dispatch("roomExpired");
          dispatch(
            "errorMessage",
            e.status ? e.message : "网络连接中断，请重试",
          );
          if (!e.status) status(false);
        }
      });
      return instance;
    },
  };
  return instance;
}
