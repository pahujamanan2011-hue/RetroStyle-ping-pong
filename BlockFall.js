/* =========================================================
   BLOCKFALL.JS
   Terminal Arcade – Classic Block Puzzle
   Lightweight. Fixed FPS. Old-PC safe.
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
   LAYOUT
   Board is 10 wide x 20 tall, centred left-of-midpoint.
   Right side holds score panel.
--------------------------------------------------------- */

var CELL  = 16;           /* px per cell            */
var COLS  = 10;           /* board columns          */
var ROWS  = 20;           /* board rows             */

var BOARD_X = 40;                      /* board left edge px  */
var BOARD_Y = (H - ROWS * CELL) >> 1; /* vertically centred  */
var BOARD_W = COLS * CELL;             /* 160 px              */
var BOARD_H = ROWS * CELL;             /* 320 px              */

var PANEL_X = BOARD_X + BOARD_W + 20;  /* score panel x       */

/* ---------------------------------------------------------
   SCREENS
--------------------------------------------------------- */

var SC_MENU = 0;
var SC_PLAY = 1;
var SC_DEAD = 2;

var screen = SC_MENU;

/* ---------------------------------------------------------
   SCORES
--------------------------------------------------------- */

var score  = 0;
var lines  = 0;
var level  = 1;
var hiScore = 0;
var newHi  = false;

try { hiScore = parseInt(localStorage.getItem("bf_hi") || "0", 10); } catch(e){}

function saveHi() {
    try { localStorage.setItem("bf_hi", hiScore); } catch(e){}
}

/* Points per lines cleared at once */
var LINE_PTS = [0, 100, 300, 500, 800];

/* ---------------------------------------------------------
   PIECES  (tetrominoes)
   Each piece: array of 4 rotations, each rotation: array of [col,row] offsets
--------------------------------------------------------- */

var PIECES = [
    /* I */
    [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]], [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]],
    /* O */
    [[[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]]],
    /* T */
    [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]],
    /* S */
    [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]], [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]],
    /* Z */
    [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]],
    /* J */
    [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]],
    /* L */
    [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]]
];

/* All blocks rendered white/lightgray – terminal style */
var COLORS = ["#ddd","#ddd","#ddd","#bbb","#bbb","#ccc","#ccc"];

/* ---------------------------------------------------------
   BOARD
--------------------------------------------------------- */

var board;   /* ROWS x COLS array, 0 = empty, 1 = filled */

function makeBoard() {
    board = [];
    for (var r = 0; r < ROWS; r++) {
        board[r] = [];
        for (var c = 0; c < COLS; c++) board[r][c] = 0;
    }
}

/* ---------------------------------------------------------
   CURRENT PIECE
--------------------------------------------------------- */

var piece;     /* {type, rot, x, y} */
var nextType;

function randType() { return (Math.random() * PIECES.length) | 0; }

function spawnPiece() {
    piece = {
        type: nextType !== undefined ? nextType : randType(),
        rot:  0,
        x:    3,
        y:    0
    };
    nextType = randType();
    /* Instant game over check */
    if (!valid(piece, 0, 0, 0)) {
        screen = SC_DEAD;
        if (score > hiScore) { hiScore = score; newHi = true; saveHi(); }
    }
}

/* ---------------------------------------------------------
   COLLISION
--------------------------------------------------------- */

function cells(p, dr, dc, drot) {
    var rot = (p.rot + (drot || 0) + 4) % 4;
    return PIECES[p.type][rot];
}

function valid(p, dx, dy, drot) {
    var cs = cells(p, 0, 0, drot);
    for (var i = 0; i < cs.length; i++) {
        var nc = p.x + cs[i][0] + (dx || 0);
        var nr = p.y + cs[i][1] + (dy || 0);
        if (nc < 0 || nc >= COLS || nr >= ROWS) return false;
        if (nr >= 0 && board[nr][nc]) return false;
    }
    return true;
}

/* ---------------------------------------------------------
   LOCK + LINE CLEAR
--------------------------------------------------------- */

var flashRows   = [];   /* rows flashing this frame */
var flashTick   = 0;
var FLASH_TICKS = 6;    /* brief flash before clear */

