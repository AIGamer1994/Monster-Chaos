"use strict";
/* =====================================================================
 * fx-finale.js — 全屏終局動畫（月亮升起／狼月咬鏡頭／吸血鬼降臨）
 *
 * 內容：
 *   1. 這三段動畫專用的 @keyframes / CSS（載入時自動注入 <head>）
 *   2. FxFinale.moonWolf(ctx)  ← kind === 'moon' | 'wolfbite'（月亮升起、狼月咬鏡頭）
 *   3. FxFinale.vampire(ctx)   ← kind === 'vampire'（吸血鬼降臨）
 *
 * 載入方式（index.html，必須放在主程式 <script type="text/babel"> 之前）：
 *   <script type="text/babel" src="fx-finale.js"></script>
 *
 * 注意：此檔含 JSX，由 Babel Standalone 以 XHR 讀取，請用 http(s) 開啟
 *       （Vercel／npx serve／python -m http.server），不要直接雙擊 file://。
 *
 * ctx 由 index.html 的 FxOverlay 傳入（本檔不直接依賴主程式的區域變數）：
 *   fx       目前動畫物件（phase / wolf / wolfWinner / traitorWinner / highCards …）
 *   kind     'moon' | 'wolfbite'（僅 moonWolf 使用）
 *   card     動畫牌面資料
 *   src      出牌者（玩家物件）
 *   an       (name, dur, delay, ease) => style，產生 animation 樣式的小工具
 *   FxChip   玩家頭像小元件
 *   Avatar   玩家頭像元件（vampire 使用）
 *   localPlayerId  本機玩家 id（vampire 用來標示「自己」）
 * ===================================================================== */
