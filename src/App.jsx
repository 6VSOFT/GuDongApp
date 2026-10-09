import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { createCloudTransport } from "./cloud-transport.js";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Users,
  BookOpen,
  History,
  Settings,
  ChevronRight,
  ChevronDown,
  Wifi,
  ShieldCheck,
  ScanLine,
  Smartphone,
  Volume2,
  X,
  Check,
  Copy,
  LogOut,
  Eye,
  EyeOff,
  Send,
  Download,
  ScrollText,
  Compass,
  HelpCircle,
} from "lucide-react";
import QRCode from "qrcode";
import * as engine from "../game.js";
import "./style.css";
const socket =
  import.meta.env.VITE_DEPLOY_TARGET === "netlify"
    ? createCloudTransport()
    : io({ autoConnect: false });
const uuid = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(24)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
const COLORS = [
  "#a63d33",
  "#c18a42",
  "#d5b849",
  "#537867",
  "#4b718c",
  "#7c6688",
  "#bcb9ae",
  "#444846",
];
const ZODIAC = [
  "鼠",
  "牛",
  "虎",
  "兔",
  "龙",
  "蛇",
  "马",
  "羊",
  "猴",
  "鸡",
  "狗",
  "猪",
];
const roman = ["I", "II", "III"];
function Seal({ small = false }) {
  return (
    <span className={"seal " + (small ? "small" : "")}>
      古董
      <br />
      局中局
    </span>
  );
}
function Beast({ type = 4, large = false }) {
  return (
    <svg
      className={"beast " + (large ? "large" : "")}
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={"bronze" + type} x1="30" y1="15" x2="145" y2="155">
          <stop stopColor="#b7a479" />
          <stop offset=".45" stopColor="#776b4e" />
          <stop offset="1" stopColor="#3c493e" />
        </linearGradient>
      </defs>
      <ellipse cx="90" cy="159" rx="51" ry="8" fill="#514b37" opacity=".1" />
      <path
        d="M61 130 L56 153 Q90 164 124 153 L119 130"
        fill={"url(#bronze" + type + ")"}
      />
      <path
        d={
          [
            "M49 72 Q20 35 44 32 Q68 27 69 61 Q90 50 111 61 Q115 28 138 32 Q160 37 133 72 L140 102 117 129 90 143 62 129 40 102Z",
            "M57 63 Q27 65 26 31 Q42 52 61 43 L74 57 Q90 50 107 57 L121 43 Q142 52 154 31 Q151 66 125 66 L134 99 121 128 91 143 59 129 46 97Z",
            "M51 71 Q27 33 56 36 L76 54 Q90 49 107 54 L124 36 Q151 37 130 74 L139 97 123 129 91 143 58 130 40 98Z",
            "M58 64 Q34 21 53 19 Q68 25 73 58 L105 58 Q111 20 127 19 Q145 22 123 66 L136 98 119 130 90 143 59 130 43 98Z",
            "M62 59 43 26 47 65 30 52 43 82 35 102 54 128 88 143 121 129 139 100 124 79 143 49 123 61 129 24 106 57 91 41 75 58Z",
            "M49 54 Q88 28 132 54 L142 98 Q145 119 121 139 Q90 154 59 137 Q35 120 39 96Z",
            "M58 60 49 24 68 32 78 58 101 58 115 28 131 24 121 64 130 106 110 146 74 145 48 110Z",
            "M58 66 Q25 59 29 34 Q41 16 57 37 L68 61 Q91 49 111 61 L126 34 Q143 18 153 36 Q159 60 126 68 L130 102 113 136 90 147 64 135 47 101Z",
            "M53 70 Q29 51 23 77 Q24 102 47 99 L54 125 Q88 150 123 127 L135 100 Q159 103 159 78 Q151 52 128 70 Q93 32 53 70Z",
            "M63 65 68 41 77 48 84 22 96 44 109 29 114 61 136 86 117 102 128 113 107 121 111 144 73 143 67 124 48 97Z",
            "M50 66 Q27 60 31 97 L45 121 59 104 65 129 91 143 119 129 125 104 141 122 151 98 Q154 62 131 65 L109 52 70 52Z",
            "M54 65 40 37 62 45 74 63 103 62 123 43 142 37 130 72 139 106 119 133 90 145 61 135 42 108Z",
          ][type % 12]
        }
        fill={"url(#bronze" + type + ")"}
        stroke="#625d46"
        strokeWidth="2"
      />
      <path
        d="M60 78 78 83 71 91 58 87 M104 83 122 78 123 87 109 91"
        fill="#e1c995"
        stroke="#474b3b"
        strokeWidth="3"
      />
      <path
        d="M90 65 82 100 65 109 74 126 91 133 108 126 116 109 98 100Z"
        fill="#a08e66"
        stroke="#5c5d45"
        strokeWidth="2"
      />
      <path
        d="M78 112 86 115 M96 115 104 112 M76 123 Q91 130 106 123"
        stroke="#3c4537"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M53 100 64 99 M116 99 129 100 M66 69 77 72 M104 72 116 69 M81 138 82 150 M101 138 100 150"
        stroke="#d0bc89"
        strokeWidth="2"
        opacity=".55"
      />
      {type === 2 && (
        <path
          d="M79 58 87 72 91 58 96 72 104 59 M48 89 63 94 M116 94 133 87"
          stroke="#3c4537"
          strokeWidth="5"
        />
      )}
      {type === 5 && (
        <path
          d="M70 69 80 91 M110 68 101 90 M76 123 87 119 99 119 109 123 M87 130 87 145 81 152 M87 145 94 152"
          stroke="#414d38"
          strokeWidth="3"
        />
      )}
      {type === 9 && (
        <path
          d="M81 100 111 105 90 116Z"
          fill="#b29654"
          stroke="#5c5d45"
          strokeWidth="2"
        />
      )}
      {type === 11 && (
        <>
          <ellipse
            cx="91"
            cy="115"
            rx="25"
            ry="16"
            fill="#a08e66"
            stroke="#5c5d45"
            strokeWidth="2"
          />
          <ellipse cx="81" cy="115" rx="4" ry="6" fill="#414d38" />
          <ellipse cx="101" cy="115" rx="4" ry="6" fill="#414d38" />
        </>
      )}
      {type === 4 && (
        <>
          <path
            d="M42 111 20 112 13 100 M132 111 156 112 166 99 M65 129 53 143 M118 128 130 142"
            stroke="#726a4e"
            strokeWidth="4"
          />
          <path d="M87 48 89 25 98 42" stroke="#75694b" strokeWidth="5" />
        </>
      )}
    </svg>
  );
}
function SkillDecision({ onChoose, disabled = false }) {
  return (
    <div
      className="skill-decision"
      role="group"
      aria-label="是否发动老朝奉技能"
    >
      <strong>是否发动技能？</strong>
      <button
        className="primary compact"
        disabled={disabled}
        onClick={() => onChoose(false)}
      >
        是，发动技能
      </button>
      <button
        className="outline"
        disabled={disabled}
        onClick={() => onChoose(true)}
      >
        否，不发动
      </button>
    </div>
  );
}
function App() {
  const [page, setPage] = useState("home"),
    [modal, setModal] = useState(null),
    [count, setCount] = useState(8),
    [name, setName] = useState(localStorage.getItem("gudong-name") || ""),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [room, setRoom] = useState(null),
    [privateData, setPrivate] = useState(null),
    [connected, setConnected] = useState(false),
    [toast, setToast] = useState(""),
    [demo, setDemo] = useState(false),
    [reveal, setReveal] = useState(false),
    [selection, setSelection] = useState([]),
    [inspecting, setInspecting] = useState(false),
    [vote, setVote] = useState([0, 0, 0, 0]),
    [target, setTarget] = useState(""),
    [install, setInstall] = useState(null),
    [sound, setSound] = useState(
      localStorage.getItem("gudong-sound") !== "off",
    ),
    [discussion, setDiscussion] = useState(false),
    [now, setNow] = useState(Date.now()),
    [qr, setQr] = useState("");
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  const demoEngine = useRef(null);
  const awaitingInspection = useRef(false);
  const activeRoomCode = useRef(null);
  const receivePrivate = (data) => {
    setPrivate(data);
    if (awaitingInspection.current && data?.inspection?.length) {
      awaitingInspection.current = false;
      setInspecting(false);
      setSelection([]);
      setModal("inspection");
    }
  };
  const id = localStorage.getItem("gudong-id") || uuid();
  if (!localStorage.getItem("gudong-id")) localStorage.setItem("gudong-id", id);
  const notify = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 3500);
  };
  useEffect(() => {
    socket.auth = { token: localStorage.getItem("gudong-token") || uuid() };
    localStorage.setItem("gudong-token", socket.auth.token);
    socket.connect();
    socket.on("roomExpired", () => localStorage.removeItem("gudong-room"));
    socket.on("connect", () => {
      setConnected(true);
      const saved = localStorage.getItem("gudong-room");
      if (saved) socket.emit("resume", { code: saved, id });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("state", (r) => {
      setRoom(r);
      setDemo(false);
      localStorage.setItem("gudong-room", r.code);
      if (activeRoomCode.current !== r.code || r._enter) setModal(null);
      activeRoomCode.current = r.code;
      if (r._enter || r.version === undefined) setPage("game");
    });
    socket.on("private", receivePrivate);
    socket.on("errorMessage", (message) => {
      awaitingInspection.current = false;
      setInspecting(false);
      notify(message);
    });
    const handler = (e) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if ("serviceWorker" in navigator && import.meta.env.PROD)
      navigator.serviceWorker.register("/sw.js");
    return () => {
      socket.off();
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const act = (event, payload = {}) => {
    if (demo) {
      try {
        const r = demoEngine.current,
          p = r.players.find((p) => p.id === id);
        const methods = {
          inspect: () => engine.inspect(r, p, payload.artifacts),
          skill: () => engine.skill(r, p, payload),
          next: () => engine.next(r, p, payload.target),
          speech: () => engine.speech(r, p),
          vote: () => engine.vote(r, p, payload.votes),
          continue: () => engine.continueGame(r, p),
          guess: () => engine.guess(r, p, payload.target),
        };
        methods[event]?.();
        for (let guard = 0; guard < 100; guard++) {
          if (r.phase === "inspect" && r.turn !== id) {
            const npc = r.players.find((p) => p.id === r.turn);
            if (r.step === "inspect")
              engine.inspect(
                r,
                npc,
                engine.canInspect(r, npc)
                  ? r.artifacts.slice(0, npc.role === "许愿" ? 2 : 1)
                  : [],
              );
            else if (r.step === "skill") engine.skill(r, npc, { skip: true });
            else
              engine.next(
                r,
                npc,
                r.players.find(
                  (p) => p.id !== npc.id && !r.acted.includes(p.id),
                ).id,
              );
          } else if (r.phase === "discussion" && r.speaker !== id)
            engine.speech(
              r,
              r.players.find((p) => p.id === r.speaker),
            );
          else if (r.phase === "vote") {
            for (const npc of r.players.filter(
              (p) => p.id !== id && !r.votes[p.id],
            ))
              engine.vote(r, npc, [1, 1, 0, 0]);
            break;
          } else if (r.phase === "result" && r.acks.includes(id)) {
            for (const npc of r.players.filter((p) => p.id !== id))
              engine.continueGame(r, npc);
          } else if (r.phase === "guess") {
            for (const npc of r.players.filter(
              (p) => p.id !== id && p.role !== "郑国渠" && !r.guesses[p.id],
            ))
              engine.guess(r, npc, r.players.find((p) => p.id !== npc.id).id);
            break;
          } else break;
        }
        setRoom(engine.publicState(r));
        receivePrivate(engine.privateState(r, p));
      } catch (e) {
        awaitingInspection.current = false;
        setInspecting(false);
        notify(e.message);
      }
      return;
    }
    socket.emit(event, { code: room?.code, id, ...payload });
  };
  const confirmInspection = () => {
    awaitingInspection.current = true;
    setInspecting(true);
    act("inspect", { artifacts: privateData?.canInspect ? selection : [] });
  };
  const enter = (joining) => {
    if (!name.trim()) return notify("请先留一个入局雅号");
    if (joining && !/^\d{6}$/.test(code)) return notify("请输入六位房间号");
    if (!connected) return notify("连接尚未就绪，请稍后重试");
    localStorage.setItem("gudong-name", name.trim());
    socket.emit(joining ? "join" : "create", {
      id,
      name: name.trim(),
      code,
      count,
      discussion,
    });
  };
  const demoRoom = () => {
    if (room && !demo) return notify("请先离开当前房间，再体验演示");
    const players = [
      "你",
      "青山",
      "听雨",
      "南风",
      "白露",
      "拾贰",
      "墨客",
      "山月",
    ].map((name, i) => ({
      id: i === 0 ? id : "demo" + i,
      name,
      color: i,
      ready: true,
      online: true,
    }));
    const r = engine.createRoom("102408", 8, players[0]);
    r.players = players;
    engine.start(r);
    const xu = players.find((p) => p.role === "许愿");
    [xu.role, players[0].role] = [players[0].role, xu.role];
    r.turn = id;
    r.step = "inspect";
    r.logs = [
      "演示模式 · 其他七位同道由系统自动行动。",
      "第一轮鉴定开始，四件兽首已入席。",
    ];
    demoEngine.current = r;
    setDemo(true);
    setRoom(engine.publicState(r));
    setPrivate(engine.privateState(r, players[0]));
    setPage("game");
    setReveal(false);
  };
  const nav = [
    ["home", Compass, "入局大厅"],
    ["rules", BookOpen, "游戏规则"],
    ["records", History, "我的手札"],
  ];
  useEffect(() => {
    setSelection([]);
    setVote([0, 0, 0, 0]);
    setTarget("");
  }, [room?.round, room?.phase]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setReveal(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    if (!sound || room?.turn !== id || room?.phase !== "inspect") return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const ctx = new Context();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
      osc.onended = () => ctx.close();
    } catch {}
  }, [room?.turn, room?.phase, sound]);
  const inviteUrl =
    (["localhost", "127.0.0.1"].includes(location.hostname)
      ? room?.inviteBase || location.origin
      : location.origin) +
    "/?room=" +
    room?.code;
  useEffect(() => {
    if (room?.code)
      QRCode.toDataURL(inviteUrl, {
        width: 160,
        margin: 1,
        color: { dark: "#46513e", light: "#faf7ee" },
      })
        .then(setQr)
        .catch(() => {});
  }, [inviteUrl]);
  useEffect(() => {
    if (!modal) return;
    const handle = (e) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const els = [
          ...document.querySelectorAll(
            "[role=dialog] button:not(:disabled),[role=dialog] input,[role=dialog] select",
          ),
        ];
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = previous;
    };
  }, [modal]);
  const self = room?.players.find((p) => p.id === id),
    isTurn = room?.turn === id;
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" onClick={() => setPage("home")}>
          <Seal />
          <span>
            古董局中局<small>鉴 宝 · 识 人 · 入 局</small>
          </span>
        </a>
        <div className="side-label">
          鉴宝手札 <span>EST. 1995</span>
        </div>
        <nav>
          {nav.map(([key, Icon, label]) => (
            <button
              className={page === key ? "active" : ""}
              onClick={() => setPage(key)}
              key={key}
            >
              <Icon size={19} />
              {label}
              {page === key && <span className="nav-dot" />}
            </button>
          ))}
          {room && (
            <button
              className={page === "game" ? "active" : ""}
              onClick={() => setPage("game")}
            >
              <Users size={19} />
              当前对局
              <span className="nav-dot" />
            </button>
          )}
        </nav>
        <div className="side-poem">
          <div className="mini-mountain">山</div>
          <p>
            去伪存真
            <br />
            人心可鉴
          </p>
          <span>一场关于真相的博弈</span>
        </div>
        <button className="settings" onClick={() => setModal("settings")}>
          <Settings size={18} />
          偏好设置
          <ChevronRight size={15} />
        </button>
        <div className="side-footer">
          <span className="status-dot" />
          全员互联 · 无需法官 <small>鉴宝辅助 · V1.0</small>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            鉴宝手札 <span>/</span>{" "}
            {page === "home"
              ? "入局大厅"
              : page === "game"
                ? "当前对局"
                : page === "rules"
                  ? "游戏规则"
                  : "我的手札"}
          </div>
          <div className="header-right">
            <span className={"connection " + (!connected ? "offline" : "")}>
              <Wifi size={14} />
              {connected ? "已连接" : "正在重连"}
            </span>
            <button onClick={() => setModal("help")} aria-label="帮助">
              <HelpCircle size={19} />
            </button>
            <span className="user-avatar">客</span>
          </div>
        </header>
        {page === "home" ? (
          <div className="content home">
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span />
                  十二兽首 · 真伪之间
                </div>
                <h1>
                  古董有局，
                  <br />
                  人心有<span>谜。</span>
                </h1>
                <p>
                  一席鉴宝，暗流涌动。
                  <br />
                  邀三五知己，辨古物真伪，识人心深浅。
                </p>
                <button className="text-link" onClick={() => setPage("rules")}>
                  初次入局？先读游戏规则 <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="hero-art">
                <div className="moon" />
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="vertical-note">
                  十二生肖兽首<span>圆明园 · 海晏堂</span>
                </div>
                <img
                  className="bronze-hero"
                  src="/bronze-hero.png"
                  alt="青铜龙首与牛首"
                />
                <div className="art-plinth" />
                <div className="art-stamp">
                  去伪
                  <br />
                  存真
                </div>
                <span className="art-caption">以眼鉴物 · 以心识人</span>
              </div>
              <div className="hero-bottom">
                <span>壹 / 鉴宝入局</span>
                <span>THE ANTIQUE GAME</span>
              </div>
            </section>
            <section className="entry-grid">
              <article className="entry-card create">
                <div className="card-top">
                  <span className="entry-icon">
                    <Plus size={25} />
                  </span>
                  <span className="entry-index">01</span>
                </div>
                <h2>做局 · 创建房间</h2>
                <p>设一席鉴宝局，静候同道入座。</p>
                <div className="entry-meta">
                  <Users size={15} />
                  6–8 位玩家 <i />
                  私密身份 · 自动主持
                </div>
                <button className="primary" onClick={() => setModal("create")}>
                  创建新对局 <ArrowRight size={18} />
                </button>
              </article>
              <article className="entry-card join">
                <div className="card-top">
                  <span className="entry-icon">
                    <ScanLine size={25} />
                  </span>
                  <span className="entry-index">02</span>
                </div>
                <h2>入局 · 加入房间</h2>
                <p>凭六位房间号，赴一场真假之约。</p>
                <div className="join-input">
                  <input
                    aria-label="六位房间号"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="输入 6 位房间号"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                  <button
                    onClick={() => setModal("join")}
                    aria-label="加入房间"
                  >
                    <ArrowRight size={21} />
                  </button>
                </div>
                <span className="input-hint">
                  <ShieldCheck size={13} />
                  身份与鉴定结果，仅自己可见
                </span>
              </article>
            </section>
            <section className="journey">
              <div className="section-title">
                <h3>一局之间，步步有章</h3>
                <button onClick={demoRoom}>
                  体验演示 <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="steps">
                {[
                  ["01", "落座认人", "领取身份，隐匿于人群"],
                  ["02", "掌眼鉴宝", "三轮鉴定，探寻真相"],
                  ["03", "论古投票", "各抒己见，护真去伪"],
                  ["04", "揭晓终局", "辨人识物，胜负分明"],
                ].map(([n, t, d], i) => (
                  <React.Fragment key={n}>
                    <div className="journey-step">
                      <span>{n}</span>
                      <div>
                        <h4>{t}</h4>
                        <p>{d}</p>
                      </div>
                    </div>
                    {i < 3 && <ChevronRight className="step-arrow" size={17} />}
                  </React.Fragment>
                ))}
              </div>
            </section>
            <div className="notice">
              <span className="notice-mark">帖</span>
              <p>
                各执一机，即可入局。系统引导每一步，让所有人都专注于这场博弈。
              </p>
              <span>无需真人 GM</span>
            </div>
            <footer>
              <span>古董局中局 · 鉴宝辅助</span>
              <span>器物有真假，故事有你我。</span>
              <button
                onClick={() =>
                  install ? install.prompt() : setModal("install")
                }
              >
                <Smartphone size={14} />
                安装到手机
              </button>
            </footer>
          </div>
        ) : page === "rules" ? (
          <div className="content">
            <div className="page-heading">
              <span className="eyebrow">入局须知</span>
              <h1>鉴宝有道，落子有章。</h1>
              <p>依据所提供教学视频整理 · 6–8 人 / 三轮鉴宝</p>
            </div>
            <div className="rules-grid">
              {[
                [
                  "壹",
                  "落座与身份",
                  "八人使用全部身份；七人移除姬云浮；六人再移除郑国渠。老朝奉与药不然相认，其余玩家互不知身份。",
                ],
                [
                  "贰",
                  "鉴定与行动",
                  "每轮四件兽首，两真两假。依次鉴定、发动或跳过技能，再指定尚未行动的下一位玩家。尾家成为下一轮起始玩家。",
                ],
                [
                  "叁",
                  "发言与护宝",
                  "从尾家左手边开始，顺时针独立发言。每轮获得两票，可弃票并累积到下一轮。保护最高票的两件兽首；同票依生肖顺位，只有第二高票兽首公开真伪。",
                ],
                [
                  "肆",
                  "终局与识人",
                  "找回六件真品，许愿阵营直接获胜。未满六分则进入身份猜测：许愿阵营找老朝奉，老朝奉找许愿，药不然找方震，许愿未被找到得2分，方震未被找到得1分；好人相对多数指认老朝奉得1分，平票不得分。总分至少6分即获胜。",
                ],
              ].map(([n, t, d]) => (
                <article className="rule-card" key={n}>
                  <span>{n}</span>
                  <h2>{t}</h2>
                  <p>{d}</p>
                </article>
              ))}
            </div>
            <button
              className="primary compact"
              onClick={() => setModal("video")}
            >
              <BookOpen size={17} />
              观看原版教学视频
            </button>
            <div className="section-title">
              <h3>八人入局，各有所长</h3>
            </div>
            <div className="role-list">
              {Object.entries(ROLE_INFO).map(([n, d], i) => (
                <div key={n}>
                  <span className={"role-seal " + (i > 4 ? "dark" : "")}>
                    {n[0]}
                  </span>
                  <section>
                    <h4>
                      {n}
                      <small>{i > 4 ? "老朝奉阵营" : "许愿阵营"}</small>
                    </h4>
                    <p>{d}</p>
                  </section>
                </div>
              ))}
            </div>
          </div>
        ) : page === "records" ? (
          <div className="content">
            <div className="page-heading">
              <span className="eyebrow">只属于你的线索</span>
              <h1>我的鉴宝手札</h1>
              <p>私密记录不会向其他玩家公开。</p>
            </div>
            {privateData?.history?.length ? (
              <div className="history-list">
                {privateData.history.map((h, i) => (
                  <article key={i}>
                    <span>第 {h.round} 轮</span>
                    <h3>
                      {h.artifact === null
                        ? "阵营查验"
                        : ZODIAC[h.artifact] + "首"}
                    </h3>
                    <p>{h.result}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <ScrollText size={42} />
                <h2>手札尚未落笔</h2>
                <p>入局鉴定后，线索会自动收录于此。</p>
                <button
                  className="text-link"
                  onClick={() => setPage(room ? "game" : "home")}
                >
                  返回{room ? "对局" : "大厅"} <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="content game">
            <div className="game-heading">
              <div>
                <span className="eyebrow">
                  {demo ? "演示对局" : "全员互联"} · 房间 {room?.code}
                </span>
                <h1>
                  {room?.phase === "lobby"
                    ? "席已设，待君来。"
                    : room?.phase === "finished"
                      ? "尘埃落定，真相大白。"
                      : `第${["一", "二", "三"][(room?.round || 1) - 1]}轮 · ${PHASE_NAMES[room?.phase] || "掌眼鉴宝"}`}
                </h1>
              </div>
              <button
                className="outline"
                onClick={() => {
                  navigator.clipboard
                    ? navigator.clipboard
                        .writeText(inviteUrl)
                        .then(() => notify("邀请链接已复制"))
                        .catch(() => setModal("invite"))
                    : setModal("invite");
                }}
              >
                <Copy size={16} />
                邀请同道
              </button>
            </div>
            <div className="player-strip">
              {room?.players.map((p) => (
                <div
                  className={"player " + (p.id === room.turn ? "current" : "")}
                  key={p.id}
                >
                  <span style={{ background: COLORS[p.color] }}>
                    {p.name[0]}
                  </span>
                  <strong>
                    {p.name}
                    {p.id === id ? "（你）" : ""}
                  </strong>
                  <small>
                    {room.phase === "lobby"
                      ? p.ready
                        ? "已准备"
                        : "待准备"
                      : room.acted?.includes(p.id)
                        ? "已行动"
                        : p.id === room.turn
                          ? "正在行动"
                          : p.online
                            ? "席中"
                            : "暂离"}
                  </small>
                </div>
              ))}
            </div>
            {room?.phase === "lobby" ? (
              <div className="lobby-board">
                <Seal />
                <h2>同道聚齐，方可开局</h2>
                <p>
                  已入座 {room.players.length} / {room.count}{" "}
                  人，所有人准备后由房主开启。
                </p>
                <div className="invite-panel">
                  <div>
                    <span>入局凭帖 · 六位房间号</span>
                    <div className="room-digits">
                      {room.code.split("").map((n, i) => (
                        <b key={i}>{n}</b>
                      ))}
                    </div>
                    <small>
                      {import.meta.env.VITE_DEPLOY_TARGET === "netlify"
                        ? "各执一机，扫码入席"
                        : "同一网络，扫码入席"}
                    </small>
                  </div>
                  {qr && <img src={qr} alt="扫码加入此房间" />}
                </div>
                <div className="seat-options">
                  {COLORS.slice(0, room.count).map((c, i) => (
                    <button
                      aria-label={"座位颜色 " + (i + 1)}
                      key={c}
                      style={{ background: c }}
                      onClick={() => act("color", { color: i })}
                    >
                      {self?.color === i && <Check size={20} />}
                    </button>
                  ))}
                </div>
                <div className="lobby-actions">
                  <button className="outline" onClick={() => act("ready")}>
                    {self?.ready ? "取消准备" : "我已准备"}
                  </button>
                  {room.host === id && (
                    <button
                      className="primary compact"
                      disabled={
                        room.players.length !== room.count ||
                        room.players.some((p) => !p.ready)
                      }
                      onClick={() => act("start")}
                    >
                      诸位，请入局 <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="round-track">
                  {roman.map((n, i) => (
                    <span
                      className={i + 1 === room.round ? "active" : ""}
                      key={n}
                    >
                      {n} <small>第{["一", "二", "三"][i]}轮</small>
                    </span>
                  ))}
                  <b>
                    护宝得分 <em>{room.score}</em> / 6
                  </b>
                </div>
                <div className="identity-bar">
                  <div>
                    <ShieldCheck size={21} />
                    <span>
                      我的身份
                      <strong>
                        {reveal ? privateData?.role : "身份已隐藏"}
                      </strong>
                    </span>
                  </div>
                  <button onClick={() => setReveal(!reveal)}>
                    {reveal ? <EyeOff size={18} /> : <Eye size={18} />}{" "}
                    {reveal ? "收起" : "查看身份"}
                  </button>
                  {reveal && (
                    <p>
                      {privateData?.description}
                      {privateData?.ally && ` · 同伴：${privateData.ally}`}
                    </p>
                  )}
                  {reveal &&
                    privateData?.role === "老朝奉" &&
                    isTurn &&
                    room.phase === "inspect" &&
                    ["inspect", "skill"].includes(room.step) && (
                      <>
                        {privateData.hasSkill ? (
                          <SkillDecision
                            disabled={room.step !== "skill" || inspecting}
                            onChoose={(skip) => act("skill", { skip })}
                          />
                        ) : (
                          <p>本次无法发动技能。</p>
                        )}
                        {room.step === "inspect" && privateData.hasSkill && (
                          <p>完成鉴定后，选择是否发动技能。</p>
                        )}
                      </>
                    )}
                </div>
                {room.phase === "finished" ? (
                  <div className="lobby-board">
                    <Seal />
                    <h2>{room.winner}获胜</h2>
                    <p>最终得分 {room.score} / 6</p>
                    <div className="revealed-roles">
                      {room.revealed?.map((p) => (
                        <span key={p.id}>
                          {p.name} · {p.role}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : room.phase === "guess" ? (
                  <div className="action-panel">
                    <h2>
                      {privateData?.role === "郑国渠"
                        ? "等待各方指认"
                        : "终局 · 辨人识心"}
                    </h2>
                    <p>
                      许愿阵营指认老朝奉；老朝奉指认许愿；药不然指认方震。提交后不可更改。
                    </p>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="">选择你要指认的玩家</option>
                      {room.players
                        .filter((p) => p.id !== id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                    <button
                      className="primary compact"
                      disabled={
                        !target ||
                        privateData?.guessed ||
                        privateData?.role === "郑国渠"
                      }
                      onClick={() => act("guess", { target })}
                    >
                      {privateData?.role === "郑国渠"
                        ? "等待揭晓"
                        : privateData?.guessed
                          ? "已提交，等待揭晓"
                          : "确认指认"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="section-title">
                      <h3>本轮待鉴 · 四件兽首</h3>
                      <span>
                        {room.phase === "vote"
                          ? "筹码可累积，自由分配"
                          : "真赝未明，请仔细掌眼"}
                      </span>
                    </div>
                    <div className="artifact-grid">
                      {room.artifacts?.map((a, i) => (
                        <div className="artifact-item" key={a}>
                          <button
                            aria-pressed={selection.includes(a)}
                            className={
                              "artifact " +
                              (selection.includes(a) ? "selected" : "")
                            }
                            onClick={() => {
                              if (room.phase === "vote") {
                                setVote((v) => {
                                  const n = [...v];
                                  n[i] =
                                    (n[i] + 1) %
                                    ((privateData?.tokens || 0) + 1);
                                  return n;
                                });
                              } else if (
                                room.phase === "inspect" &&
                                room.step === "inspect" &&
                                !inspecting
                              )
                                setSelection((s) =>
                                  s.includes(a)
                                    ? s.filter((x) => x !== a)
                                    : [...s, a].slice(
                                        -(privateData?.role === "许愿" ? 2 : 1),
                                      ),
                                );
                            }}
                          >
                            <span className="artifact-no">
                              藏品 / {String(a + 1).padStart(2, "0")}
                            </span>
                            <Beast type={a} />
                            <h3>{ZODIAC[a]}首</h3>
                            <span className="artifact-label">
                              {room.phase === "vote"
                                ? `${vote[i]} 票`
                                : "圆明园十二生肖兽首"}
                            </span>
                            {selection.includes(a) && (
                              <span className="selection-check">
                                <Check size={14} />
                              </span>
                            )}
                          </button>
                          {selection.includes(a) &&
                            room.phase === "inspect" &&
                            room.step === "inspect" && (
                              <div className="artifact-actions">
                                <button
                                  className="primary compact"
                                  disabled={
                                    !isTurn ||
                                    !privateData?.canInspect ||
                                    inspecting ||
                                    selection.length !==
                                      (privateData?.role === "许愿" ? 2 : 1)
                                  }
                                  onClick={confirmInspection}
                                >
                                  {inspecting ? "鉴定中…" : "鉴定"}
                                </button>
                                <button
                                  className="outline"
                                  disabled={inspecting}
                                  onClick={() => setSelection([])}
                                >
                                  取消
                                </button>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                    <div className="action-panel">
                      {room.phase === "inspect" ? (
                        <>
                          <span className="eyebrow">
                            {isTurn ? "轮到你掌眼" : "静候同道掌眼"}
                          </span>
                          <h2>
                            {isTurn
                              ? room.step === "inspect"
                                ? "选择兽首，鉴定真伪"
                                : room.step === "skill"
                                  ? "是否发动角色能力？"
                                  : "请指定下一位鉴宝人"
                              : `${room.players.find((p) => p.id === room.turn)?.name} 正在行动`}
                          </h2>
                          <p>
                            {[
                              ...(privateData?.inspection || []),
                              privateData?.skillResult,
                            ]
                              .filter(Boolean)
                              .join(" · ") ||
                              "鉴定结果仅在自己的设备显示，请勿让他人窥屏。"}
                          </p>
                          {isTurn &&
                            (room.step === "inspect" ? (
                              privateData?.canInspect ? (
                                <p className="inspection-hint">
                                  {privateData.role === "许愿" &&
                                  selection.length !== 2
                                    ? "请选择两件不同兽首，再点击卡片下方的【鉴定】。"
                                    : "点选兽首后，点击【鉴定】查看结果，或【取消】重新选择。"}
                                </p>
                              ) : (
                                <button
                                  className="primary compact"
                                  disabled={inspecting}
                                  onClick={confirmInspection}
                                >
                                  {privateData?.canInspect
                                    ? "确认鉴定"
                                    : "继续行动"}{" "}
                                  <ScanLine size={17} />
                                </button>
                              )
                            ) : room.step === "skill" ? (
                              <div className="skill-controls">
                                {privateData?.role === "老朝奉" &&
                                privateData?.hasSkill ? (
                                  reveal ? (
                                    <p>请在身份栏选择是否发动技能。</p>
                                  ) : (
                                    <SkillDecision
                                      onChoose={(skip) =>
                                        act("skill", { skip })
                                      }
                                    />
                                  )
                                ) : (
                                  privateData?.hasSkill && (
                                    <>
                                      <select
                                        value={target}
                                        onChange={(e) =>
                                          setTarget(e.target.value)
                                        }
                                      >
                                        <option value="">选择技能目标</option>
                                        {(privateData?.role === "郑国渠"
                                          ? room.artifacts.map((a) => ({
                                              id: String(a),
                                              name: ZODIAC[a] + "首",
                                            }))
                                          : room.players.filter(
                                              (p) => p.id !== id,
                                            )
                                        ).map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        className="primary compact"
                                        disabled={
                                          !target &&
                                          privateData?.role !== "老朝奉"
                                        }
                                        onClick={() => {
                                          act("skill", { target });
                                          setTarget("");
                                        }}
                                      >
                                        发动能力
                                      </button>
                                    </>
                                  )
                                )}
                                {!(
                                  privateData?.role === "老朝奉" &&
                                  privateData?.hasSkill
                                ) && (
                                  <button
                                    className="outline"
                                    onClick={() => act("skill", { skip: true })}
                                  >
                                    {privateData?.hasSkill
                                      ? "跳过能力"
                                      : "继续，指定下家"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="skill-controls">
                                <select
                                  value={target}
                                  onChange={(e) => setTarget(e.target.value)}
                                >
                                  <option value="">选择下家</option>
                                  {room.players
                                    .filter(
                                      (p) =>
                                        !room.acted.includes(p.id) &&
                                        p.id !== id,
                                    )
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  className="primary compact"
                                  disabled={!target}
                                  onClick={() => {
                                    act("next", { target });
                                    setTarget("");
                                  }}
                                >
                                  交予下家 <ArrowRight size={16} />
                                </button>
                              </div>
                            ))}
                        </>
                      ) : room.phase === "discussion" ? (
                        <>
                          <span className="eyebrow">
                            绝对发言 · {room.speechIndex + 1} / {room.count}
                          </span>
                          <h2>
                            {
                              room.players.find((p) => p.id === room.speaker)
                                ?.name
                            }{" "}
                            的发言时间
                          </h2>
                          <p>
                            请勿打断或质疑当前发言者。所有人发言完毕后，系统开启秘密投票。
                          </p>
                          {room.speaker === id && (
                            <button
                              className="primary compact"
                              onClick={() => act("speech")}
                            >
                              发言完毕 <Check size={17} />
                            </button>
                          )}
                        </>
                      ) : room.phase === "openDiscussion" ? (
                        <>
                          <span className="eyebrow">
                            视频推荐玩法 · 公开讨论
                          </span>
                          <h2>共辨真伪，畅所欲言</h2>
                          <p>
                            剩余{" "}
                            {Math.max(
                              0,
                              Math.ceil(
                                ((room.discussionEnds || now) - now) / 1000,
                              ),
                            )}{" "}
                            秒，讨论结束后自动进入投票。
                          </p>
                        </>
                      ) : room.phase === "vote" ? (
                        <>
                          <h2>
                            {privateData?.voted
                              ? "筹码已落，静候揭晓"
                              : "护真去伪，请落筹码"}
                          </h2>
                          <p>
                            点击兽首分配筹码，可弃票累积 · 已分配{" "}
                            {vote.reduce((a, b) => a + b, 0)} /{" "}
                            {privateData?.tokens || 0} · 已提交 {room.voteCount}{" "}
                            / {room.count} 人
                          </p>
                          <button
                            className="primary compact"
                            disabled={
                              vote.reduce((a, b) => a + b, 0) >
                                (privateData?.tokens || 0) || privateData?.voted
                            }
                            onClick={() => act("vote", { votes: vote })}
                          >
                            确认投票 <Send size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <h2>本轮护宝结果</h2>
                          <p>
                            {room.result
                              ?.map(
                                (r) =>
                                  `${ZODIAC[r.artifact]}首 ${r.votes}票 · ${r.protected ? "保护" : "流失"}${r.truth === null ? " · 真伪暂不公开" : r.truth ? " · 真品" : " · 赝品"}`,
                              )
                              .join(" / ")}
                          </p>
                          <button
                            className="primary compact"
                            onClick={() => act("continue")}
                          >
                            确认结果，继续 <ArrowRight size={16} />
                          </button>
                          <small>
                            已确认 {room.ackCount || 0} / {room.count} 人
                          </small>
                        </>
                      )}
                    </div>
                  </>
                )}
                <div className="game-log">
                  <h3>
                    <ScrollText size={17} />
                    局中纪事
                  </h3>
                  {room.logs?.slice(-5).map((l, i) => (
                    <p key={i}>
                      <span />
                      {l}
                    </p>
                  ))}
                </div>
              </>
            )}
            <button
              className="text-link leave"
              onClick={() => setModal("leave")}
            >
              <LogOut size={15} />
              {demo ? "结束演示" : "离开房间"}
            </button>
          </div>
        )}
      </main>
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div
            className={"modal " + (modal === "video" ? "video-modal" : "")}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setModal(null)}
              aria-label="关闭"
            >
              <X size={21} />
            </button>
            {["create", "join"].includes(modal) ? (
              <>
                <Seal small />
                <span className="eyebrow">
                  {modal === "create" ? "设一席，邀同道" : "凭帖入席"}
                </span>
                <h2>{modal === "create" ? "创建鉴宝局" : "加入鉴宝局"}</h2>
                <label>
                  入局雅号
                  <input
                    autoFocus
                    maxLength={12}
                    placeholder="请输入你的昵称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                {modal === "create" ? (
                  <>
                    <label>入局人数</label>
                    <div className="count-options">
                      {[6, 7, 8].map((n) => (
                        <button
                          key={n}
                          className={count === n ? "selected" : ""}
                          onClick={() => setCount(n)}
                        >
                          {n} 人
                          <small>
                            {n === 6
                              ? "初识古局"
                              : n === 7
                                ? "暗流涌动"
                                : "全员入局"}
                          </small>
                        </button>
                      ))}
                    </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={discussion}
                        onChange={(e) => setDiscussion(e.target.checked)}
                      />
                      投票前公开讨论 5 分钟（视频推荐玩法）
                    </label>
                    <p className="modal-note">
                      系统随机分发身份，并引导完整三轮对局。
                      <br />
                      房主也是玩家，无需担任法官。
                    </p>
                  </>
                ) : (
                  <label>
                    六位房间号
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </label>
                )}
                <button
                  className="primary"
                  onClick={() => enter(modal === "join")}
                >
                  {modal === "create" ? "开局，静候同道" : "入席，赴约"}{" "}
                  <ArrowRight size={18} />
                </button>
              </>
            ) : modal === "inspection" ? (
              <>
                <Seal small />
                <span className="eyebrow">仅本人可见</span>
                <h2>兽首鉴定结果</h2>
                <div className="inspection-results">
                  {privateData?.inspection?.map((result, i) => (
                    <p key={i}>{result}</p>
                  ))}
                </div>
                <p className="modal-note">
                  结果已记入我的手札，请勿让他人窥屏。
                </p>
                <button className="primary" onClick={() => setModal(null)}>
                  收好结果，继续行动 <ArrowRight size={17} />
                </button>
              </>
            ) : modal === "video" ? (
              <>
                <h2>全规则教学</h2>
                <video controls autoPlay src="/teaching.mp4" />
                <p>原始参考视频 · 桌游双《古董局中局》</p>
              </>
            ) : modal === "invite" ? (
              <>
                <h2>邀同道，赴鉴宝之约</h2>
                <p>房间号：{room?.code}</p>
                {qr && (
                  <img className="invite-qr" src={qr} alt="房间邀请二维码" />
                )}
                <input
                  className="invite-url"
                  readOnly
                  value={inviteUrl}
                  aria-label="邀请链接"
                />
                <p className="modal-note">
                  {import.meta.env.VITE_DEPLOY_TARGET === "netlify"
                    ? "分享链接，或让同道扫码、输入房间号入席。"
                    : "同一 Wi-Fi 的玩家扫码或输入房间号入席。"}
                </p>
              </>
            ) : modal === "leave" ? (
              <>
                <h2>{demo ? "结束演示" : "离开此局？"}</h2>
                <p>
                  {demo
                    ? "随时可以再来体验。"
                    : room.phase === "lobby"
                      ? "将释放你的座位。"
                      : "对局进行中，离开后可使用同一设备重连。"}
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    if (!demo) act("leave");
                    localStorage.removeItem("gudong-room");
                    setRoom(null);
                    setPrivate(null);
                    setDemo(false);
                    setPage("home");
                    setModal(null);
                  }}
                >
                  确认离开
                </button>
              </>
            ) : modal === "settings" ? (
              <>
                <h2>偏好设置</h2>
                <button
                  className="setting-row"
                  onClick={() => {
                    setSound(!sound);
                    localStorage.setItem("gudong-sound", sound ? "off" : "on");
                  }}
                >
                  <Volume2 size={19} />
                  提示音<span>{sound ? "开启" : "关闭"}</span>
                </button>
                <p>身份默认隐藏，点击后仅在本机显示。</p>
                <button
                  className="outline"
                  onClick={() =>
                    install ? install.prompt() : setModal("install")
                  }
                >
                  <Download size={16} />
                  安装到手机
                </button>
              </>
            ) : modal === "install" ? (
              <>
                <h2>把鉴宝手札放进口袋</h2>
                <p>iPhone：使用 Safari 打开，点击“分享” → “添加到主屏幕”。</p>
                <p>Android：使用 Chrome 打开，点击菜单 → “安装应用”。</p>
                <p className="modal-note">
                  安装与离线页面需要 HTTPS 或本机
                  localhost。联机对局需要网络连接。
                </p>
              </>
            ) : (
              <>
                <Seal small />
                <h2>各执一机，即可入局</h2>
                <p>
                  一人创建房间，其余玩家输入六位房间号。每人使用自己的手机浏览器入座，选色并准备。
                </p>
                <p>
                  身份和鉴定结果私密显示，系统自动推进流程。若连接断开，使用原设备重新打开即可回席。
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setModal(null);
                    setPage("rules");
                  }}
                >
                  阅读完整规则 <ArrowRight size={17} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const PHASE_NAMES = {
  inspect: "掌眼鉴宝",
  discussion: "各抒己见",
  vote: "护宝投票",
  openDiscussion: "公开讨论",
  result: "护宝揭晓",
  tiebreak: "同票裁定",
  guess: "辨人识心",
};
const ROLE_INFO = engine.ROLE_INFO;
export default App;
if (import.meta.hot) import.meta.hot.dispose(() => socket.disconnect());
