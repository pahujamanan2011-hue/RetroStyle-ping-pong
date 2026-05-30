/* =========================================================
   VOIDSERPENT.JS
   Terminal Snake – Void Serpent
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
   GRID
--------------------------------------------------------- */

var CELL  = 16;                        /* px per cell       */
var COLS  = (W / CELL) | 0;           /* 40                */
var ROWS  = ((H - 32) / CELL) | 0;    /* 20  (top 32 = HUD)*/
var OY    = 32;                        /* y-offset for grid */

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
var hiScore = 0;

/* Load high score */
try { hiScore = parseInt(localStorage.getItem("vs_hi") || "0", 10); } catch(e){}

function saveHi() {
    try { localStorage.setItem("vs_hi", hiScore); } catch(e){}
}

/* ---------------------------------------------------------
   SNAKE STATE
--------------------------------------------------------- */

var snake;      /* array of {x,y} head-first */
var dir;        /* {x,y} current direction   */
var nextDir;    /* queued direction           */
var food;       /* {x,y}                     */
var paused;
var newHi;

/* tongue */
var tongueTimer  = 0;
var tongueOn     = false;
var TONGUE_EVERY = 90;   /* ticks between shows */
var TONGUE_TICKS = 6;

/* food blink */
var foodBlink = 0;

/* speed: ticks per move (lower = faster) */
var BASE_SPEED  = 8;    /* ~3.75 moves/sec at 30fps */
var speed;              /* decreases as score grows  */
var moveTick;

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */

function initGame() {
    var sx = (COLS >> 1);
    var sy = (ROWS >> 1);
    snake    = [ {x:sx, y:sy}, {x:sx-1, y:sy}, {x:sx-2, y:sy} ];
    dir      = {x:1, y:0};
    nextDir  = {x:1, y:0};
    score    = 0;
    paused   = false;
    newHi    = false;
    speed    = BASE_SPEED;
    moveTick = 0;
    tongueTimer = 0;
    tongueOn    = false;
    spawnFood();
}

function spawnFood() {
    var fx, fy, onSnake;
    do {
        fx = (Math.random() * COLS) | 0;
        fy = (Math.random() * ROWS) | 0;
        onSnake = false;
        for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === fx && snake[i].y === fy) { onSnake = true; break; }
        }
    } while (onSnake);
    food = {x: fx, y: fy};
    foodBlink = 0;
}

/* ---------------------------------------------------------
   INPUT
--------------------------------------------------------- */

document.addEventListener("keydown", function (e) {

    var k = e.code;

    if (k === "ArrowUp" || k === "ArrowDown" ||
        k === "ArrowLeft" || k === "ArrowRight" || k === "Space") {
        e.preventDefault();
    }

    /* Pause */
    if (k === "KeyP" && screen === SC_PLAY) {
        paused = !paused; return;
    }

    /* Fullscreen */
    if (k === "KeyF") {
        if (!document.fullscreenElement) {
            if (canvas.requestFullscreen) canvas.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
        return;
    }

    /* Menu start */
    if (screen === SC_MENU && (k === "Enter" || k === "Space")) {
        initGame(); screen = SC_PLAY; return;
    }

    /* Restart after death */
    if (screen === SC_DEAD && (k === "Enter" || k === "Space")) {
        initGame(); screen = SC_PLAY; return;
    }

    /* Direction */
    if (screen !== SC_PLAY) return;

    if ((k === "ArrowUp"    || k === "KeyW") && dir.y === 0) { nextDir = {x:0,  y:-1}; }
    if ((k === "ArrowDown"  || k === "KeyS") && dir.y === 0) { nextDir = {x:0,  y: 1}; }
    if ((k === "ArrowLeft"  || k === "KeyA") && dir.x === 0) { nextDir = {x:-1, y: 0}; }
    if ((k === "ArrowRight" || k === "KeyD") && dir.x === 0) { nextDir = {x: 1, y: 0}; }
});

/* Menu click */
canvas.addEventListener("click", function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top)  * scaleY;

    if (screen === SC_MENU) {
        /* START button 220..420  y 160..190 */
        if (mx >= 220 && mx <= 420 && my >= 160 && my <= 190) {
            initGame(); screen = SC_PLAY;
        }
    }
    if (screen === SC_DEAD) {
        if (mx >= 220 && mx <= 420 && my >= 200 && my <= 230) {
            initGame(); screen = SC_PLAY;
        }
    }
});

