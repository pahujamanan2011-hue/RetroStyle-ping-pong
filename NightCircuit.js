/* =========================================================
   NIGHTCIRCUIT.JS
   Terminal Arcade – Night Circuit
   Endless terminal racing. Lightweight. Fixed FPS.
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   CANVAS
--------------------------------------------------------- */

var canvas = document.getElementById("pong");
var ctx    = canvas.getContext("2d", { alpha: false });

var W = canvas.width;   /* 640 */
var H = canvas.height;  /* 360 */

ctx.imageSmoothingEnabled = false;

/* ---------------------------------------------------------
   AUDIO  – tiny Web Audio synth, no files
--------------------------------------------------------- */

var AC = null;
function getAC() {
    if (!AC) {
        try {
            AC = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {}
    }
    return AC;
}

function beep(freq, dur, type, vol) {
    var ac = getAC(); if (!ac) return;
    try {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type      = type  || "square";
        o.frequency.setValueAtTime(freq, ac.currentTime);
        g.gain.setValueAtTime((vol || 0.08), ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
        o.start(ac.currentTime);
        o.stop(ac.currentTime + dur);
    } catch(e) {}
}

function sndStart() {
    beep(220, 0.08, "square", 0.07);
    setTimeout(function(){ beep(330, 0.08, "square", 0.07); }, 90);
    setTimeout(function(){ beep(440, 0.12, "square", 0.09); }, 180);
}

function sndCrash() {
    beep(80,  0.25, "sawtooth", 0.12);
    beep(55,  0.30, "sawtooth", 0.10);
}

function sndNearMiss() { beep(660, 0.06, "square", 0.06); }
function sndPause()    { beep(330, 0.08, "sine",   0.05); }
function sndHiScore()  {
    beep(440, 0.08, "square", 0.07);
    setTimeout(function(){ beep(550, 0.08, "square", 0.07); }, 100);
    setTimeout(function(){ beep(660, 0.12, "square", 0.09); }, 200);
}
function sndMove()     { beep(180, 0.03, "square", 0.03); }

/* ---------------------------------------------------------
   LAYOUT
--------------------------------------------------------- */

var ROAD_X = 120;          /* road left edge  */
var ROAD_W = 400;          /* road width      */
var ROAD_R = ROAD_X + ROAD_W;
var LANES  = 4;
var LANE_W = ROAD_W / LANES;  /* 100px each */

/* ---------------------------------------------------------
   SCREENS
--------------------------------------------------------- */

var SC_MENU = 0;
var SC_PLAY = 1;
var SC_DEAD = 2;

var screen = SC_MENU;

/* ---------------------------------------------------------
   HIGH SCORE
--------------------------------------------------------- */

var hiScore = 0;
var newHi   = false;

try {
    hiScore = parseInt(
        localStorage.getItem("terminalarcade_nightcircuit_hi") || "0", 10
    );
} catch(e){}

function saveHi() {
    try {
        localStorage.setItem("terminalarcade_nightcircuit_hi", hiScore);
    } catch(e){}
}

/* ---------------------------------------------------------
   PLAYER
--------------------------------------------------------- */

var CAR_W  = 28;
var CAR_H  = 44;

var playerX;   /* centre x of player car */
var playerY;
var PLAYER_SPEED = 5;

/* ---------------------------------------------------------
   ROAD SCROLL
--------------------------------------------------------- */

var roadY      = 0;          /* lane marker scroll offset */
var MARKER_H   = 40;         /* dashed line segment height */
var MARKER_GAP = 30;

/* ---------------------------------------------------------
   TRAFFIC
--------------------------------------------------------- */

/* Pool of traffic objects – reuse to avoid GC */
var MAX_TRAFFIC = 12;
var traffic = [];

for (var ti = 0; ti < MAX_TRAFFIC; ti++) {
    traffic.push({ x:0, y:0, w:0, h:0, alive:false, col:"#888" });
}

var TRAFFIC_TYPES = [
    { w:24, h:38, col:"#aaa" },  /* small car    */
    { w:30, h:50, col:"#888" },  /* sedan        */
    { w:36, h:60, col:"#777" },  /* SUV / truck  */
    { w:40, h:70, col:"#999" }   /* wide vehicle */
];

/* ---------------------------------------------------------
   GAME STATE
--------------------------------------------------------- */

var score      = 0;
var distance   = 0;
var gameSpeed  = 2.5;
var paused     = false;

var spawnTimer    = 0;
var spawnInterval = 60;   /* ticks between spawns – decreases over time */

var speedLevel    = 1;
var speedMsgTimer = 0;    /* show "SPEED LEVEL X" for N ticks */

/* Screen shake */
var shakeTick = 0;
var SHAKE_MAX = 8;

/* Near-miss tracking */
var nearMissTimer = 0;

/* Scan flash */
var scanTimer    = 0;
var SCAN_EVERY   = 1800;  /* ~60s */
var scanFlash    = 0;

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */

function initGame() {
    playerX  = ROAD_X + ROAD_W / 2;
    playerY  = H - CAR_H - 20;

    /* Reset traffic pool */
    for (var i = 0; i < MAX_TRAFFIC; i++) traffic[i].alive = false;

    score         = 0;
    distance      = 0;
    gameSpeed     = 2.5;
    paused        = false;
    spawnTimer    = 0;
    spawnInterval = 60;
    speedLevel    = 1;
    speedMsgTimer = 0;
    shakeTick     = 0;
    nearMissTimer = 0;
    scanTimer     = 0;
    scanFlash     = 0;
    roadY         = 0;
    newHi         = false;

    screen = SC_PLAY;
    sndStart();
}

/* ---------------------------------------------------------
   SPAWN TRAFFIC
--------------------------------------------------------- */

function spawnTraffic() {
    /* Find dead slot */
    for (var i = 0; i < MAX_TRAFFIC; i++) {
        if (!traffic[i].alive) {
            var t   = traffic[i];
            var tp  = TRAFFIC_TYPES[(Math.random() * TRAFFIC_TYPES.length) | 0];
            /* Pick random lane centre */
            var lane = (Math.random() * LANES) | 0;
            t.x     = ROAD_X + lane * LANE_W + (LANE_W - tp.w) / 2;
            t.y     = -tp.h - 10;
            t.w     = tp.w;
            t.h     = tp.h;
            t.col   = tp.col;
            t.alive = true;
            return;
        }
    }
}

/* ---------------------------------------------------------
   COLLISION  (AABB)
--------------------------------------------------------- */

function collides(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx &&
           ay < by + bh && ay + ah > by;
}

/* ---------------------------------------------------------
   INPUT
--------------------------------------------------------- */

var keyLeft  = false;
var keyRight = false;

document.addEventListener("keydown", function (e) {

    var k = e.code;

    if (k === "ArrowLeft" || k === "ArrowRight" ||
        k === "ArrowUp"   || k === "ArrowDown"  || k === "Space") {
        e.preventDefault();
    }

    if (screen === SC_MENU && (k === "Enter" || k === "Space")) {
        initGame(); return;
    }
    if (screen === SC_DEAD && (k === "Enter" || k === "Space")) {
        initGame(); return;
    }

    if (k === "Escape") {
        if (screen === SC_PLAY) { screen = SC_MENU; return; }
    }
    if (k === "KeyP" && screen === SC_PLAY) {
        paused = !paused; sndPause(); return;
    }
    if (k === "KeyF") { toggleFS(); return; }

    if (k === "ArrowLeft"  || k === "KeyA") keyLeft  = true;
    if (k === "ArrowRight" || k === "KeyD") keyRight = true;
});

document.addEventListener("keyup", function (e) {
    var k = e.code;
    if (k === "ArrowLeft"  || k === "KeyA") keyLeft  = false;
    if (k === "ArrowRight" || k === "KeyD") keyRight = false;
});

function toggleFS() {
    if (!document.fullscreenElement) {
        if (canvas.requestFullscreen) canvas.requestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

/* ---------------------------------------------------------
   TOUCH CONTROLS
--------------------------------------------------------- */

var touchLeft  = false;
var touchRight = false;

/* Button rects (computed once) */
var TBTN_LEFT  = { x: ROAD_X,            y: H - 48, w: ROAD_W/2 - 4, h: 42 };
var TBTN_RIGHT = { x: ROAD_X + ROAD_W/2 + 4, y: H - 48, w: ROAD_W/2 - 4, h: 42 };

function inBtn(tx, ty, b) {
    return tx >= b.x && tx <= b.x+b.w && ty >= b.y && ty <= b.y+b.h;
}

canvas.addEventListener("touchstart", function (e) {
    e.preventDefault();
    if (screen === SC_MENU || screen === SC_DEAD) {
        if (typeof requestLandscape === "function") requestLandscape();
        initGame(); return;
    }
    var rect   = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    for (var i = 0; i < e.touches.length; i++) {
        var tx = (e.touches[i].clientX - rect.left) * scaleX;
        var ty = (e.touches[i].clientY - rect.top)  * scaleY;
        if (inBtn(tx, ty, TBTN_LEFT))  touchLeft  = true;
        if (inBtn(tx, ty, TBTN_RIGHT)) touchRight = true;
    }
}, { passive: false });

canvas.addEventListener("touchend", function (e) {
    e.preventDefault();
    touchLeft  = false;
    touchRight = false;
    /* Re-check remaining touches */
    var rect   = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    for (var i = 0; i < e.touches.length; i++) {
        var tx = (e.touches[i].clientX - rect.left) * scaleX;
        var ty = (e.touches[i].clientY - rect.top)  * scaleY;
        if (inBtn(tx, ty, TBTN_LEFT))  touchLeft  = true;
        if (inBtn(tx, ty, TBTN_RIGHT)) touchRight = true;
    }
}, { passive: false });

canvas.addEventListener("touchcancel", function (e) {
    touchLeft = touchRight = false;
}, { passive: false });

/* Mouse click for menu/dead */
canvas.addEventListener("click", function (e) {
    if (screen === SC_MENU || screen === SC_DEAD) { initGame(); }
});

/* ---------------------------------------------------------
   UPDATE
--------------------------------------------------------- */

function update() {

    if (screen !== SC_PLAY || paused) return;

    /* --- PLAYER MOVE --- */
    var moved = false;
    if (keyLeft || touchLeft) {
        playerX -= PLAYER_SPEED;
        moved = true;
    }
    if (keyRight || touchRight) {
        playerX += PLAYER_SPEED;
        moved = true;
    }

    /* Clamp to road */
    if (playerX - CAR_W/2 < ROAD_X)   playerX = ROAD_X  + CAR_W/2;
    if (playerX + CAR_W/2 > ROAD_R)   playerX = ROAD_R  - CAR_W/2;

    /* Move sound – every 6 ticks while moving */
    if (moved && (distance % 6 === 0)) sndMove();

    /* --- ROAD SCROLL --- */
    roadY = (roadY + gameSpeed) % (MARKER_H + MARKER_GAP);

    /* --- SCORE / DISTANCE --- */
    distance++;
    score = distance;

    /* --- SPEED RAMP --- */
    var newLevel = ((distance / 400) | 0) + 1;
    if (newLevel > speedLevel) {
        speedLevel    = newLevel;
        gameSpeed     = 2.5 + (speedLevel - 1) * 0.6;
        if (gameSpeed > 9) gameSpeed = 9;
        spawnInterval = 60 - speedLevel * 4;
        if (spawnInterval < 18) spawnInterval = 18;
        speedMsgTimer = 90;
    }

    /* --- SPAWN --- */
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnTraffic();
        /* Extra car at higher speeds */
        if (speedLevel >= 4 && Math.random() < 0.4) spawnTraffic();
    }

    /* --- TRAFFIC MOVE + COLLISION --- */
    var px = playerX - CAR_W/2;
    var py = playerY;
    var crashed = false;

    for (var i = 0; i < MAX_TRAFFIC; i++) {
        var t = traffic[i];
        if (!t.alive) continue;

        t.y += gameSpeed * 1.1;

        /* Off screen */
        if (t.y > H + 10) { t.alive = false; continue; }

        /* Collision */
        if (collides(px, py, CAR_W, CAR_H, t.x, t.y, t.w, t.h)) {
            crashed = true; break;
        }

        /* Near miss bonus: within 8px horizontally, just passed */
        if (!crashed && t.y + t.h >= py - 10 && t.y + t.h <= py + 20) {
            var gap = Math.min(
                Math.abs(px - (t.x + t.w)),
                Math.abs(t.x - (px + CAR_W))
            );
            if (gap < 12 && gap >= 0) {
                score += 5;
                nearMissTimer = 40;
                sndNearMiss();
            }
        }
    }

    if (crashed) {
        sndCrash();
        shakeTick = SHAKE_MAX;
        if (score > hiScore) {
            hiScore = score; newHi = true; saveHi(); sndHiScore();
        }
        screen = SC_DEAD;
        return;
    }

    /* --- SHAKE COUNTDOWN --- */
    if (shakeTick > 0) shakeTick--;

    /* --- NEAR MISS TIMER --- */
    if (nearMissTimer > 0) nearMissTimer--;

    /* --- SPEED MSG TIMER --- */
    if (speedMsgTimer > 0) speedMsgTimer--;

    /* --- SCAN FLASH --- */
    scanTimer++;
    if (scanTimer >= SCAN_EVERY) { scanTimer = 0; scanFlash = 50; }
    if (scanFlash > 0) scanFlash--;
}

/* ---------------------------------------------------------
   DRAW HELPERS
--------------------------------------------------------- */

function centered(txt, y, size, col) {
    ctx.fillStyle = col || "#aaa";
    ctx.font = size + "px monospace";
    var tw = ctx.measureText(txt).width;
    ctx.fillText(txt, (W - tw) >> 1, y);
}

function fillBtn(x, y, w, h, label, active) {
    ctx.fillStyle = active ? "#333" : "#111";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = active ? "#aaa" : "#444";
    ctx.lineWidth = 1;
    ctx.strokeRect(x+0.5, y+0.5, w-1, h-1);
    ctx.fillStyle = active ? "#fff" : "#777";
    ctx.font = "11px monospace";
    var tw = ctx.measureText(label).width;
    ctx.fillText(label, x + ((w - tw) >> 1), y + h - 7);
}

/* Draw player car (simple white pixel art) */
function drawPlayerCar(cx, cy) {
    var x = (cx - CAR_W/2) | 0;
    var y = cy | 0;

    /* Body */
    ctx.fillStyle = "#eee";
    ctx.fillRect(x + 4,  y,           CAR_W - 8, CAR_H);
    ctx.fillRect(x,      y + 10,      CAR_W,     CAR_H - 28);

    /* Windscreen dark */
    ctx.fillStyle = "#333";
    ctx.fillRect(x + 6,  y + 6,       CAR_W - 12, 12);

    /* Rear window */
    ctx.fillStyle = "#444";
    ctx.fillRect(x + 6,  y + CAR_H - 16, CAR_W - 12, 8);

    /* Headlights */
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 4,  y + 2,  6, 4);
    ctx.fillRect(x + CAR_W - 10, y + 2, 6, 4);

    /* Taillights */
    ctx.fillStyle = "#882222";
    ctx.fillRect(x + 4,  y + CAR_H - 6, 6, 4);
    ctx.fillRect(x + CAR_W - 10, y + CAR_H - 6, 6, 4);
}

/* Draw a traffic car */
function drawTrafficCar(t) {
    var x = t.x | 0;
    var y = t.y | 0;

    ctx.fillStyle = t.col;
    ctx.fillRect(x + 2, y,       t.w - 4, t.h);
    ctx.fillRect(x,     y + 8,   t.w,     t.h - 20);

    /* Windscreen */
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 4, y + 4, t.w - 8, 10);

    /* Headlights (bottom = approaching) */
    ctx.fillStyle = "#ddd";
    ctx.fillRect(x + 2,       y + t.h - 6, 5, 4);
    ctx.fillRect(x + t.w - 7, y + t.h - 6, 5, 4);
}

/* ---------------------------------------------------------
   DRAW
--------------------------------------------------------- */

function draw() {

    /* Shake offset */
    var sx = 0, sy = 0;
    if (shakeTick > 0) {
        sx = ((Math.random() * 6) | 0) - 3;
        sy = ((Math.random() * 4) | 0) - 2;
    }

    ctx.save();
    if (shakeTick > 0) ctx.translate(sx, sy);

    /* BG */
    ctx.fillStyle = "#000";
    ctx.fillRect(-4, -4, W + 8, H + 8);

    /* ---- MENU ---- */
    if (screen === SC_MENU) {
        ctx.restore();

        centered("TERMINAL ARCADE", 55,  13, "#444");
        centered("NIGHT CIRCUIT",   98,  26, "#ccc");
        centered("LOW-LIGHT TRAFFIC SIMULATION", 126, 11, "#555");

        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(220, 152, 200, 28);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1;
        ctx.strokeRect(220.5, 152.5, 199, 27);
        centered("ENTER = START", 171, 13, "#bbb");

        centered("HIGH SCORE: " + hiScore, 212, 13, "#444");

        centered("A/D or ARROWS = DRIVE   P = PAUSE", 248, 10, "#333");
        centered("F = FULLSCREEN   ESC = EXIT",        262, 10, "#333");
        return;
    }

    /* ---- ROAD ---- */

    /* Road surface */
    ctx.fillStyle = "#111";
    ctx.fillRect(ROAD_X, 0, ROAD_W, H);

    /* Shoulder lines */
    ctx.fillStyle = "#444";
    ctx.fillRect(ROAD_X,     0, 3, H);
    ctx.fillRect(ROAD_R - 3, 0, 3, H);

    /* Scrolling lane markers */
    ctx.fillStyle = "#2a2a2a";
    for (var lane = 1; lane < LANES; lane++) {
        var lx = (ROAD_X + lane * LANE_W) | 0;
        var my = (-roadY | 0);
        while (my < H) {
            ctx.fillRect(lx - 1, my, 2, MARKER_H);
            my += MARKER_H + MARKER_GAP;
        }
    }

    /* Side scenery – tiny buildings */
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0,       0, ROAD_X - 2,       H);
    ctx.fillRect(ROAD_R + 3, 0, W - ROAD_R - 3, H);

    /* Simple building silhouettes left */
    ctx.fillStyle = "#141414";
    ctx.fillRect(8,  60,  30, H - 60);
    ctx.fillRect(44, 90,  20, H - 90);
    ctx.fillRect(70, 40,  25, H - 40);
    /* Right */
    ctx.fillRect(W - 38, 50,  30, H - 50);
    ctx.fillRect(W - 65, 80,  20, H - 80);
    ctx.fillRect(W - 90, 30,  22, H - 30);

    /* ---- TRAFFIC ---- */
    for (var i = 0; i < MAX_TRAFFIC; i++) {
        if (traffic[i].alive) drawTrafficCar(traffic[i]);
    }

    /* ---- PLAYER ---- */
    drawPlayerCar(playerX, playerY);

    /* ---- HUD ---- */
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, ROAD_X - 3, 80);

    ctx.fillStyle = "#555";
    ctx.font = "10px monospace";
    ctx.fillText("DIST",  8, 16);
    ctx.fillStyle = "#ccc";
    ctx.font = "13px monospace";
    ctx.fillText(score,   8, 30);

    ctx.fillStyle = "#444";
    ctx.font = "10px monospace";
    ctx.fillText("HIGH",  8, 48);
    ctx.fillStyle = "#888";
    ctx.font = "12px monospace";
    ctx.fillText(hiScore, 8, 62);

    ctx.fillStyle = "#333";
    ctx.font = "10px monospace";
    ctx.fillText("SPD:" + speedLevel, 8, 78);

    /* Near miss flash */
    if (nearMissTimer > 0) {
        ctx.fillStyle = "#aaaa00";
        ctx.font = "10px monospace";
        ctx.fillText("+5", ROAD_X + 4, playerY - 6);
    }

    /* Speed level message */
    if (speedMsgTimer > 0) {
        centered("SPEED LEVEL " + speedLevel, H / 2 - 10, 14, "#666");
    }

    /* Scan flash */
    if (scanFlash > 30) {
        centered("SYSTEM SCAN...", H / 2, 13, "#335533");
    }

    /* Paused */
    if (paused) {
        ctx.fillStyle = "#000";
        for (var pi = 0; pi < H; pi += 2) ctx.fillRect(0, pi, W, 1);
        centered("PAUSED",     H/2 - 10, 18, "#aaa");
        centered("P = RESUME", H/2 + 16, 11, "#555");
    }

    /* Mobile touch buttons */
    if (window.matchMedia("(pointer: coarse)").matches && screen === SC_PLAY && !paused) {
        fillBtn(TBTN_LEFT.x,  TBTN_LEFT.y,  TBTN_LEFT.w,  TBTN_LEFT.h,  "< LEFT",  touchLeft);
        fillBtn(TBTN_RIGHT.x, TBTN_RIGHT.y, TBTN_RIGHT.w, TBTN_RIGHT.h, "RIGHT >", touchRight);
    }

    ctx.restore();

    /* ---- DEATH SCREEN (no shake) ---- */
    if (screen === SC_DEAD) {
        ctx.fillStyle = "#000";
        for (var di = 0; di < H; di += 2) ctx.fillRect(0, di, W, 1);

        centered("CONNECTION LOST",     122, 20, "#ccc");
        centered("DISTANCE: " + score,  158, 14, "#aaa");
        centered("HIGH: "    + hiScore, 180, 12, "#666");
        if (newHi) centered("*** NEW HIGH SCORE ***", 202, 12, "#888");

        ctx.fillStyle = "#111";
        ctx.fillRect(220, 220, 200, 28);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1;
        ctx.strokeRect(220.5, 220.5, 199, 27);
        centered("ENTER = PLAY AGAIN", 239, 13, "#bbb");
    }
}

/* ---------------------------------------------------------
   LOOP  – fixed ~30 FPS
--------------------------------------------------------- */

window.__gameInterval = setInterval(function () {
    update();
    draw();
}, 33);