(function () {
    'use strict';
    // ---- 專用 CSS（原本在 index.html <style> 內）-------------------------
    const FX_FINALE_CSS = `
  @keyframes fxMoonRise { 0% { transform: translateY(150px) scale(.8); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
  @keyframes fxRedPulse { 0% { opacity: .35; } 100% { opacity: 1; } }
  /* 狼月降臨：咬向鏡頭演出 */
  @keyframes fxFlashW { 0% { opacity: .6; } 100% { opacity: 0; } }
  @keyframes fxJawOpenT { 0% { transform: translateY(-110%); } 100% { transform: translateY(-60%); } }
  @keyframes fxJawOpenB { 0% { transform: translateY(110%); } 100% { transform: translateY(60%); } }
  @keyframes fxJawSlamT { 0% { transform: translateY(-60%); } 100% { transform: translateY(0); } }
  @keyframes fxJawSlamB { 0% { transform: translateY(60%); } 100% { transform: translateY(0); } }
  @keyframes fxFlood { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }

  /* 吸血鬼降臨：黃月＋黑城堡 ➔ 蝙蝠群 ➔ 血潮 ➔ 展翅結尾 */
  @keyframes vpMoonRise { 0% { transform: translateY(190px) scale(.6); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
  @keyframes vpFlap { 0% { transform: scaleY(1); } 100% { transform: scaleY(.35); } }
  @keyframes vpBatFly {
    0% { opacity: 0; transform: translate(0, 0) scale(.2); }
    12% { opacity: 1; }
    55% { transform: translate(calc(var(--ex) * .55), calc(var(--ey) * .4 - 20px)) scale(calc(var(--s) * .8)); }
    100% { opacity: 1; transform: translate(var(--ex), var(--ey)) scale(var(--s)); }
  }
  @keyframes vpFlood { 0% { transform: translateY(-100%); } 100% { transform: translateY(-6%); } }
  @keyframes vpTitle {
    0% { opacity: 0; transform: scale(1.7); letter-spacing: .6em; filter: blur(8px); }
    100% { opacity: 1; transform: scale(1); letter-spacing: .18em; filter: blur(0); }
  }
  @keyframes vpWing { 0% { transform: scaleX(0); opacity: 0; } 100% { transform: scaleX(1); opacity: 1; } }
  @keyframes vpAvaGlow { 0% { box-shadow: 0 0 0 3px rgba(244,63,94,.3), 0 0 16px 3px rgba(244,63,94,.7); } 100% { box-shadow: 0 0 0 5px rgba(244,63,94,.5), 0 0 30px 8px rgba(244,63,94,1); } }
  @keyframes vpDrop { 0% { transform: translateY(0); opacity: 0; } 8% { opacity: .95; } 100% { transform: translateY(380px); opacity: .9; } }
  .vp-bat-svg { width: 100%; height: 100%; fill: #000; stroke: #fbbf24; stroke-width: 1.1; animation: vpFlap .13s ease-in-out infinite alternate; transform-origin: 50% 60%; filter: drop-shadow(0 0 4px rgba(251,191,36,.9)); }
  `;
    if (!document.getElementById('fx-finale-css')) {
        const st = document.createElement('style');
        st.id = 'fx-finale-css';
        st.textContent = FX_FINALE_CSS;
        document.head.appendChild(st);
    }
    // ---- 月亮升起（第 1～3 張月亮）＋ 狼月降臨（皆用 9:16 影片）----------
    // 彎.mp4 / 半.mp4 / 滿.mp4 / 狼.mp4（進遊戲後預載，見 index.html FINALE_VIDEOS）
    function moonWolf({ fx, kind, card, src, an, FxChip }) {
        const bite = kind === 'wolfbite';
        const ph = fx.phase || 1;
        const red = ph >= 3 || bite;
        const held = bite || (red && fx.wolf === 'held');
        const mnames = ['孤狼月亮', '嘯狼月亮', '狼人月亮'];
        const map = (window.FINALE_VIDEOS) || {};
        // 選片：狼月勝利／咬鏡頭 → 狼.mp4；否則依相位 彎／半／滿
        let videoSrc;
        let videoKey;
        if (held) {
            videoSrc = map.wolf || 'video/狼.mp4';
            videoKey = 'wolf';
        } else if (ph >= 3) {
            videoSrc = map.full || 'video/滿.mp4';
            videoKey = 'full';
        } else if (ph === 2) {
            videoSrc = map.half || 'video/半.mp4';
            videoKey = 'half';
        } else {
            videoSrc = map.crescent || 'video/彎.mp4';
            videoKey = 'crescent';
        }
        const wp = fx.wolfWinner, tp = fx.traitorWinner;

        const titleBlock = React.createElement("div", { className: "absolute top-[9%] inset-x-0 text-center z-10 pointer-events-none", style: an('fxFadeUp', 0.5, 0.1) },
            React.createElement("div", { className: "text-xs text-slate-300 font-bold mb-1", style: { textShadow: '0 1px 4px rgba(0,0,0,.9)' } },
                src ? src.name : '',
                " ",
                bite ? '手握【狼人】' : '翻開了'),
            React.createElement("div", { className: `text-xl font-black tracking-widest ${red ? 'text-rose-300' : 'text-amber-200'}`, style: { textShadow: '0 2px 8px rgba(0,0,0,.85)' } },
                held ? '狼月降臨' : (mnames[ph - 1] || (card && card.title))));

        const phaseBlock = React.createElement("div", { className: "absolute bottom-14 inset-x-0 flex flex-col items-center gap-1 z-10 pointer-events-none", style: an('fxPop', 0.4, held ? 0.6 : 1.2) },
            React.createElement("div", { className: "flex gap-1.5" }, [1, 2, 3].map(i => React.createElement("i", { key: i, className: `fa-solid fa-moon text-sm ${i <= ph ? (red ? 'text-rose-300' : 'text-amber-300') : 'text-slate-600'}`, style: { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.9))' } }))),
            React.createElement("div", { className: `text-[10px] font-black ${red ? 'text-rose-200' : 'text-slate-200'}`, style: { textShadow: '0 1px 4px rgba(0,0,0,.9)' } },
                "\u6708\u4EAE ",
                ph,
                "/3",
                held ? '・狼月降臨' : (red ? (fx.wolf === 'out' ? '・狼人已被淘汰，無人掌控狼月' : '・無人手握狼人') : '')));

        // 狼月獲勝者疊層（影片播一段後再出現）
        const winOverlay = held ? React.createElement("div", {
            className: "absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none",
            style: an('fxPop', 0.5, 5.0),
        },
            React.createElement("div", { className: "text-lg font-black tracking-[0.3em] text-rose-300", style: { textShadow: '0 0 14px rgba(239,68,68,.9)' } }, "\u72FC\u6708\u964D\u81E8"),
            wp && React.createElement(FxChip, { p: wp, size: "w-14 h-14 text-2xl", glow: "ring-4 ring-rose-500/80" }),
            React.createElement("div", { className: "text-sm font-black text-rose-200", style: { textShadow: '0 1px 4px rgba(0,0,0,.9)' } },
                "\uD83D\uDC3A ",
                wp ? wp.name : '狼人',
                " \u7372\u52DD"),
            tp && React.createElement("div", { className: "text-[11px] font-black text-fuchsia-300", style: { textShadow: '0 1px 4px rgba(0,0,0,.9)' } },
                "\u53DB\u5F92\u3010",
                tp.name,
                "\u3011\u5171\u540C\u7372\u52DD")) : null;

        // 9:16 影片本體（外層 FxOverlay 已有 9:16 框；此處填滿該框）
        return React.createElement("div", { className: "relative w-full h-full overflow-hidden bg-black" },
            React.createElement("video", {
                key: videoKey + '-' + (fx.key || ''),
                className: "absolute inset-0 w-full h-full object-cover",
                src: videoSrc,
                autoPlay: true,
                muted: true,
                playsInline: true,
                preload: "auto",
                onLoadedData: (e) => { try { e.currentTarget.play && e.currentTarget.play().catch(() => {}); } catch (err) {} },
                onCanPlay: (e) => { try { e.currentTarget.play && e.currentTarget.play().catch(() => {}); } catch (err) {} },
                'aria-hidden': true,
            }),
            React.createElement("div", { className: "absolute inset-x-0 bottom-0 h-28 pointer-events-none", style: { background: 'linear-gradient(transparent, rgba(0,0,0,.65))' } }),
            React.createElement("div", { className: "absolute inset-x-0 top-0 h-24 pointer-events-none", style: { background: 'linear-gradient(rgba(0,0,0,.45), transparent)' } }),
            titleBlock,
            phaseBlock,
            winOverlay);
    }
    // ---- 吸血鬼降臨 --------------------------------------------------------
    function vampire({ fx, src, an, Avatar, localPlayerId }) {
        let body = null;
        // 吸血鬼降臨：黃月＋黑色城堡剪影 ➔ 蝙蝠群飛散 ➔ 血潮淹沒 ➔ 頭像兩旁展翅、標題與獲勝者
        const vp = src;
        const hi = fx.highCards || [];
        const batPath = 'M0 -2 C-5 -10 -18 -11 -28 -3 C-21 -3 -17 1 -14 8 C-10 3 -5 3 0 9 C5 3 10 3 14 8 C17 1 21 -3 28 -3 C18 -11 5 -10 0 -2 Z';
        const bats = [
            [-135, -40, 1.2, 1.2, 2.2], [120, -65, 1.0, 1.25, 2.15], [-105, 30, .9, 1.35, 2.3], [135, 15, 1.3, 1.4, 2.1],
            [-45, -120, .9, 1.45, 2.25], [55, -105, 1.1, 1.5, 2.1], [-150, 80, .8, 1.55, 2.3], [150, 65, .85, 1.6, 2.2],
            [-15, -80, 1.5, 1.65, 2.0], [20, 85, .7, 1.7, 2.2], [-85, -85, .9, 1.75, 2.1], [100, -20, 1.0, 1.8, 2.15],
        ];
        const wingPath = 'M110 50 C90 16 50 5 4 18 C24 22 34 32 38 44 C28 42 18 44 10 52 C26 54 36 62 40 74 C34 74 26 78 20 86 C38 86 54 88 70 98 C82 80 96 66 110 60 Z';
        const wingStyle = (origin) => ({ width: 80, height: 72, flex: 'none', fill: '#0b0204', stroke: '#ef4444', strokeWidth: 1.6, filter: 'drop-shadow(0 0 8px rgba(239,68,68,.75))', transformOrigin: origin, animation: 'vpWing .8s cubic-bezier(.2,.9,.3,1.15) 4.4s both' });
        body = (React.createElement("div", { className: "relative w-full h-full overflow-hidden", style: { background: 'linear-gradient(#070b22 0%,#141235 50%,#3a2a52 100%)' } },
            React.createElement("div", { className: "absolute", style: { left: '50%', top: 100, width: 112, height: 112, marginLeft: -56, borderRadius: '50%', background: 'radial-gradient(circle at 38% 34%,#fffbeb 0%,#fde68a 40%,#fbbf24 78%,#d97706 100%)', boxShadow: '0 0 40px 10px rgba(251,191,36,.55), 0 0 100px 30px rgba(251,191,36,.25)', animation: 'vpMoonRise 1.6s cubic-bezier(.2,.8,.3,1) .1s both' } }),
            React.createElement("svg", { className: "absolute bottom-0 left-0 w-full", style: { height: '26%' }, viewBox: "0 0 360 210", preserveAspectRatio: "none" },
                React.createElement("path", { fill: "#000", d: "M0 210 V120 L22 120 L22 96 L30 80 L38 96 L38 124 L62 124 L62 104 L82 104 L82 70 L88 52 L94 70 L94 104 L118 104 L118 130 L150 130 L150 90 L160 56 L168 30 L176 56 L186 90 L186 126 L214 126 L214 98 L236 98 L236 66 L244 46 L252 66 L252 98 L276 98 L276 122 L304 122 L304 100 L322 84 L340 100 L340 124 L360 124 V210 Z" })),
            React.createElement("div", { className: "absolute inset-0 pointer-events-none", style: { animation: 'fxOut .5s linear 3.0s both' } }, bats.map(([x, y, sc, t, d], i) => (React.createElement("div", { key: i, className: "absolute", style: { left: '50%', top: 170, width: 62, height: 25, margin: '-12px 0 0 -31px', '--ex': `${x}px`, '--ey': `${y}px`, '--s': sc, animation: `vpBatFly ${d}s cubic-bezier(.3,.1,.5,1) ${t}s both` } },
                React.createElement("svg", { className: "vp-bat-svg", viewBox: "-30 -12 60 24" },
                    React.createElement("path", { d: batPath })))))),
            React.createElement("div", { className: "absolute left-0 right-0 top-0", style: { height: '112%', transform: 'translateY(-100%)', background: 'linear-gradient(#7f1d1d 0%,#991b1b 35%,#450a0a 100%)', animation: 'vpFlood 1.05s cubic-bezier(.5,.1,.3,1) 3.1s both' } },
                React.createElement("svg", { className: "absolute left-0 w-full", style: { bottom: -1, height: 44, transform: 'translateY(42px)' }, viewBox: "0 0 360 60", preserveAspectRatio: "none" },
                    React.createElement("path", { fill: "#450a0a", d: "M0 0 H360 V20 Q340 54 320 22 Q300 8 280 34 Q262 60 244 26 Q226 6 206 30 Q188 56 168 24 Q150 4 130 32 Q112 58 92 24 Q74 6 54 30 Q34 52 18 24 Q8 12 0 22 Z" }))),
            React.createElement("div", { className: "absolute inset-0 pointer-events-none", style: { background: 'radial-gradient(circle at 50% 46%, transparent 30%, rgba(0,0,0,.6) 100%)' } }),
            [[12, 4.2, 3.0], [30, 4.9, 2.6], [50, 4.4, 3.3], [68, 5.3, 2.8], [86, 4.6, 3.1]].map(([x, t, d], i) => (React.createElement("span", { key: i, className: "absolute", style: { left: `${x}%`, top: -10, width: 6, height: 10, borderRadius: '50%/65% 65% 35% 35%', background: 'linear-gradient(#ef4444,#7f1d1d)', opacity: 0, animation: `vpDrop ${d}s ease-in ${t}s infinite` } }))),
            React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center" },
                React.createElement("div", { style: { fontFamily: '"Noto Serif TC","Songti TC","PMingLiU",serif', fontWeight: 900, fontSize: 31, letterSpacing: '.18em', paddingLeft: '.18em', lineHeight: 1.1, background: 'linear-gradient(#fff1f2 0%,#fb7185 45%,#b91c1c 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: 'none', filter: 'drop-shadow(0 0 10px rgba(239,68,68,.9)) drop-shadow(0 2px 0 #450a0a)', animation: 'vpTitle .9s cubic-bezier(.2,.9,.3,1) 3.7s both' } }, "\u5438\u8840\u9B3C\u964D\u81E8"),
                React.createElement("div", { className: "flex items-center justify-center", style: { height: 76 } },
                    React.createElement("svg", { style: { ...wingStyle('100% 50%'), marginRight: -4 }, viewBox: "0 0 112 100" },
                        React.createElement("path", { d: wingPath })),
                    React.createElement("div", { style: an('fxPop', 0.5, 4.2) },
                        React.createElement("div", { className: "rounded-full", style: { animation: 'vpAvaGlow 1.2s ease-in-out 4.8s infinite alternate' } },
                            React.createElement(Avatar, { p: vp, size: "w-16 h-16" }))),
                    React.createElement("svg", { style: { ...wingStyle('0% 50%'), marginLeft: -4 }, viewBox: "0 0 112 100" },
                        React.createElement("g", { transform: "matrix(-1 0 0 1 112 0)" },
                            React.createElement("path", { d: wingPath })))),
                React.createElement("div", { className: "text-[9px] font-bold text-rose-300", style: { letterSpacing: '.5em', paddingLeft: '.5em', ...an('fxFadeUp', 0.6, 4.7) } }, "VAMPIRE ASCENDANT"),
                React.createElement("div", { className: "text-sm font-black text-rose-100", style: an('fxFadeUp', 0.6, 5.0) },
                    "\uD83E\uDE78 ",
                    React.createElement("b", { className: vp && vp.id === localPlayerId ? 'text-sky-300' : 'text-amber-200' }, vp ? vp.name : ''),
                    " \u7372\u52DD"),
                React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-1 text-[10px] text-rose-300 px-3", style: an('fxFadeUp', 0.6, 5.3) },
                    React.createElement("span", null, "\u9762\u524D\u96C6\u6EFF"),
                    hi.map((c, ci) => (React.createElement("span", { key: ci, className: "inline-flex items-center gap-0.5 rounded border border-rose-500 bg-black/45 px-1 py-px font-black text-rose-100" },
                        React.createElement("span", { className: "font-mono text-amber-200" }, c.value),
                        c.title))),
                    React.createElement("span", null,
                        "7 \u4EE5\u4E0A \u00D7",
                        hi.length)))));
        return body;
    }
    window.FxFinale = { moonWolf, vampire };
})();