function lockPiece() {
    var cs = cells(piece, 0, 0, 0);
    for (var i = 0; i < cs.length; i++) {
        var c = piece.x + cs[i][0];
        var r = piece.y + cs[i][1];
        if (r >= 0) board[r][c] = 1;
    }
    /* Find full rows */
    flashRows = [];
    for (var r = 0; r < ROWS; r++) {
        var full = true;
        for (var c = 0; c < COLS; c++) {
            if (!board[r][c]) { full = false; break; }
        }
        if (full) flashRows.push(r);
    }
    if (flashRows.length > 0) {
        flashTick = FLASH_TICKS;
    } else {
        spawnPiece();
    }
}

function clearLines() {
    var cleared = flashRows.length;
    /* Remove rows top-down */
    for (var i = 0; i < cleared; i++) {
        board.splice(flashRows[i] - i, 1);
        board.unshift([]);
        for (var c = 0; c < COLS; c++) board[0][c] = 0;
    }
    flashRows = [];
    lines += cleared;
    score += LINE_PTS[cleared] * level;
    if (score > hiScore) { hiScore = score; newHi = true; saveHi(); }
    level = ((lines / 10) | 0) + 1;
    spawnPiece();
}

/* ---------------------------------------------------------
   GHOST PIECE
--------------------------------------------------------- */

function ghostY() {
    var gy = piece.y;
    while (valid(piece, 0, gy - piece.y + 1, 0)) gy++;
    return gy;
}

/* ---------------------------------------------------------
   DROP SPEED  (ticks between auto-drops)
--------------------------------------------------------- */

function dropInterval() {
    var spd = 48 - (level - 1) * 4;
    return spd < 6 ? 6 : spd;
}

/* ---------------------------------------------------------
   GAME STATE
--------------------------------------------------------- */

var paused   = false;
var dropTick = 0;

function initGame() {
    makeBoard();
    score    = 0;
    lines    = 0;
    level    = 1;
    newHi    = false;
    paused   = false;
    dropTick = 0;
    flashRows = [];
    flashTick = 0;
    nextType  = randType();
    spawnPiece();
    screen   = SC_PLAY;
}

/* ---------------------------------------------------------
   HAPTIC (lightweight vibration, mobile only)
--------------------------------------------------------- */

function vibrate(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e){}
}

/* ---------------------------------------------------------
   INPUT – keyboard
--------------------------------------------------------- */

