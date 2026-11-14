"use strict";
/* =====================================================================
 * fx-finale.js — 全屏終局動畫（月亮升起／狼月咬鏡頭／吸血鬼降臨）
 *
 * 內容：
 *   1. 終局動畫專用 @keyframes / CSS（載入時自動注入 <head>；舊 CSS 特效保留但不使用）
 *   2. FxFinale.moonWolf(ctx)  ← kind === 'moon' | 'wolfbite'（彎／半／滿／狼.mp4）
 *   3. FxFinale.vampire(ctx)   ← kind === 'vampire'（吸.mp4，4.5s）
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
    function moonWolf({ fx, kind, card, src, an, FxChip, Avatar }) {
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

        // 狼月／咬鏡頭不顯示頂部「手握【狼人】／狼月降臨」；一般月亮翻開仍顯示
        const titleBlock = held ? null : React.createElement("div", { className: "absolute top-[9%] inset-x-0 text-center z-10 pointer-events-none", style: an('fxFadeUp', 0.5, 0.1) },
            React.createElement("div", { className: "text-xs text-slate-300 font-bold mb-1", style: { textShadow: '0 1px 4px rgba(0,0,0,.9)' } },
                src ? src.name : '',
                " 翻開了"),
            React.createElement("div", { className: "text-xl font-black tracking-widest text-amber-200", style: { textShadow: '0 2px 8px rgba(0,0,0,.85)' } },
                mnames[ph - 1] || (card && card.title)));

        const phaseBlock = React.createElement("div", { className: "absolute bottom-14 inset-x-0 flex flex-col items-center gap-1 z-10 pointer-events-none", style: an('fxPop', 0.4, held ? 0.6 : 1.2) },
            React.createElement("div", { className: "flex gap-1.5" }, [1, 2, 3].map(i => React.createElement("i", { key: i, className: `fa-solid fa-moon text-sm ${i <= ph ? (red ? 'text-rose-300' : 'text-amber-300') : 'text-slate-600'}`, style: { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.9))' } }))),
            React.createElement("div", { className: `text-[10px] font-black ${red ? 'text-rose-200' : 'text-slate-200'}`, style: { textShadow: '0 1px 4px rgba(0,0,0,.9)' } },
                "\u6708\u4EAE ",
                ph,
                "/3",
                held ? '・狼月降臨' : (red ? (fx.wolf === 'out' ? '・狼人已被淘汰，無人掌控狼月' : '・無人手握狼人') : '')));

        // 狼月獲勝者疊層（約第 3.2 秒出現，配合 4.5s 總長）：大頭像無紅圈、不重複顯示小名；勝利行只寫「名字 獲勝」
        const winOverlay = held ? React.createElement("div", {
            className: "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none",
            style: an('fxPop', 0.5, 3.2),
        },
            React.createElement("div", { className: "text-lg font-black tracking-[0.3em] text-rose-300", style: { textShadow: '0 0 14px rgba(239,68,68,.9)' } }, "\u72FC\u6708\u964D\u81E8"),
            // 只顯示大頭像，不帶名字列、不加紅圈 glow
            wp && React.createElement(Avatar, { p: wp, size: "w-16 h-16 text-3xl" }),
            React.createElement("div", { className: "text-sm font-black text-rose-200", style: { textShadow: '0 1px 4px rgba(0,0,0,.9)' } },
                (wp ? wp.name : '狼人'),
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
    // ---- 吸血鬼降臨（吸.mp4，4.5s，結構對齊狼月影片）----------------
    function vampire({ fx, src, an, Avatar, localPlayerId }) {
        const map = (window.FINALE_VIDEOS) || {};
        const videoSrc = map.vampire || 'video/吸.mp4';
        const videoKey = 'vampire';
        const vp = src;
        const hi = fx.highCards || [];

        // 獲勝者疊層（約第 3.2 秒出現，配合 4.5s 總長）；不顯示「打出了」標題、不帶血 emoji
        const winOverlay = React.createElement("div", {
            className: "absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none",
            style: an('fxPop', 0.5, 3.2),
        },
            React.createElement("div", { className: "text-lg font-black tracking-[0.3em] text-rose-300", style: { textShadow: '0 0 14px rgba(239,68,68,.9)' } }, "\u5438\u8840\u9B3C\u964D\u81E8"),
            vp && React.createElement(Avatar, { p: vp, size: "w-16 h-16 text-3xl" }),
            React.createElement("div", { className: "text-sm font-black text-rose-100", style: { textShadow: '0 1px 4px rgba(0,0,0,.9)' } },
                React.createElement("b", { className: vp && vp.id === localPlayerId ? 'text-sky-300' : 'text-amber-200' }, vp ? vp.name : ''),
                " \u7372\u52DD"),
            hi.length > 0 && React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-1 text-[10px] text-rose-300 px-3", style: an('fxFadeUp', 0.4, 3.5) },
                React.createElement("span", null, "\u9762\u524D\u96C6\u6EFF"),
                hi.map((c, ci) => React.createElement("span", { key: ci, className: "inline-flex items-center gap-0.5 rounded border border-rose-500 bg-black/45 px-1 py-px font-black text-rose-100" },
                    React.createElement("span", { className: "font-mono text-amber-200" }, c.value),
                    c.title)),
                React.createElement("span", null, "7 \u4EE5\u4E0A \u00D7", hi.length)));

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
            winOverlay);
    }
    window.FxFinale = { moonWolf, vampire };
})();
