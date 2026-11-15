/* =========================================================
   QR Code Generator  |  logic + silky-smooth animations

   How smoothness is kept:
   - Nothing touches layout inside a pointermove handler
     (positions are cached, writes happen in requestAnimationFrame).
   - Motion is time-based (delta time), so 60Hz, 90Hz, 120Hz and
     slow phones all move at the same speed.
   - The device is rated at start (tier 2 / 1 / 0) and a frame-rate
     guard lowers the tier if frames are dropped.
   - Everything pauses while the tab is hidden.
   ========================================================= */
(() => {
"use strict";

const $ = id => document.getElementById(id);

const input       = $("input-text");
const size        = $("size");
const genBtn      = $("gen");
const downloadBtn = $("download-btn");
const shareBtn    = $("share-btn");
const clearBtn    = $("clear-btn");
const qrContainer = $("qrcode");
const stage       = $("stage");
const scan        = $("scan");
const counter     = $("counter");
const swatches    = $("swatches");
const toasts      = $("toasts");
const box         = $("box");
const fx          = $("fx");
const field       = input.parentElement;
const root        = document.documentElement;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let qrCode = null;
let qrColor = "#0b0b1a";
let lastText = "";
let lastKey = "";

/* ---------- Performance tier ---------- */
function detectTier() {
    const cores = navigator.hardwareConcurrency || 4;
    const mem   = navigator.deviceMemory || 4;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const conn  = navigator.connection;
    if (reduceMotion || (conn && conn.saveData) || mem <= 2 || cores <= 2) return 0;
    if (coarse || mem <= 4 || cores <= 4) return 1;
    return 2;
}
let tier = detectTier();
root.classList.add("t" + tier);

/* ---------- Toast ---------- */
function toast(message, type = "ok") {
    while (toasts.children.length >= 3) toasts.firstElementChild.remove();
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = message;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 3100);
}

/* ---------- Title: letter-by-letter entrance ---------- */
(function splitTitle() {
    const h1 = $("title");
    const text = h1.textContent;
    h1.textContent = "";
    const frag = document.createDocumentFragment();
    [...text].forEach((c, i) => {
        const s = document.createElement("span");
        s.className = "ch";
        s.setAttribute("aria-hidden", "true");
        s.style.setProperty("--i", i);
        s.textContent = c === " " ? "\u00A0" : c;
        frag.appendChild(s);
    });
    h1.appendChild(frag);
})();

/* ---------- Ripple on buttons ---------- */
document.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("pointerdown", e => {
        if (reduceMotion) return;
        const r = btn.getBoundingClientRect();
        const d = Math.max(r.width, r.height);
        const dot = document.createElement("i");
        dot.className = "ripple";
        dot.style.width = dot.style.height = d + "px";
        dot.style.left = (e.clientX - r.left - d / 2) + "px";
        dot.style.top  = (e.clientY - r.top  - d / 2) + "px";
        btn.appendChild(dot);
        setTimeout(() => dot.remove(), 650);
    }, { passive: true });
});

/* ---------- Input: counter, clear button ---------- */
function syncField() {
    const n = input.value.length;
    field.classList.toggle("has-value", n > 0);
    counter.textContent = n === 0 ? "" : n + (n === 1 ? " character" : " characters");
}
input.addEventListener("input", syncField);
clearBtn.addEventListener("click", () => {
    input.value = "";
    syncField();
    input.focus();
});
input.addEventListener("keydown", e => { if (e.key === "Enter") generate(true); });

/* ---------- Typewriter placeholder ---------- */
(function typewriter() {
    if (reduceMotion) return;
    const lines = ["Enter Your URL", "https://your-website.com", "Wi-Fi password or any text", "https://instagram.com/yourname"];
    let li = 0, ci = 0, deleting = false;
    function tick() {
        if (tier === 0 || document.hidden || input.value || document.activeElement === input) {
            if (input.placeholder !== "Enter Your URL") input.placeholder = "Enter Your URL";
            ci = 0; deleting = false;
            return setTimeout(tick, 900);
        }
        const word = lines[li];
        ci += deleting ? -1 : 1;
        input.placeholder = word.slice(0, ci) + (ci % 2 ? "|" : "");
        let wait = deleting ? 35 : 80;
        if (!deleting && ci === word.length) { deleting = true; wait = 1600; input.placeholder = word; }
        else if (deleting && ci === 0) { deleting = false; li = (li + 1) % lines.length; wait = 350; }
        setTimeout(tick, wait);
    }
    setTimeout(tick, 2500);
})();

