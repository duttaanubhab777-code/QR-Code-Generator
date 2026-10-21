/* =========================================================
   QR Code Generator  |  logic + animations
   ========================================================= */

const input       = document.getElementById("input-text");
const size        = document.getElementById("size");
const genBtn      = document.getElementById("gen");
const downloadBtn = document.getElementById("download-btn");
const shareBtn    = document.getElementById("share-btn");
const clearBtn    = document.getElementById("clear-btn");
const qrContainer = document.getElementById("qrcode");
const stage       = document.getElementById("stage");
const scan        = document.getElementById("scan");
const counter     = document.getElementById("counter");
const swatches    = document.getElementById("swatches");
const toasts      = document.getElementById("toasts");
const box         = document.getElementById("box");
const field       = input.parentElement;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let qrCode = null;
let qrColor = "#0b0b1a";
let lastText = "";

/* ---------- Toast ---------- */
function toast(message, type = "ok") {
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = message;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 3100);
}

/* ---------- Title: letter-by-letter entrance ---------- */
(function splitTitle() {
    const h1 = document.getElementById("title");
    const text = h1.textContent;
    h1.textContent = "";
    [...text].forEach((c, i) => {
        const s = document.createElement("span");
        s.className = "ch";
        s.setAttribute("aria-hidden", "true");
        s.style.setProperty("--i", i);
        s.innerHTML = c === " " ? "&nbsp;" : c;
        h1.appendChild(s);
    });
})();

/* ---------- Ripple on buttons ---------- */
document.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("pointerdown", e => {
        const r = btn.getBoundingClientRect();
        const d = Math.max(r.width, r.height);
        const dot = document.createElement("i");
        dot.className = "ripple";
        dot.style.width = dot.style.height = d + "px";
        dot.style.left = (e.clientX - r.left - d / 2) + "px";
        dot.style.top  = (e.clientY - r.top  - d / 2) + "px";
        btn.appendChild(dot);
        setTimeout(() => dot.remove(), 700);
    });
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
input.addEventListener("keydown", e => { if (e.key === "Enter") genBtn.click(); });