/* ---------------------------------------------------------
   UPDATE
--------------------------------------------------------- */

function update() {

    if (screen !== SC_PLAY || paused) return;

    /* Tongue timer */
    tongueTimer++;
    if (tongueTimer >= TONGUE_EVERY) {
        tongueOn    = true;
        tongueTimer = 0;
    }
    if (tongueOn && tongueTimer >= TONGUE_TICKS) {
        tongueOn = false;
    }

    /* Food blink counter */
    foodBlink = (foodBlink + 1) % 30;

    /* Move on tick */
    moveTick++;
    if (moveTick < speed) return;
    moveTick = 0;

    /* Apply queued direction */
    dir = nextDir;

    /* New head */
    var head = snake[0];
    var nx = head.x + dir.x;
    var ny = head.y + dir.y;

    /* Wall collision */
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        die(); return;
    }

    /* Self collision */
    for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === nx && snake[i].y === ny) { die(); return; }
    }

    /* Prepend new head */
    snake.unshift({x: nx, y: ny});

    /* Eat food? */
    if (nx === food.x && ny === food.y) {
        score++;
        if (score > hiScore) { hiScore = score; newHi = true; saveHi(); }
        /* Speed up every 5 points, min 3 ticks */
        if (score % 5 === 0 && speed > 3) speed--;
        spawnFood();
    } else {
        snake.pop();  /* remove tail only if no food eaten */
    }
}

function die() {
    screen = SC_DEAD;
}

/* ---------------------------------------------------------
   DRAW HELPERS
--------------------------------------------------------- */

function gx(cx) { return cx * CELL; }
function gy(cy) { return OY + cy * CELL; }