/* ---------- Color swatches + quality (live update, one per frame) ---------- */
let livePending = false;
function scheduleLive() {
    if (!qrCode || livePending) return;
    livePending = true;
    requestAnimationFrame(() => { livePending = false; generate(false); });
}
swatches.addEventListener("click", e => {
    const sw = e.target.closest(".sw");
    if (!sw) return;
    swatches.querySelectorAll(".sw").forEach(s => {
        s.classList.remove("active");
        s.setAttribute("aria-checked", "false");
    });
    sw.classList.add("active");
    sw.setAttribute("aria-checked", "true");
    qrColor = sw.dataset.color;
    scheduleLive();
});
size.addEventListener("change", scheduleLive);

/* ---------- Generate ---------- */
function generate(withEffects = true) {
    const url = input.value.trim();
    if (url === "") {
        toast("Please enter a URL or text first", "error");
        field.classList.remove("shake"); void field.offsetWidth; field.classList.add("shake");
        input.focus();
        return;
    }
    if (typeof QRCode === "undefined") {
        toast("QR library did not load. Check your internet and reload.", "error");
        return;
    }

    const selectedSize = Number(size.value);
    const key = url + "|" + selectedSize + "|" + qrColor;

    // Same input as the last render: reuse it, only replay the effects
    if (key !== lastKey || !qrCode) {
        qrContainer.innerHTML = "";
        try {
            qrCode = new QRCode(qrContainer, {
                text: url,
                width: selectedSize,
                height: selectedSize,
                colorDark: qrColor,
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (err) {
            qrCode = null;
            lastKey = "";
            stage.classList.remove("filled");
            toast("Text is too long for a QR code", "error");
            return;
        }
        lastKey = key;
    }

    lastText = url;
    stage.classList.add("filled");
    shareBtn.hidden = !canShareFiles();

    if (withEffects) {
        stage.classList.remove("reveal"); void stage.offsetWidth; stage.classList.add("reveal");
        scan.classList.remove("run");     void scan.offsetWidth;  scan.classList.add("run");
        genBtn.classList.add("loading");
        setTimeout(() => genBtn.classList.remove("loading"), 900);
        burst();
        toast("QR code ready", "ok");
    }
}
// Let the press animation paint first, then do the heavy canvas work
genBtn.addEventListener("click", () => requestAnimationFrame(() => generate(true)));

/* ---------- Build final PNG (QR + url label + credit) ---------- */
function buildFinalCanvas() {
    const qrCanvas = qrContainer.querySelector("canvas");
    if (!qrCanvas) return null;

    const pad = Math.round(qrCanvas.width * 0.06);
    const extraHeight = 90;

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = qrCanvas.width + pad * 2;
    finalCanvas.height = qrCanvas.height + pad * 2 + extraHeight - pad;

    const c = finalCanvas.getContext("2d");
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    c.drawImage(qrCanvas, pad, pad);

    const baseY = pad + qrCanvas.height;
    c.fillStyle = "#000000";
    c.textAlign = "center";

    let fontSize = 20;
    const maxWidth = finalCanvas.width - 20;
    c.font = `${fontSize}px Arial`;
    while (c.measureText(lastText).width > maxWidth && fontSize > 10) {
        fontSize--;
        c.font = `${fontSize}px Arial`;
    }
    // Very long text: cut with "..." so it never runs off the image
    let label = lastText;
    if (c.measureText(label).width > maxWidth) {
        while (label.length > 4 && c.measureText(label + "...").width > maxWidth) label = label.slice(0, -1);
        label += "...";
    }
    c.fillText(label, finalCanvas.width / 2, baseY + 30);

    c.fillStyle = "#ff5e00";
    c.font = "bold 16px Arial";
    c.fillText("Created by Anubhab Dutta", finalCanvas.width / 2, baseY + 60);
    return finalCanvas;
}

/* ---------- Download (async blob, no big data-URL string) ---------- */
downloadBtn.addEventListener("click", () => {
    const finalCanvas = buildFinalCanvas();
    if (!finalCanvas) {
        toast("Please generate a QR code first", "error");
        return;
    }
    finalCanvas.toBlob(blob => {
        if (!blob) return toast("Could not create the image", "error");
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "qrcode.png";
        link.href = href;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(href), 5000);
        toast("Downloaded as qrcode.png", "ok");
    }, "image/png");
});

/* ---------- Share (only where the browser supports file sharing) ---------- */
function canShareFiles() {
    try {
        if (!navigator.canShare || !window.File) return false;
        return navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] });
    } catch (e) { return false; }
}
shareBtn.addEventListener("click", () => {
    const finalCanvas = buildFinalCanvas();
    if (!finalCanvas) return toast("Please generate a QR code first", "error");
    finalCanvas.toBlob(async blob => {
        if (!blob) return;
        try {
            await navigator.share({ files: [new File([blob], "qrcode.png", { type: "image/png" })], title: "QR Code" });
        } catch (e) { /* user closed the share sheet */ }
    }, "image/png");
});