/* ---------- Typewriter placeholder ---------- */
(function typewriter() {
    if (reduceMotion) return;
    const lines = ["Enter Your URL", "https://your-website.com", "Wi-Fi password or any text", "https://instagram.com/yourname"];
    let li = 0, ci = 0, deleting = false;
    function tick() {
        if (input.value || document.activeElement === input) {
            input.placeholder = "Enter Your URL";
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

/* ---------- Color swatches ---------- */
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
    if (qrCode) generate(false); // live update
});
size.addEventListener("change", () => { if (qrCode) generate(false); });

/* ---------- Generate ---------- */
function generate(withEffects = true) {
    const url = input.value.trim();
    if (url === "") {
        toast("Please enter a URL or text first", "error");
        field.classList.remove("shake"); void field.offsetWidth; field.classList.add("shake");
        input.focus();
        return;
    }

    qrContainer.innerHTML = "";
    const selectedSize = Number(size.value);

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
        stage.classList.remove("filled");
        toast("Text is too long for a QR code", "error");
        return;
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
genBtn.addEventListener("click", () => generate(true));

/* ---------- Build final PNG (QR + url label + credit) ---------- */
function buildFinalCanvas() {
    const qrCanvas = qrContainer.querySelector("canvas");
    if (!qrCanvas) return null;

    const pad = Math.round(qrCanvas.width * 0.06);
    const extraHeight = 90;

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = qrCanvas.width + pad * 2;
    finalCanvas.height = qrCanvas.height + pad * 2 + extraHeight - pad;

    const ctx = finalCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(qrCanvas, pad, pad);

    const baseY = pad + qrCanvas.height;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";

    let fontSize = 20;
    const maxWidth = finalCanvas.width - 20;
    ctx.font = `${fontSize}px Arial`;
    while (ctx.measureText(lastText).width > maxWidth && fontSize > 10) {
        fontSize--;
        ctx.font = `${fontSize}px Arial`;
    }
    ctx.fillText(lastText, finalCanvas.width / 2, baseY + 30);

    ctx.fillStyle = "#ff5e00";
    ctx.font = "bold 16px Arial";
    ctx.fillText("Created by Anubhab Dutta", finalCanvas.width / 2, baseY + 60);
    return finalCanvas;
}

/* ---------- Download ---------- */
downloadBtn.addEventListener("click", () => {
    const finalCanvas = buildFinalCanvas();
    if (!finalCanvas) {
        toast("Please generate a QR code first", "error");
        return;
    }
    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = finalCanvas.toDataURL("image/png");
    link.click();
    toast("Downloaded as qrcode.png", "ok");
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
        try {
            await navigator.share({ files: [new File([blob], "qrcode.png", { type: "image/png" })], title: "QR Code" });
        } catch (e) { /* user closed the share sheet */ }
    }, "image/png");
});

/* ---------- 3D tilt (mouse + touch drag) ---------- */
if (!reduceMotion) {
    const MAX = 9;
    window.addEventListener("pointermove", e => {
        const r = box.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
        box.classList.add("tilting");
        box.style.setProperty("--ry", (dx * MAX).toFixed(2) + "deg");
        box.style.setProperty("--rx", (-dy * MAX).toFixed(2) + "deg");
    }, { passive: true });
    const reset = () => {
        box.classList.remove("tilting");
        box.style.setProperty("--rx", "0deg");
        box.style.setProperty("--ry", "0deg");
    };
    window.addEventListener("pointerup", reset);
    document.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
}

/* =========================================================
   Particle network canvas (reacts to pointer, bursts on generate)
   ========================================================= */
const fx = document.getElementById("fx");
const ctx = fx.getContext("2d");
let W = 0, H = 0, DPR = 1, particles = [], rafId = null;
const pointer = { x: -9999, y: -9999 };
const COLORS = ["#22d3ee", "#ff2e93", "#7c3aed", "#ffb020"];

function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    fx.width = W * DPR; fx.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.max(24, Math.min(80, Math.floor((W * H) / 14000)));
    particles = Array.from({ length: count }, () => makeParticle());
}
function makeParticle(x, y, burst) {
    const a = Math.random() * Math.PI * 2;
    const sp = burst ? 2 + Math.random() * 4 : 0.2 + Math.random() * 0.5;
    return {
        x: x ?? Math.random() * W,
        y: y ?? Math.random() * H,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 1 + Math.random() * 2,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        life: burst ? 1 : -1
    };
}
function burst() {
    if (reduceMotion) return;
    const r = stage.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 46; i++) particles.push(makeParticle(cx, cy, true));
}

function frame() {
    ctx.clearRect(0, 0, W, H);
    const LINK = 120;

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;

        if (p.life >= 0) {                      // burst particle: fade out
            p.vx *= 0.96; p.vy *= 0.96; p.life -= 0.018;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
        } else {                                // ambient particle: wrap around edges
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
            const dx = p.x - pointer.x, dy = p.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 140 * 140) {               // gently push away from the pointer
                const d = Math.sqrt(d2) || 1;
                p.x += (dx / d) * 1.4; p.y += (dy / d) * 1.4;
            }
        }
        ctx.globalAlpha = p.life >= 0 ? Math.max(p.life, 0) : 0.9;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }

    // connecting lines (ambient only, keeps it cheap)
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
        const a = particles[i]; if (a.life >= 0) continue;
        for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j]; if (b.life >= 0) continue;
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < LINK * LINK) {
                ctx.globalAlpha = (1 - Math.sqrt(d2) / LINK) * 0.35;
                ctx.strokeStyle = a.c;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(frame);
}

if (!reduceMotion) {
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
    window.addEventListener("pointerup", () => { pointer.x = pointer.y = -9999; });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) { cancelAnimationFrame(rafId); }
        else { rafId = requestAnimationFrame(frame); }
    });
    rafId = requestAnimationFrame(frame);
}

syncField();
     