function fillBtn(x, y, w, h) {
    ctx.fillStyle = "#111";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function centered(txt, y, size, col) {
    ctx.fillStyle = col || "#aaa";
    ctx.font = size + "px monospace";
    var tw = ctx.measureText(txt).width;
    ctx.fillText(txt, (W - tw) >> 1, y);
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
        ctx.fillStyle = "#444";
        centered("TERMINAL ARCADE", 55, 13, "#444");
        centered("VOID SERPENT", 95, 24, "#ccc");
        ctx.fillStyle = "#555";
        centered("TERMINAL SNAKE SURVIVAL SYSTEM", 125, 11, "#555");

        fillBtn(220, 160, 200, 30);
        centered("START GAME", 181, 14, "#bbb");

        ctx.font = "11px monospace";
        centered("WASD / ARROWS = MOVE   P = PAUSE   F = FULLSCREEN", 230, 11, "#333");

        /* HI score */
        centered("HIGH SCORE: " + hiScore, 270, 13, "#444");

        return;
    }

    /* ---- HUD (both play and dead) ---- */
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, OY);

    ctx.fillStyle = "#aaa";
    ctx.font = "13px monospace";
    ctx.fillText("SCORE: " + score, 10, 20);

    ctx.fillStyle = "#555";
    ctx.fillText("HIGH: " + hiScore, 10, 34 - 2);

    ctx.fillStyle = "#333";
    ctx.font = "11px monospace";
    var spd_label = "SPD:" + (BASE_SPEED - speed + 1);
    ctx.fillText(spd_label, W - 60, 20);

    if (paused) {
        ctx.fillStyle = "#666";
        ctx.font = "13px monospace";
        centered("[ PAUSED ]", 22, 13, "#666");
    }

    /* ---- GRID ---- */
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, OY, W, H - OY);

    /* Subtle grid lines */
    ctx.fillStyle = "#0d0d0d";
    for (var gxi = 0; gxi <= COLS; gxi++) {
        ctx.fillRect(gxi * CELL, OY, 1, H - OY);
    }
    for (var gyi = 0; gyi <= ROWS; gyi++) {
        ctx.fillRect(0, OY + gyi * CELL, W, 1);
    }

    /* ---- FOOD ---- */
    /* Blink: visible for 20 ticks, dark for 10 */
    if (foodBlink < 22) {
        ctx.fillStyle = foodBlink < 11 ? "#883333" : "#662222";
    } else {
        ctx.fillStyle = "#331111";
    }
    ctx.fillRect(gx(food.x) + 3, gy(food.y) + 3, CELL - 6, CELL - 6);

    /* ---- SNAKE ---- */
    for (var si = snake.length - 1; si >= 0; si--) {
        var seg = snake[si];
        var sx  = gx(seg.x);
        var sy2 = gy(seg.y);

        if (si === 0) {
            /* Head – white */
            ctx.fillStyle = "#ddd";
            ctx.fillRect(sx + 1, sy2 + 1, CELL - 2, CELL - 2);

            /* Eyes – tiny dark dots */
            ctx.fillStyle = "#000";
            var ex = (dir.x === -1) ? sx + 2  : sx + CELL - 6;
            var ey = sy2 + 4;
            ctx.fillRect(ex, ey,     2, 2);
            ctx.fillRect(ex, ey + 6, 2, 2);

            /* Tongue – red, appears randomly */
            if (tongueOn) {
                ctx.fillStyle = "#cc0000";
                var tx = sx + (CELL >> 1) - 1;
                var ty = sy2 + (CELL >> 1) - 1;
                if      (dir.x ===  1) { ctx.fillRect(sx + CELL - 1, ty, 5, 1); ctx.fillRect(sx + CELL + 2, ty - 1, 2, 1); ctx.fillRect(sx + CELL + 2, ty + 2, 2, 1); }
                else if (dir.x === -1) { ctx.fillRect(sx - 5,        ty, 5, 1); ctx.fillRect(sx - 7, ty - 1, 2, 1); ctx.fillRect(sx - 7, ty + 2, 2, 1); }
                else if (dir.y === -1) { ctx.fillRect(tx, sy2 - 5,   1, 5); ctx.fillRect(tx - 1, sy2 - 7, 1, 2); ctx.fillRect(tx + 2, sy2 - 7, 1, 2); }
                else                   { ctx.fillRect(tx, sy2 + CELL - 1, 1, 5); ctx.fillRect(tx - 1, sy2 + CELL + 2, 1, 2); ctx.fillRect(tx + 2, sy2 + CELL + 2, 1, 2); }
            }

        } else {
            /* Body – slightly dimmer, with texture lines */
            var bright = si < 4 ? "#bbb" : si < 10 ? "#999" : "#777";
            ctx.fillStyle = bright;
            ctx.fillRect(sx + 2, sy2 + 2, CELL - 4, CELL - 4);

            /* Single texture stripe */
            ctx.fillStyle = "#333";
            if (si % 2 === 0) {
                ctx.fillRect(sx + 4, sy2 + (CELL >> 1) - 1, CELL - 8, 2);
            } else {
                ctx.fillRect(sx + (CELL >> 1) - 1, sy2 + 4, 2, CELL - 8);
            }
        }
    }

    /* ---- DEATH SCREEN ---- */
    if (screen === SC_DEAD) {
        /* Dark overlay – draw manually without alpha */
        /* Stripe every 2 rows to fake semi-dark overlay, lightweight */
        ctx.fillStyle = "#000";
        for (var di = 0; di < H; di += 2) {
            ctx.fillRect(0, di, W, 1);
        }

        ctx.fillStyle = "#ccc";
        centered("VOID SERPENT", 120, 18, "#ccc");
        centered("-- SYSTEM FAILURE --", 148, 12, "#555");
        centered("SCORE: " + score, 175, 14, "#aaa");

        if (newHi) centered("*** NEW HIGH SCORE ***", 200, 13, "#888");

        fillBtn(220, 215, 200, 30);
        centered("PLAY AGAIN", 236, 14, "#bbb");

        centered("ENTER / SPACE / CLICK", 270, 11, "#333");
    }
}

/* ---------------------------------------------------------
   LOOP – expose interval so index.html can kill it on back
--------------------------------------------------------- */

window.__gameInterval = setInterval(function () {
    update();
    draw();
}, 33);