/* =========================================================
   3D tilt (mouse + touch drag)
   - card centre is cached (no layout reads while moving)
   - writes happen once per frame with a delta-time ease
   ========================================================= */
const tilt = (() => {
    const MAX = 9;
    const center = { x: 0, y: 0 };
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let running = false, last = 0;

    function measure() {
        const r = box.getBoundingClientRect();
        center.x = r.left + r.width / 2;
        center.y = r.top + r.height / 2;
    }
    function loop(t) {
        const dt = Math.min(t - last, 50); last = t;
        const k = 1 - Math.pow(1 - 0.14, dt / 16.667);   // same feel at any refresh rate
        cx += (tx - cx) * k;
        cy += (ty - cy) * k;
        const settled = Math.abs(tx - cx) < 0.01 && Math.abs(ty - cy) < 0.01;
        if (settled) { cx = tx; cy = ty; }
        box.style.transform = `rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg)`;
        if (settled) { running = false; return; }
        requestAnimationFrame(loop);
    }
    function kick() {
        if (running) return;
        running = true; last = performance.now();
        requestAnimationFrame(loop);
    }
    function move(e) {
        if (tier === 0 || reduceMotion) return;
        const dx = (e.clientX - center.x) / (window.innerWidth / 2);
        const dy = (e.clientY - center.y) / (window.innerHeight / 2);
        tx = Math.max(-1, Math.min(1, dx)) * MAX;
        ty = -Math.max(-1, Math.min(1, dy)) * MAX;
        kick();
    }
    function reset() { tx = ty = 0; if (cx || cy) kick(); }

    if (!reduceMotion) {
        window.addEventListener("pointermove", move, { passive: true });
        window.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") reset(); }, { passive: true });
        window.addEventListener("pointercancel", reset, { passive: true });
        root.addEventListener("mouseleave", reset);
        window.addEventListener("blur", reset);
        window.addEventListener("resize", measure, { passive: true });
        window.addEventListener("scroll", measure, { passive: true });
        window.addEventListener("load", () => setTimeout(measure, 1300));
        measure();
    }
    return { measure };
})();

/* =========================================================
   Particle network canvas
   - one path per colour instead of one path per dot
   - links are drawn in 3 alpha groups (3 strokes per frame)
   - delta-time motion, capped pixel ratio
   - frame-rate guard drops the tier if frames are slow
   ========================================================= */
const ctx = fx.getContext("2d");
const COLORS = ["#22d3ee", "#ff2e93", "#7c3aed", "#ffb020"];
const CFG = {
    2: { max: 55, dpr: 1.5, link: 120, area: 17000 },
    1: { max: 26, dpr: 1,   link: 105, area: 22000 }
};

let W = 0, H = 0, DPR = 1;
let amb = [], bursts = [];
let rafId = 0, lastT = 0, fxOn = false;
const pointer = { x: -9999, y: -9999 };
const segs = [[], [], []];

// frame-rate guard
let warm = 0, accT = 0, accN = 0;

function ambient() {
    const a = Math.random() * Math.PI * 2, sp = 0.2 + Math.random() * 0.5;
    return {
        x: Math.random() * W, y: Math.random() * H,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 1 + Math.random() * 2,
        ci: (Math.random() * COLORS.length) | 0
    };
}
function wantedCount() {
    const c = CFG[tier];
    return c ? Math.max(16, Math.min(c.max, Math.floor((W * H) / c.area))) : 0;
}
function fitCount() {
    const n = wantedCount();
    while (amb.length < n) amb.push(ambient());
    if (amb.length > n) amb.length = n;
}

function resize(force) {
    const c = CFG[tier];
    if (!c) return;
    const nw = window.innerWidth, nh = window.innerHeight;
    // Phone address bars change the height a little while scrolling: ignore that
    if (!force && W && nw === W && Math.abs(nh - H) < 140) return;
    const sx = W ? nw / W : 1, sy = H ? nh / H : 1;
    DPR = Math.min(window.devicePixelRatio || 1, c.dpr);
    W = nw; H = nh;
    fx.width = Math.round(W * DPR);
    fx.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    amb.forEach(p => { p.x *= sx; p.y *= sy; });   // keep particles, just rescale
    fitCount();
}

function burst() {
    if (reduceMotion || !fxOn) return;
    const r = stage.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 36; i++) {
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
        bursts.push({
            x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            r: 1 + Math.random() * 2, ci: (Math.random() * COLORS.length) | 0, life: 1
        });
    }
}

