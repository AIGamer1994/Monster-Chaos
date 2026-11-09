/* =====================================================================
 * theme.js — 牌桌 A–F 區「介面設定」（顏色／字體／邊框／間距…全部集中在此檔）
 *
 * 使用方式：index.html 的 JSX 以 UI.<區>.<代號> 取得 class 字串，例如
 *   <header className={UI.A.a01}>                         ← 固定樣式（字串）
 *   <div className={UI.D.d02({ isTurn, isDead })}>         ← 隨狀態變化（函式，回傳字串）
 *
 * 區塊對照：
 *   root  外層容器（整個牌桌畫面／手機寬度容器）
 *   A     版本設定區：版本號、大廳／動態／速度／規則／紀錄 按鈕
 *   B     動態區：廣播一列、出局／復活提示、播放鈕
 *   C     牌庫數目區：月亮、備用牌、暗牌、牌庫張數
 *   D     其他玩家：頭像框、輪到誰的綠框、狀態列
 *   E     面前區：對手面前牌、出牌動畫區、自己面前牌、局末攤牌面板
 *   F     手牌區：自己頭像、手牌卡片、抽一打一／拿一還一、先知／醉漢記憶
 *
 * 怎麼找要改的地方：每個代號上方的註解標示「<標籤> 「畫面上的字」」或圖示名稱；
 *   同一區內依畫面由上到下、由外到內排列，並以「── 區塊說明 ──」分段。
 *
 * 樣式皆為 Tailwind 工具類別（Tailwind CDN 於執行時掃描 DOM，直接改字串即生效）。
 *   顏色：bg-* / text-* / border-* / from-* via-* to-* / shadow-[…]
 *   字體：text-[10px] / text-xs / font-black / gothic-num / tracking-* / leading-*
 *   邊框：border / border-2 / border-b / border-dashed / rounded-*
 *
 * 另含 A–F 專用的自訂 CSS（手牌選中、出局／復活亮燈、桌面外框），載入時自動注入 <head>。
 * 動畫月亮升起／狼月／吸血鬼不在此檔，見 fx-finale.js。
 * ===================================================================== */