document.addEventListener("keydown", function (e) {

    var k = e.code;

    if (k === "ArrowUp" || k === "ArrowDown" ||
        k === "ArrowLeft" || k === "ArrowRight" || k === "Space") {
        e.preventDefault();
    }

    /* Menu / death */
    if (screen === SC_MENU && (k === "Enter" || k === "Space")) {
        initGame(); return;
    }
    if (screen === SC_DEAD && (k === "Enter" || k === "Space")) {
        initGame(); return;
    }

    if (screen !== SC_PLAY) return;

    /* ESC = back to menu */
    if (k === "Escape") { screen = SC_MENU; return; }

    /* Pause */
    if (k === "KeyP") { paused = !paused; return; }

    /* Fullscreen */
    if (k === "KeyF") { toggleFS(); return; }

    if (paused || flashTick > 0) return;

    /* Move left */
    if (k === "ArrowLeft" || k === "KeyA") {
        if (valid(piece, -1, 0, 0)) { piece.x--; vibrate(8); }
    }
    /* Move right */
    if (k === "ArrowRight" || k === "KeyD") {
        if (valid(piece, 1, 0, 0)) { piece.x++; vibrate(8); }
    }
    /* Soft drop */
    if (k === "ArrowDown" || k === "KeyS") {
        if (valid(piece, 0, 1, 0)) { piece.y++; score++; dropTick = 0; }
        else { lockPiece(); vibrate(15); }
    }
    /* Hard drop */
    if (k === "Space") {
        var gy = ghostY();
        score += (gy - piece.y) * 2;
        piece.y = gy;
        lockPiece();
        vibrate(20);
    }
    /* Rotate */
    if (k === "ArrowUp" || k === "KeyW") {
        if (valid(piece, 0, 0, 1)) { piece.rot = (piece.rot + 1) % 4; vibrate(8); }
        /* Wall kick */
        else if (valid(piece, 1, 0, 1)) { piece.x++; piece.rot = (piece.rot + 1) % 4; vibrate(8); }
        else if (valid(piece, -1, 0, 1)) { piece.x--; piece.rot = (piece.rot + 1) % 4; vibrate(8); }
    }
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
   D-pad buttons drawn on canvas; tap detection in touchend
--------------------------------------------------------- */

var BTN = {
    left:   { x: 10,  y: H - 54, w: 60, h: 40 },
    right:  { x: 80,  y: H - 54, w: 60, h: 40 },
    rotate: { x: 150, y: H - 54, w: 80, h: 40 },
    down:   { x: 10,  y: H - 10, w: 220, h: 36 }  /* unused – tap anywhere below */
};

/* Recompute BTN to sit below the board on canvas */
BTN.left   = { x: BOARD_X,                y: BOARD_Y + BOARD_H + 8, w: 44, h: 36 };
BTN.right  = { x: BOARD_X + 50,           y: BOARD_Y + BOARD_H + 8, w: 44, h: 36 };
BTN.rotate = { x: BOARD_X + 100,          y: BOARD_Y + BOARD_H + 8, w: 60, h: 36 };
BTN.down   = { x: BOARD_X,                y: BOARD_Y + BOARD_H + 50, w: 160, h: 32 };

var isTouchDevice = false;

canvas.addEventListener("touchstart", function (e) {
    e.preventDefault();
    isTouchDevice = true;
}, { passive: false });

canvas.addEventListener("touchend", function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;

    for (var t = 0; t < e.changedTouches.length; t++) {
        var tx = (e.changedTouches[t].clientX - rect.left) * scaleX;
        var ty = (e.changedTouches[t].clientY - rect.top)  * scaleY;

        /* Menu / dead: tap anywhere to start */
        if (screen === SC_MENU || screen === SC_DEAD) {
            if (typeof requestLandscape === "function") requestLandscape();
            initGame(); return;
        }

        if (screen !== SC_PLAY || paused || flashTick > 0) continue;

        /* LEFT */
        if (hit(tx, ty, BTN.left)) {
            if (valid(piece, -1, 0, 0)) { piece.x--; vibrate(8); }
        }
        /* RIGHT */
        else if (hit(tx, ty, BTN.right)) {
            if (valid(piece, 1, 0, 0)) { piece.x++; vibrate(8); }
        }
        /* ROTATE */
        else if (hit(tx, ty, BTN.rotate)) {
            if      (valid(piece, 0,  0, 1)) { piece.rot = (piece.rot+1)%4; vibrate(8); }
            else if (valid(piece, 1,  0, 1)) { piece.x++; piece.rot = (piece.rot+1)%4; vibrate(8); }
            else if (valid(piece, -1, 0, 1)) { piece.x--; piece.rot = (piece.rot+1)%4; vibrate(8); }
        }
        /* DOWN */
        else if (hit(tx, ty, BTN.down)) {
            if (valid(piece, 0, 1, 0)) { piece.y++; score++; dropTick = 0; }
            else { lockPiece(); vibrate(15); }
        }
    }
}, { passive: false });

function hit(tx, ty, b) {
    return tx >= b.x && tx <= b.x + b.w && ty >= b.y && ty <= b.y + b.h;
}

/* ---------------------------------------------------------
   UPDATE
--------------------------------------------------------- */

function update() {

    if (screen !== SC_PLAY || paused) return;

    /* Flash countdown before clearing lines */
    if (flashTick > 0) {
        flashTick--;
        if (flashTick === 0) clearLines();
        return;
    }

    /* Auto drop */
    dropTick++;
    if (dropTick >= dropInterval()) {
        dropTick = 0;
        if (valid(piece, 0, 1, 0)) {
            piece.y++;
        } else {
            lockPiece();
            vibrate(15);
        }
    }
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
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = active ? "#fff" : "#777";
    ctx.font = "11px monospace";
    var tw = ctx.measureText(label).width;
    ctx.fillText(label, x + ((w - tw) >> 1), y + h - 12);
}

/* Draw one block at pixel coords px,py */
function drawBlock(px, py, col) {
    /* Main fill */
    ctx.fillStyle = col;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    /* Inner dark shading strip – subtle texture */
    ctx.fillStyle = "#333";
    ctx.fillRect(px + 2, py + 2, CELL - 4, 2);
    ctx.fillRect(px + 2, py + 2, 2, CELL - 4);
}

/* ---------------------------------------------------------
   DRAW
--------------------------------------------------------- */

function draw() {

    /* BG */
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    /* ---- MENU ---- */
    if (screen === SC_MENU) {

        centered("TERMINAL ARCADE", 55, 13, "#444");
        centered("BLOCKFALL", 100, 26, "#ccc");
        centered("Classic Terminal Puzzle System", 128, 12, "#555");

        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(220, 155, 200, 28);
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.strokeRect(220.5, 155.5, 199, 27);
        centered("ENTER = START", 174, 13, "#bbb");

        centered("HIGH SCORE: " + hiScore, 215, 13, "#444");
        centered("A/D or ARROWS = MOVE   W = ROTATE   S = DROP", 250, 10, "#333");
        centered("P = PAUSE   F = FULLSCREEN   ESC = MENU", 265, 10, "#333");

        return;
    }

    /* ---- BOARD BACKGROUND ---- */
    ctx.fillStyle = "#080808";
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

    /* Board grid lines */
    ctx.fillStyle = "#0f0f0f";
    for (var c = 0; c <= COLS; c++) {
        ctx.fillRect(BOARD_X + c * CELL, BOARD_Y, 1, BOARD_H);
    }
    for (var r = 0; r <= ROWS; r++) {
        ctx.fillRect(BOARD_X, BOARD_Y + r * CELL, BOARD_W, 1);
    }

    /* Board border */
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, BOARD_W + 2, BOARD_H + 2);

    /* ---- LOCKED BLOCKS ---- */
    for (var r = 0; r < ROWS; r++) {
        /* Flash effect: alternate light/dark */
        var isFlash = false;
        for (var fi = 0; fi < flashRows.length; fi++) {
            if (flashRows[fi] === r) { isFlash = true; break; }
        }
        for (var c = 0; c < COLS; c++) {
            if (board[r][c]) {
                var px = BOARD_X + c * CELL;
                var py = BOARD_Y + r * CELL;
                if (isFlash) {
                    ctx.fillStyle = flashTick % 2 === 0 ? "#fff" : "#555";
                    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
                } else {
                    drawBlock(px, py, "#aaa");
                }
            }
        }
    }

    /* ---- GHOST PIECE ---- */
    if (screen === SC_PLAY && !paused) {
        var gy = ghostY();
        if (gy !== piece.y) {
            var gcs = cells(piece, 0, 0, 0);
            for (var i = 0; i < gcs.length; i++) {
                var gc = piece.x + gcs[i][0];
                var gr = gy + gcs[i][1];
                if (gr >= 0) {
                    ctx.fillStyle = "#222";
                    ctx.fillRect(BOARD_X + gc * CELL + 1, BOARD_Y + gr * CELL + 1, CELL - 2, CELL - 2);
                    ctx.strokeStyle = "#444";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(BOARD_X + gc * CELL + 1.5, BOARD_Y + gr * CELL + 1.5, CELL - 3, CELL - 3);
                }
            }
        }
    }

    /* ---- ACTIVE PIECE ---- */
    if (screen === SC_PLAY && flashTick === 0) {
        var acs = cells(piece, 0, 0, 0);
        for (var i = 0; i < acs.length; i++) {
            var ac = piece.x + acs[i][0];
            var ar = piece.y + acs[i][1];
            if (ar >= 0) {
                drawBlock(BOARD_X + ac * CELL, BOARD_Y + ar * CELL, COLORS[piece.type]);
            }
        }
    }

    /* ---- SCORE PANEL ---- */
    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText("SCORE", PANEL_X, BOARD_Y + 16);
    ctx.fillStyle = "#fff";
    ctx.font = "13px monospace";
    ctx.fillText(score, PANEL_X, BOARD_Y + 32);

    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText("LINES", PANEL_X, BOARD_Y + 56);
    ctx.fillStyle = "#ddd";
    ctx.font = "13px monospace";
    ctx.fillText(lines, PANEL_X, BOARD_Y + 72);

    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText("LEVEL", PANEL_X, BOARD_Y + 96);
    ctx.fillStyle = "#ddd";
    ctx.font = "13px monospace";
    ctx.fillText(level, PANEL_X, BOARD_Y + 112);

    ctx.fillStyle = "#555";
    ctx.font = "11px monospace";
    ctx.fillText("HIGH", PANEL_X, BOARD_Y + 136);
    ctx.fillStyle = "#888";
    ctx.font = "12px monospace";
    ctx.fillText(hiScore, PANEL_X, BOARD_Y + 152);

    /* NEXT piece preview */
    ctx.fillStyle = "#444";
    ctx.font = "10px monospace";
    ctx.fillText("NEXT", PANEL_X, BOARD_Y + 178);

    var previewX = PANEL_X;
    var previewY = BOARD_Y + 184;
    ctx.fillStyle = "#080808";
    ctx.fillRect(previewX - 2, previewY - 2, CELL * 4 + 4, CELL * 3 + 4);
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.strokeRect(previewX - 1.5, previewY - 1.5, CELL * 4 + 3, CELL * 3 + 3);

    if (nextType !== undefined) {
        var ncs = PIECES[nextType][0];
        for (var i = 0; i < ncs.length; i++) {
            drawBlock(previewX + ncs[i][0] * CELL, previewY + ncs[i][1] * CELL, COLORS[nextType]);
        }
    }

    /* Utility buttons on panel */
    fillBtn(PANEL_X, BOARD_Y + 250, 55, 22, "P:PAUSE", paused);
    fillBtn(PANEL_X + 62, BOARD_Y + 250, 55, 22, "F:FULL", false);
    fillBtn(PANEL_X, BOARD_Y + 278, 117, 22, "ESC:MENU", false);

    /* ---- MOBILE D-PAD ---- */
    if (window.matchMedia("(pointer: coarse)").matches && screen === SC_PLAY) {
        fillBtn(BTN.left.x,   BTN.left.y,   BTN.left.w,   BTN.left.h,   "<",      false);
        fillBtn(BTN.right.x,  BTN.right.y,  BTN.right.w,  BTN.right.h,  ">",      false);
        fillBtn(BTN.rotate.x, BTN.rotate.y, BTN.rotate.w, BTN.rotate.h, "ROTATE", false);
        fillBtn(BTN.down.x,   BTN.down.y,   BTN.down.w,   BTN.down.h,   "v DROP", false);
    }

    /* ---- PAUSED OVERLAY ---- */
    if (paused && screen === SC_PLAY) {
        ctx.fillStyle = "#000";
        for (var pi = BOARD_Y; pi < BOARD_Y + BOARD_H; pi += 2) {
            ctx.fillRect(BOARD_X, pi, BOARD_W, 1);
        }
        centered("PAUSED", H >> 1, 18, "#aaa");
        centered("P = RESUME", (H >> 1) + 22, 11, "#555");
    }

    /* ---- DEATH SCREEN ---- */
    if (screen === SC_DEAD) {
        ctx.fillStyle = "#000";
        for (var di = 0; di < H; di += 2) {
            ctx.fillRect(0, di, W, 1);
        }
        centered("SYSTEM FAILURE", 130, 18, "#ccc");
        centered("SCORE: " + score, 162, 14, "#aaa");
        if (newHi) centered("*** NEW HIGH SCORE ***", 186, 12, "#888");
        centered("LINES: " + lines + "   LEVEL: " + level, 208, 12, "#666");

        ctx.fillStyle = "#111";
        ctx.fillRect(220, 225, 200, 28);
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.strokeRect(220.5, 225.5, 199, 27);
        centered("ENTER = PLAY AGAIN", 244, 13, "#bbb");
    }
}

/* ---------------------------------------------------------
   PANEL BUTTON CLICKS  (mouse)
--------------------------------------------------------- */

canvas.addEventListener("click", function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top)  * scaleY;

    if (screen === SC_MENU) {
        initGame(); return;
    }
    if (screen === SC_DEAD) {
        initGame(); return;
    }

    /* Panel buttons */
    if (screen === SC_PLAY) {
        /* PAUSE */
        if (hit(mx, my, {x: PANEL_X,      y: BOARD_Y + 250, w: 55,  h: 22})) { paused = !paused; return; }
        /* FULLSCREEN */
        if (hit(mx, my, {x: PANEL_X + 62, y: BOARD_Y + 250, w: 55,  h: 22})) { toggleFS(); return; }
        /* MENU */
        if (hit(mx, my, {x: PANEL_X,      y: BOARD_Y + 278, w: 117, h: 22})) { screen = SC_MENU; return; }
    }
});

/* ---------------------------------------------------------
   LOOP
--------------------------------------------------------- */

window.__gameInterval = setInterval(function () {
    update();
    draw();
}, 33);