function frame(t) {
    rafId = requestAnimationFrame(frame);
    const dtMs = Math.min(t - lastT, 50);
    lastT = t;
    if (dtMs <= 0) return;

    // ----- frame-rate guard -----
    if (++warm > 40) {                       // skip the heavy intro frames
        accT += dtMs; accN++;
        if (accN >= 90) {
            const avg = accT / accN;
            accT = 0; accN = 0;
            if (avg > 26 && tier > 0) { setTier(tier - 1); return; }
        }
    }

    const k = dtMs / 16.667;
    const c = CFG[tier];
    if (!c) return;
    const link2 = c.link * c.link;

    ctx.clearRect(0, 0, W, H);

    // ----- move ambient particles -----
    const px = pointer.x, py = pointer.y, near2 = 140 * 140;
    for (let i = 0; i < amb.length; i++) {
        const p = amb[i];
        p.x += p.vx * k; p.y += p.vy * k;
        if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
        const dx = p.x - px, dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < near2) {                    // gently push away from the pointer
            const d = Math.sqrt(d2) || 1;
            p.x += (dx / d) * 1.4 * k; p.y += (dy / d) * 1.4 * k;
        }
    }

    // ----- links: collect, then stroke 3 times -----
    segs[0].length = segs[1].length = segs[2].length = 0;
    for (let i = 0; i < amb.length; i++) {
        const a = amb[i];
        for (let j = i + 1; j < amb.length; j++) {
            const b = amb[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < link2) {
                const g = d2 < link2 * 0.25 ? 0 : d2 < link2 * 0.6 ? 1 : 2;
                segs[g].push(a.x, a.y, b.x, b.y);
            }
        }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#a78bfa";
    const alphas = [0.34, 0.2, 0.09];
    for (let g = 0; g < 3; g++) {
        const s = segs[g];
        if (!s.length) continue;
        ctx.globalAlpha = alphas[g];
        ctx.beginPath();
        for (let m = 0; m < s.length; m += 4) { ctx.moveTo(s[m], s[m + 1]); ctx.lineTo(s[m + 2], s[m + 3]); }
        ctx.stroke();
    }

    // ----- dots: one fill per colour -----
    ctx.globalAlpha = 0.9;
    for (let ci = 0; ci < COLORS.length; ci++) {
        ctx.fillStyle = COLORS[ci];
        ctx.beginPath();
        for (let i = 0; i < amb.length; i++) {
            const p = amb[i];
            if (p.ci !== ci) continue;
            ctx.moveTo(p.x + p.r, p.y);
            ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        }
        ctx.fill();
    }

    // ----- burst particles (short lived) -----
    if (bursts.length) {
        const damp = Math.pow(0.96, k);
        for (let i = bursts.length - 1; i >= 0; i--) {
            const p = bursts[i];
            p.x += p.vx * k; p.y += p.vy * k;
            p.vx *= damp; p.vy *= damp;
            p.life -= 0.018 * k;
            if (p.life <= 0) { bursts[i] = bursts[bursts.length - 1]; bursts.pop(); continue; }
            ctx.globalAlpha = p.life;
            ctx.fillStyle = COLORS[p.ci];
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

function startFx() {
    if (fxOn || reduceMotion || !CFG[tier]) return;
    fxOn = true;
    lastT = performance.now();
    warm = 0; accT = 0; accN = 0;
    rafId = requestAnimationFrame(frame);
}
function stopFx() {
    fxOn = false;
    cancelAnimationFrame(rafId);
}

function setTier(n) {
    tier = n;
    root.classList.remove("t0", "t1", "t2");
    root.classList.add("t" + n);
    if (n === 0) {
        stopFx();
        amb = []; bursts = [];
        ctx.clearRect(0, 0, fx.width, fx.height);
        return;
    }
    DPR = Math.min(window.devicePixelRatio || 1, CFG[n].dpr);
    resize(true);
    warm = 0; accT = 0; accN = 0;
}

if (tier > 0 && !reduceMotion) {
    resize(true);
    let rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => resize(false), 150); }, { passive: true });
    window.addEventListener("pointermove", e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
    window.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") pointer.x = pointer.y = -9999; }, { passive: true });
    root.addEventListener("mouseleave", () => { pointer.x = pointer.y = -9999; });
    startFx();
}

/* ---------- Pause everything while the tab is hidden ---------- */
document.addEventListener("visibilitychange", () => {
    root.classList.toggle("paused", document.hidden);
    if (document.hidden) stopFx();
    else if (tier > 0 && !reduceMotion) startFx();
});

syncField();
})();