(function () {
  'use strict';

  // ---- A–F 專用自訂 CSS（原本在 index.html <style> 內）-----------------
  const UI_CSS = `
  /* ── 整張牌桌背景圖（檔案放在 index.html 同一資料夾：bg.jpg）──
     一張圖覆蓋 A–F 全部區域；上面蓋一層半透明深色遮罩讓文字清楚。
     調整遮罩濃度改 --ov（0 = 無遮罩，1 = 全黑）。圖片不存在時自動退回原本的漸層底色。 */
  .table-bg {
    --ov: .0;
    background-image: linear-gradient(rgba(2,6,23,var(--ov)), rgba(2,6,23,var(--ov))), url('bg.jpg'), linear-gradient(to bottom, #0f172a, #020617, #0f172a);
    background-size: cover, cover, 100% 100%;
    background-position: center, center, center;
    background-repeat: no-repeat;
  }

  /* ── A–F 區古風字體（只設在區塊根節點讓子層繼承，Font Awesome 圖示不受影響）── */
  .gufeng { font-family: 'LXGW WenKai TC', 'Kaiti TC', 'STKaiti', 'DFKai-SB', 'BiauKai', 'Noto Serif TC', 'Songti TC', serif; }

  /* ── 哥德式數字（UnifrakturCook 黑哥德體；用於卡面數值、牌庫、結算、動畫等所有數字）── */
  .gothic-num {
    font-family: 'UnifrakturCook', 'UnifrakturMaguntia', 'Old English Text MT', 'Cloister Black', 'Gothic', serif;
    font-weight: 700;
    letter-spacing: 0.03em;
    font-variant-numeric: normal;
  }

  /* ── 手牌背景圖（檔案放在 index.html 同一資料夾：card.jpg，建議 130x173（3:4））──
     套用在：F 區手牌、抽牌動畫牌面、點開的放大檢視。--ov 為深色遮罩濃度（0 = 無遮罩，1 = 全黑）。
     圖片不存在時自動退回原本的深色底（bg-slate-900）。 */
  .card-bg {
    --ov: .2;
    background-image: linear-gradient(rgba(2,6,23,var(--ov)), rgba(2,6,23,var(--ov))), url('card.jpg');
    background-size: cover, cover;
    background-position: center, center;
    background-repeat: no-repeat;
  }

  /* ── 卡背圖（card.jpg 的背面版：cardb.jpg，同一資料夾）。用在抽牌動畫牌背、C 區動畫的牌背。
     圖片不存在時退回深藍底色。 */
  .card-back {
    background-color: #1e1b4b;
    background-image: url('cardb.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    min-height: 0;
  }

  /* ── 面前區／動畫正面小牌背景（cards.jpg；與手牌 card.jpg、牌背 cardb.jpg 分開）──
     無圓角無外框由 class 控制；比例統一 3:4。 */
  .front-card-bg {
    --ov: .25;
    background-image: linear-gradient(rgba(2,6,23,var(--ov)), rgba(2,6,23,var(--ov))), url('cards.jpg');
    background-size: cover, cover;
    background-position: center, center;
    background-repeat: no-repeat;
  }

  /* ── 面前區「上方摺疊條」：只用 cards.jpg 最上方一段作背景 ──
     寬度與完整面前牌相同；高度為摺疊條；圖由上往下裁。 */
  .front-card-top {
    --ov: .2;
    background-image: linear-gradient(rgba(2,6,23,var(--ov)), rgba(2,6,23,var(--ov))), url('cards.jpg');
    background-size: 100% auto, 100% auto;
    background-position: center top, center top;
    background-repeat: no-repeat, no-repeat;
  }

  /* ── 生效中：純光暈（無實線邊、無 outline）── */
  .front-card-active {
    overflow: visible !important;
    z-index: 6;
    border: none !important;
    outline: none !important;
    /* 只有柔和外發光，沒有 0px 實線層 */
    box-shadow:
      0 0 8px 3px rgba(52, 211, 153, 0.95),
      0 0 18px 6px rgba(16, 185, 129, 0.7),
      0 0 32px 12px rgba(52, 211, 153, 0.45),
      0 0 48px 16px rgba(110, 231, 183, 0.25);
    filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.9));
  }

  /* ── 牌面各元素對齊 card.jpg 的格仔（百分比 = 佔整張 130x173 卡的比例；要微調就改這裡）──
     cd-num   數字 → 左上紅圈中心
     cd-title 卡名 → 右上暗紅橫幅
     cd-icon  圖示 → 中間大黑窗中心
     cd-desc  說明 → 底部咖啡色底板 
     使用前提：外層卡片要 position: relative。 */
  .cd-num   { position:absolute; left:2.8%;  top:2.4%;  width:21.5%; height:14.7%; display:flex; align-items:center; justify-content:center; }
  .cd-title { position:absolute; left:24.2%; top:5.7%;  width:64.8%; height:7.2%;  display:flex; align-items:center; justify-content:center; overflow:hidden; white-space:nowrap; }
  .cd-icon  { position:absolute; left:12%;   top:13.9%; width:74.6%; height:46.4%; display:flex; align-items:center; justify-content:center; }
  .cd-desc  { position:absolute; left:12.5%; top:73.5%; width:74%;   height:19.5%; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; }

  /* 手牌選中動畫 */
  .hand-card {
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .hand-card.selected {
      transform: translateY(-12px) scale(1.04);
      border-color: #f87171;
      box-shadow: 0 10px 20px rgba(245, 158, 11, 0.4), 0 0 15px rgba(245, 158, 11, 0.6);
      z-index: 30;
  }

  /* 出局（紅燈）／復活（綠燈）亮燈 */
  @keyframes flash-out { 0%,100% { box-shadow: 0 0 8px 1px rgba(244,63,94,.45); } 35%,65% { box-shadow: 0 0 24px 6px rgba(244,63,94,.95); } }
  @keyframes flash-revive { 0%,100% { box-shadow: 0 0 8px 1px rgba(52,211,153,.45); } 35%,65% { box-shadow: 0 0 24px 6px rgba(52,211,153,.95); } }
  .event-out { border-color: #f43f5e; box-shadow: 0 0 10px 2px rgba(244,63,94,.5); animation: flash-out 0.9s ease-in-out 3; }
  .event-revive { border-color: #34d399; box-shadow: 0 0 10px 2px rgba(52,211,153,.5); animation: flash-revive 0.9s ease-in-out 3; }

  /* 桌面端外框效果 */
  @media (min-width: 600px) {
      .mobile-container {
          border-left: 1px solid rgba(51, 65, 85, 0.5);
          border-right: 1px solid rgba(51, 65, 85, 0.5);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
      }
  }
  `;
  if (!document.getElementById('ui-theme-css')) {
    const st = document.createElement('style');
    st.id = 'ui-theme-css';
    st.textContent = UI_CSS;
    document.head.appendChild(st);
  }

  if (!document.getElementById('ui-theme-font')) {
    const lk = document.createElement('link');
    lk.id = 'ui-theme-font';
    lk.rel = 'stylesheet';
    lk.href = 'https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=UnifrakturCook:wght@700&display=swap';
    document.head.appendChild(lk);
  }

  const UI = {
  // ═══════════════ 外層容器（整個牌桌畫面、手機寬度容器） ═══════════════
  root: {
    // <div>
    r01: "fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950 text-slate-100 select-none touch-manipulation pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
    // <div>
    r02: "table-bg mobile-container shrink-0 flex flex-col justify-between relative overflow-hidden",
  },

  // ═══════════════ A 區｜版本設定區 ═══════════════
  A: {
    // <header>
    a01: "gufeng h-[4.5%] min-h-[32px] bg-slate-900/50 backdrop-blur border-b border-cyan-900/40 px-3 flex items-center justify-between z-[80] shrink-0",
    // <div>
    a02: "flex items-center",
    // <span>
    a03: "text-[10px] gothic-num font-bold text-cyan-400 tracking-tight",
    // <div>
    a04: "flex items-center space-x-1.5",
    // <button> 「返回大廳」
    a05: "flex items-center justify-center h-6 gap-0.5 whitespace-nowrap bg-slate-800/90 border border-slate-500/50 text-slate-300 text-[10px] font-bold px-1.5 rounded-md shadow-sm active:scale-95",
    // <i> icon:arrow-left
    a06: "fa-solid fa-arrow-left text-[9px]",
    // <button> 「動態」
    a07: ({ showBroadcast }) => `flex items-center justify-center h-6 whitespace-nowrap border text-[10px] font-bold px-1.5 rounded-md shadow-sm active:scale-95 ${showBroadcast ? 'bg-emerald-500/25 border-emerald-400/70 text-emerald-200' : 'bg-slate-800/90 border-slate-600/60 text-slate-400'}`,
    // <button>
    a08: ({ speed, v }) => `flex items-center justify-center h-6 whitespace-nowrap border text-[10px] gothic-num font-bold px-1.5 rounded-md shadow-sm active:scale-95 ${speed === v ? 'bg-sky-500/25 border-sky-400/80 text-sky-200' : 'bg-slate-800/90 border-slate-500/50 text-slate-400'}`,
    // <button> 「規則」
    a09: "flex items-center justify-center h-6 gap-1 whitespace-nowrap bg-slate-800/90 border border-amber-500/40 text-amber-300 text-[11px] px-2 rounded-md shadow-sm active:scale-95",
    // <i> icon:book-open
    a10: "fa-solid fa-book-open text-amber-400 text-[10px]",
    // <span> 「規則」
    a11: "font-bold text-[10px]",
    // <button> 「紀錄」
    a12: "flex items-center justify-center h-6 gap-1 whitespace-nowrap bg-slate-800/90 border border-purple-500/40 text-purple-300 text-[11px] px-2 rounded-md shadow-sm active:scale-95",
    // <i> icon:clock-rotate-left
    a13: "fa-solid fa-clock-rotate-left text-purple-400 text-[10px]",
    // <span> 「紀錄」
    a14: "font-bold text-[10px]",
  },

  // ═══════════════ B 區｜動態區 ═══════════════
  B: {
    // <div>
    b01: "gufeng shrink-0 px-2 py-1 z-[70]",
    // <div>
    b02: ({ broadcastEvent }) => `w-full bg-slate-900/75 border px-2 py-1 rounded-lg shadow flex items-stretch gap-1.5 min-h-[36px] ${broadcastEvent ? (broadcastEvent.type === 'out' ? 'event-out' : 'event-revive') : 'border-emerald-500/50'}`,
    // <div>
    b03: "flex-1 min-w-0 flex flex-col justify-center",
    // <div>
    b04: "flex items-center space-x-1.5 overflow-hidden",
    // <span>
    b05: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0",
    // <span>
    b06: "text-[11px] font-black text-emerald-300 truncate tracking-wide",
    // <RichLog>  [nameClass]
    b07: "text-amber-300",
    // <span>
    b08: "ml-auto shrink-0 text-[9px] font-bold text-sky-300",
    // <i> icon:lock
    b09: "fa-solid fa-lock mr-0.5",
    // <span>
    b10: ({ broadcastEvent }) => `ml-auto shrink-0 flex items-center text-[9px] font-black ${broadcastEvent.type === 'out' ? 'text-rose-300' : 'text-emerald-300'}`,
    // <span>
    b11: ({ broadcastEvent }) => `inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse ${broadcastEvent.type === 'out' ? 'bg-rose-400' : 'bg-emerald-400'}`,
    // <div>
    b12: "text-[10px] font-bold text-amber-300 truncate pl-3.5 mt-0.5",
    // <RichLog>  [nameClass]
    b13: "text-amber-300",
    // <span>
    b14: "text-fuchsia-300 ml-1",
    // <i> icon:eye
    b15: "fa-solid fa-eye mr-0.5",
    // <RichLog>  [nameClass]
    b16: "text-fuchsia-100",
    // <button> 「播放此動態動畫」
    b17: "shrink-0 self-center flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/60 text-sky-300 active:scale-95",
    // <i> icon:play
    b18: "fa-solid fa-play text-[11px]",
  },

  // ═══════════════ C 區｜牌庫數目區 ═══════════════
  C: {
    // <div>
    c01: "gufeng shrink-0 px-2 py-1 flex items-center justify-between gap-1 z-[70]",
    // <div>
    c02: "flex items-center space-x-1 bg-slate-900/90 border border-amber-500/40 px-2 py-0.5 rounded-full text-[9.5px] shadow",
    // <i> icon:moon
    c03: "fa-solid fa-moon text-amber-400",
    // <span> 「月亮」
    c04: "text-slate-400",
    // <span>
    c05: "gothic-num text-amber-400 font-bold",
    // <div>
    c06: "flex items-center space-x-1",
    // <div>
    c07: "flex items-center justify-center h-[22px] space-x-1 bg-slate-900/90 border border-cyan-500/40 px-2 rounded-full text-[9.5px] shadow",
    // <i> icon:box-archive
    c08: "fa-solid fa-box-archive text-cyan-400",
    // <span> 「備用」
    c09: "font-bold text-cyan-300",
    // <span>
    c10: "gothic-num text-cyan-400",
    // <button> 「暗牌」
    c11: "flex items-center justify-center h-[22px] space-x-1 bg-slate-900/90 border border-amber-500/50 hover:border-amber-400 px-2 rounded-full text-[9.5px] shadow active:scale-95 transition-all cursor-pointer",
    // <i> icon:eye
    c12: "fa-solid fa-eye text-amber-400",
    // <span> 「暗牌」
    c13: "font-bold text-amber-300",
    // <span>
    c14: "gothic-num text-amber-400",
    // <button> 「牌庫」
    c15: "flex items-center justify-center h-[22px] space-x-1 bg-slate-900/90 border border-amber-500/50 hover:border-amber-400 px-2 rounded-full text-[9.5px] shadow active:scale-95 transition-all cursor-pointer",
    // <i> icon:layer-group
    c16: "fa-solid fa-layer-group text-amber-400",
    // <span> 「牌庫」
    c17: "font-bold text-amber-300",
    // <span>
    c18: "gothic-num text-amber-400",
  },

  // ═══════════════ D 區｜其他玩家 ═══════════════
  D: {
    // <section> 「出局';」
    d01: "gufeng shrink-0 px-1 py-0.5 flex items-center overflow-hidden gap-1",
    // <div>
    d02: ({ isDead, isTurn }) => `player-box min-w-0 basis-0 flex-1 bg-slate-800/70 rounded-lg px-0.5 pt-0.5 pb-1.5 flex flex-col items-center justify-center relative transition-all duration-300 ${
                            isTurn ? 'border-2 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.65)] scale-[1.02]' : 'border border-slate-700/60 opacity-85'
                          } ${isDead ? 'grayscale opacity-30' : ''}`,
    // <div>
    d03: "w-full h-[10px] shrink-0 flex flex-nowrap items-center justify-center gap-[2px] overflow-hidden whitespace-nowrap text-[7px] leading-none font-bold",
    // <span>
    d04: "flex items-center gap-px text-amber-300",
    // <i> icon:moon
    d05: "fa-solid fa-moon",
    // <span> 「生效中」
    d06: "flex items-center text-emerald-300",
    // <i> icon:bolt
    d07: "fa-solid fa-bolt",
    // <span>
    d08: "text-cyan-300",
    // <i> icon:shield-halved
    d09: "fa-solid fa-shield-halved",
    // <span>
    d10: "text-purple-300",
    // <i> icon:wand-magic-sparkles
    d11: "fa-solid fa-wand-magic-sparkles",
    // <span>
    d12: "text-pink-300",
    // <i> icon:hat-wizard
    d13: "fa-solid fa-hat-wizard",
    // <div>
    d14: ({ player }) => `w-6 h-6 shrink-0 rounded-full bg-gradient-to-tr ${player.gradient} p-0.5 shadow`,
    // <img>
    d15: "w-full h-full rounded-full bg-slate-900 object-cover",
    // <span>
    d16: ({ isTurn }) => `text-[9px] truncate w-full text-center leading-none mt-0.5 mb-0.5 ${isTurn ? 'font-black text-emerald-300' : 'font-bold text-slate-200'}`,
  },

  // ═══════════════ E 區｜面前區（對手面前牌／出牌動畫區／自己面前牌） ═══════════════
  E: {
    // <main>
    e01: "gufeng flex-1 min-h-0 px-1.5 pt-0 pb-0.5 flex flex-col relative overflow-hidden",
    // <div>
    e02: "absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none",

    // ── 拖曳手牌時的放開區提示 ──
    // <div>
    e03: ({ dragGhost }) => `absolute inset-1 rounded-xl border-2 border-dashed pointer-events-none z-30 flex items-center justify-center transition ${dragGhost.over ? 'border-emerald-400 bg-emerald-500/10' : 'border-amber-400/60 bg-amber-500/5'}`,
    // <span>
    e04: "text-xs font-black text-amber-200 bg-slate-950/80 px-3 py-1 rounded-full",

    // ── E 上：其他玩家面前的牌（對齊 D：左＝下家 … 右＝上家；數值+名稱；最新一張較完整顯示） ──
    // <div> 「字級對齊中間出牌卡（title text-[9px]、數值 text-[10px]）；無牌不顯示「—」」
    e05: "relative z-10 w-full flex gap-1 shrink-0 mb-0.5 items-start",
    // <div>
    e06: "min-w-0 basis-0 flex-1 flex flex-col items-center",
    // <div>
    e07: "relative w-full max-w-[66px] mx-auto",
    // <button>
    e08: ({ borderCls }) => `absolute left-1/2 -translate-x-1/2 front-card-bg bg-slate-900 shadow flex flex-col items-center justify-center px-0.5 py-0.5 active:scale-95 ${borderCls}`,
    // <span>
    e09: "gothic-num font-black text-amber-300 text-[10px] leading-none tabular-nums",
    // <i> icon:circle
    e10: ({ c }) => `fa-solid ${c.icon || 'fa-circle'} text-amber-400 text-[11px] my-0.5`,
    // <span>
    e11: "text-[9px] font-black text-amber-100 leading-none text-center truncate w-full px-0.5",
    // <button>
    e12: ({ borderCls }) => `absolute left-1/2 -translate-x-1/2 w-full front-card-top bg-slate-900 shadow flex items-start active:scale-95 ${borderCls}`,
    // <span>
    e13: "w-[20px] shrink-0 text-center gothic-num font-black text-amber-300 text-[10px] leading-none pt-0.5 tabular-nums",
    // <span>
    e14: "flex-1 min-w-0 text-center font-black text-amber-100 text-[9px] leading-none pt-0.5 truncate pr-0.5",

    // ── E 中：本回合打出／攤牌／等待 ──
    // <div>
    e15: "w-full flex-1 min-h-0 flex items-center justify-center relative z-10",
    // <div>
    e16: "absolute inset-x-0 top-7 bottom-0 overflow-y-auto scrollbar-none px-0.5 space-y-1.5 text-[10px]",
    // <div>
    e17: "flex items-center justify-between",
    // <span>
    e18: "font-black text-amber-300 text-[11px]",
    // <i> icon:eye
    e19: "fa-solid fa-eye mr-1",
    // <button> 「查看結算」
    e20: "text-[9.5px] font-bold text-purple-300 bg-slate-900/90 border border-purple-500/40 px-2 py-0.5 rounded-full active:scale-95",
    // <div> 「出局';」
    e21: "space-y-1",
    // <div>
    e22: ({ isWin }) => `flex items-center justify-between gap-1 rounded-lg border px-1.5 py-1 ${isWin ? 'border-amber-400/70 bg-amber-500/10' : 'border-slate-700 bg-slate-900/70'}`,
    // <span>
    e23: "flex items-center gap-1 shrink-0",
    // <Avatar>  [size]
    e24: "w-5 h-5",
    // <span>
    e25: ({ humanPlayerId, p }) => `truncate ${p.id === humanPlayerId ? 'text-sky-300 font-black' : 'text-slate-200 font-bold'}`,
    // <span> 「出局」
    e26: "text-[9px] font-black text-rose-300 border border-rose-500/50 rounded px-1",
    // <span>
    e27: "flex flex-wrap gap-1 justify-end",
    // <span>
    e28: "text-slate-500",
    // <div>
    e29: "rounded-lg border border-amber-500/30 bg-slate-900/70 px-1.5 py-1",
    // <div> 「中央暗牌」
    e30: "text-[9.5px] font-black text-amber-300 mb-1",
    // <div>
    e31: "flex flex-wrap gap-x-2 gap-y-1",
    // <span>
    e32: "flex items-center gap-1",
    // <span> 「暗牌」
    e33: "text-slate-400",
    // <div>
    e34: "rounded-lg border border-cyan-500/30 bg-slate-900/70 px-1.5 py-1",
    // <div> 「備用牌堆」
    e35: "text-[9.5px] font-black text-cyan-300 mb-1",
    // <div>
    e36: "flex flex-wrap gap-x-2 gap-y-1",
    // <span>
    e37: "flex items-center gap-1",
    // <span> 「備用」
    e38: "text-slate-400",
    // <button> 「月」
    e39: "relative w-[66px] h-[88px] front-card-bg bg-slate-900 shadow overflow-hidden active:scale-95 animate-card-play select-none",
    // <div>
    e40: "h-full px-0.5 py-0.5 flex flex-col items-center justify-center gap-0.5",
    // <div>
    e41: "flex items-start justify-between gap-0.5",
    // <span>
    e42: "gothic-num font-black text-amber-300 text-[10px] leading-none",
    // <span> 「月」
    e43: "text-[8px] text-amber-300 font-bold",
    // <div>
    e44: "flex-1 flex items-center justify-center",
    // <i> icon:circle
    e45: ({ c }) => `fa-solid ${c.icon || 'fa-circle'} text-amber-400 text-[11px]`,
    // <div>
    e46: "text-center",
    // <div>
    e47: "text-[9px] font-black text-amber-100 leading-none text-center truncate w-full",
    // <div>
    e48: "text-[8px] text-slate-400 truncate",
    // <div>
    e49: "text-slate-600 text-xs flex flex-col items-center",
    // <i> icon:wolf-pack-battalion
    e50: "fa-solid fa-wolf-pack-battalion text-4xl mb-2 opacity-30",

    // ── E 下：自己面前的牌（由左至右完整顯示、少少重疊；最新在最右且最頂） ──
    // <div>
    e51: "shrink-0 h-1",
    // <div>
    e52: "relative z-10 w-full shrink-0 flex justify-center py-1 px-1",
    // <div>
    e53: "relative",
    // <button>
    e54: ({ active }) => `absolute top-0 front-card-bg bg-slate-900 shadow flex flex-col items-center justify-center px-0.5 py-0.5 active:scale-95 ${active ? 'front-card-active' : ''}`,
    // <span>
    e55: "gothic-num font-black text-amber-300 text-[10px] leading-none",
    // <i> icon:circle
    e56: ({ c }) => `fa-solid ${c.icon || 'fa-circle'} text-amber-400 text-[11px] my-0.5`,
    // <span>
    e57: "text-[9px] font-black text-amber-100 leading-none text-center truncate w-full",

    // ── 點面前的牌：完整檢視（數值／圖示／名稱／說明） ──
    // <div>
    e58: "fixed inset-0 z-[120] flex items-center justify-center bg-black/55",
    // <div>
    e59: "card-bg relative w-[130px] h-[173px] bg-slate-900 p-2 flex flex-col justify-between shadow-2xl animate-arena-focus",
    // <div>
    e60: "contents",
    // <span>
    e61: "cd-num text-white text-base font-black leading-none gothic-num [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <span>
    e62: "absolute right-[14%] top-[16%] text-[10px] font-bold text-amber-300 [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <div>
    e63: "cd-icon",
    // <i> icon:circle
    e64: ({ arenaFocus }) => `fa-solid ${arenaFocus.icon || 'fa-circle'} text-4xl text-amber-400/85`,
    // <div>
    e65: "cd-title",
    // <h3>
    e66: "text-[11px] font-black text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <p>
    e67: "w-full text-center text-[8px] leading-[1.2] text-slate-200 line-clamp-4 [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <div>
    e68: "absolute left-0 right-0 top-full mt-2 flex justify-center items-center gap-2 text-[11px] [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <span>
    e69: "text-amber-400 font-bold",
    // <span>
    e70: "text-slate-200 font-black",
    // <button>
    e72: "cd-desc",
    e71: "absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-xs font-black",

    // ── 面前牌堆邊框（原本在 JSX 內的 borderCls）──
    stackBorder: (active) => active ? 'front-card-active' : '',
  },

  // ═══════════════ F 區｜手牌區 ═══════════════
  F: {
    // <footer>
    f01: "gufeng h-[30%] min-h-[210px] p-2 relative shrink-0 flex items-center justify-center",
    // <div>
    f02: "absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90",
    // <button>
    f03: "flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-base font-black px-8 py-3 rounded-2xl shadow-lg active:scale-95 animate-pulse disabled:cursor-not-allowed disabled:opacity-60",
    // <i> icon:forward-step
    f04: "fa-solid fa-forward-step",

    // ── F區左上：自己的頭像與狀態 ──
    // <div>
    f05: ({ isDead, isTurn }) => `absolute left-1.5 top-1.5 z-20 flex items-center gap-1.5 rounded-lg px-1.5 py-1 bg-slate-800/90 border transition-all ${
                            isTurn ? 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.65)]' : 'border-slate-600/70'
                          } ${isDead ? 'grayscale opacity-40' : ''}`,
    // <div>
    f06: ({ me }) => `w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr ${me.gradient} p-0.5 shadow`,
    // <img>
    f07: "w-full h-full rounded-full bg-slate-900 object-cover",
    // <div>
    f08: "min-w-0 flex flex-col gap-0.5",
    // <span>
    f09: ({ isTurn }) => `text-[10px] font-black leading-none ${isTurn ? 'text-emerald-300' : 'text-sky-300'}`,
    // <div>
    f10: "flex flex-nowrap items-center gap-[3px] overflow-hidden whitespace-nowrap text-[8px] leading-none font-bold",
    // <span>
    f11: "flex items-center gap-px text-amber-300",
    // <i> icon:moon
    f12: "fa-solid fa-moon",
    // <span>
    f13: "flex items-center text-emerald-300",
    // <i> icon:bolt
    f14: "fa-solid fa-bolt",
    // <span>
    f15: "text-cyan-300",
    // <i> icon:shield-halved
    f16: "fa-solid fa-shield-halved",
    // <span>
    f17: "text-purple-300",
    // <i> icon:wand-magic-sparkles
    f18: "fa-solid fa-wand-magic-sparkles",
    // <span>
    f19: "text-pink-300",
    // <i> icon:hat-wizard
    f20: "fa-solid fa-hat-wizard",

    // ── 拖曳提示（浮在 F 區上緣，不影響版面） ──
    // <div>
    f21: "absolute -top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-[10px] font-bold text-amber-300 bg-slate-950/80 border border-amber-500/40 px-2.5 py-0.5 rounded-full animate-pulse whitespace-nowrap",
    // <i> icon:hand-point-up
    f22: "fa-solid fa-hand-point-up mr-1",

    // ── F區左下：先知看過的玩家與牌（目標之後換過手牌則變淡並標「舊資訊」） ──
    // <div>
    f23: ({ stale }) => `absolute left-1.5 bottom-1.5 z-30 flex flex-col items-center gap-0.5 pointer-events-none ${stale ? 'opacity-50' : ''}`,
    // <span>
    f24: "text-[7px] leading-none font-black text-sky-300",
    // <i> icon:eye
    f25: "fa-solid fa-eye mr-0.5",
    // <FxChip>  [size]
    f26: "w-7 h-7 text-sm",
    // <div>
    f27: "w-9 h-[50px] shrink-0 overflow-hidden rounded-md border-2 border-cyan-500/80 bg-slate-900 flex flex-col items-center justify-center shadow",
    // <span>
    f28: "gothic-num font-black text-amber-300 text-[11px] leading-none",
    // <i> icon:circle
    f29: ({ c }) => `fa-solid ${c.icon || 'fa-circle'} text-cyan-400 text-[11px] my-0.5`,
    // <span>
    f30: "text-[7px] font-black text-slate-100 leading-none whitespace-nowrap",

    // ── F區左下（先知上方）：醉漢檢視過的在場手牌（洗牌後換過手牌則變淡並標「舊資訊」） ──
    // <div>
    f31: "absolute left-1.5 z-30 flex flex-col items-start gap-0.5 pointer-events-none",
    // <span> 「醉漢看過」
    f32: "text-[7px] leading-none font-black text-violet-300",
    // <div>
    f33: ({ stale }) => `flex items-center gap-0.5 bg-slate-900/80 border border-violet-500/50 rounded pr-1 ${stale ? 'opacity-50' : ''}`,
    // <FxChip>  [size]
    f34: "w-4 h-4 text-[9px]",
    // <span>
    f35: "gothic-num font-black text-amber-300 text-[8px] leading-none",
    // <span>
    f36: "text-[7px] font-black text-slate-100 leading-none whitespace-nowrap",

    // ── 手牌區：絕對水平居中 ──
    // <div>
    f37: "absolute inset-0 flex items-center justify-center px-4 pointer-events-none",
    // <div>
    f38: "flex space-x-3 items-center justify-center h-full pointer-events-auto",
    // <div>
    f39: ({ card, dragGhost, drawAnim, isSelected }) => `hand-card card-bg relative w-[130px] h-[173px] bg-slate-900 p-2 flex flex-col justify-between shrink-0 cursor-grab active:cursor-grabbing touch-none select-none ${dragGhost && dragGhost.card.id === card.id ? 'opacity-30' : ''} ${drawAnim && drawAnim.card && drawAnim.card.id === card.id ? 'opacity-0' : ''} ${
                                  isSelected ? 'selected' : ''
                                }`,
    // <div>
    f40: "cd-num",
    // <span>
    f41: ({ isSelected }) => `text-white text-base font-black leading-none gothic-num [text-shadow:0_1px_3px_rgba(0,0,0,.9)]`,
    // <div>
    f42: "cd-icon",
    // <i>
    f43: ({ card }) => `fa-solid ${card.icon} text-4xl text-cyan-400 filter drop-shadow`,
    // <div>
    f44: "cd-desc",
    // <div>
    f45: "cd-title text-[11px] font-black text-slate-100 tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <div>
    f46: "w-full text-center text-[8px] leading-[1.2] text-slate-200 line-clamp-4 [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <div> 「無手牌」
    f47: "text-slate-500 text-xs",

    // ── 抽牌小動畫：牌背飛入 ➔ 翻面 ➔ 短暫放大 ➔ 歸位（只有玩家自己抽牌才播；AI 抽牌不公開） ──
    // <div>
    f48: "absolute inset-0 z-[35] flex items-center justify-center pointer-events-none",
    // <div>
    f49: "relative w-[130px] h-[173px]",
    // <div>
    f50: "absolute inset-0",
    // <div>
    f51: "card-back w-full h-full shadow-xl",
    // <i> icon:moon
    f52: "hidden",
    // <div>
    f53: "absolute inset-0",
    // <div>
    f54: "card-bg relative w-full h-full bg-slate-900 p-2 flex flex-col justify-between",
    // <div>
    f55: "cd-num",
    // <span>
    f56: "text-white text-base font-black leading-none gothic-num [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <div>
    f57: "cd-icon",
    // <i>
    f58: ({ c }) => `fa-solid ${c.icon} text-4xl text-cyan-400 filter drop-shadow`,
    // <div>
    f59: "cd-desc",
    // <div>
    f60: "cd-title text-[11px] font-black text-slate-100 tracking-wide [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",
    // <div>
    f61: "w-full text-center text-[8px] leading-[1.2] text-slate-200 line-clamp-4 [text-shadow:0_1px_3px_rgba(0,0,0,.9)]",

    // ── 右側浮動操作按鈕 ──
    // <div>
    f62: ({ myHand }) => `absolute right-2 top-1/2 -translate-y-1/2 w-[16%] max-w-[70px] h-[90%] flex flex-col justify-center space-y-2 z-20 p-1 ${myHand.length === 1 ? '' : 'hidden'}`,
    // <button> 「抽備用牌' : '抽一打一'」
    f63: "w-full group relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 rounded-xl py-2 px-1 transition-all duration-300 active:scale-95 shadow-md flex flex-col items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed",
    // <div>
    f64: "w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mb-0.5 border border-emerald-400/40",
    // <i> icon:plus
    f65: "fa-solid fa-plus text-[10px] text-emerald-400",
    // <span>
    f66: "text-[9.5px] font-black text-emerald-200",
    // <button> 「拿一還一」
    f67: "w-full group relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950/40 border border-blue-500/40 hover:border-blue-400 text-blue-300 rounded-xl py-2 px-1 transition-all duration-300 active:scale-95 shadow-md flex flex-col items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed",
    // <div>
    f68: "w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mb-0.5 border border-blue-400/40",
    // <i> icon:hand-pointer
    f69: "fa-solid fa-hand-pointer text-[10px] text-blue-400",
    // <span> 「拿一還一」
    f70: "text-[9.5px] font-black text-blue-200",
  },
  };

  // ═══════════════ 玩家頭像（本地 icon1.jpg～icon6.jpg；id0→icon1 … id5→icon6）═══════════════
  // 圖檔放在 index.html 同一資料夾；建議 1:1（正方形）256×256 或 512×512
  window.AVATAR_URL = (id) => {
    const n = ((Number(id) % 6) + 6) % 6 + 1; // 0→1 … 5→6
    return 'icon' + n + '.jpg';
  };

  window.UI = UI;
})();
