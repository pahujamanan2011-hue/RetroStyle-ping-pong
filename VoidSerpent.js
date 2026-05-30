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

/* power-ups
   type 1 = BONUS  – collect for time-based bonus points (no grow)
   type 2 = DOUBLE – next N apples give 2 pts each (no grow)
*/
var pu         = null;   /* {x,y,type,ticks}  active power-up on grid */
var puTimer    = 0;      /* countdown ticks while pu is on screen      */
var PU_TICKS   = 150;    /* 5 seconds at 30fps                         */
var puSpawnAt  = 5;      /* score threshold to spawn next power-up     */
var puBlink    = 0;

/* active effects */
var doubleActive = false;   /* double-score mode on         */
var doubleMoves  = 0;       /* apples left in double mode   */
var DOUBLE_COUNT = 5;       /* apples to double             */

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
    tongueTimer  = 0;
    tongueOn     = false;
    pu           = null;
    puTimer      = 0;
    puSpawnAt    = 5;
    puBlink      = 0;
    doubleActive = false;
    doubleMoves  = 0;
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

function spawnPowerUp() {
    var px, py, blocked;
    var type = (Math.random() < 0.5) ? 1 : 2;  /* 1=bonus 2=double */
    do {
        px = (Math.random() * COLS) | 0;
        py = (Math.random() * ROWS) | 0;
        blocked = (px === food.x && py === food.y);
        for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === px && snake[i].y === py) { blocked = true; break; }
        }
    } while (blocked);
    pu      = {x: px, y: py, type: type};
    puTimer = PU_TICKS;
    puBlink = 0;
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

/* Touch swipe controls */
var touchStartX = 0;
var touchStartY = 0;

canvas.addEventListener("touchstart", function (e) {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener("touchend", function (e) {
    e.preventDefault();
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    var adx = dx < 0 ? -dx : dx;
    var ady = dy < 0 ? -dy : dy;

    if (screen === SC_MENU || screen === SC_DEAD) {
        initGame(); screen = SC_PLAY; return;
    }

    if (screen !== SC_PLAY) return;

    /* Minimum swipe distance */
    if (adx < 10 && ady < 10) return;

    if (adx > ady) {
        /* Horizontal swipe */
        if (dx > 0 && dir.x === 0) nextDir = {x: 1, y: 0};
        if (dx < 0 && dir.x === 0) nextDir = {x:-1, y: 0};
    } else {
        /* Vertical swipe */
        if (dy > 0 && dir.y === 0) nextDir = {x: 0, y: 1};
        if (dy < 0 && dir.y === 0) nextDir = {x: 0, y:-1};
    }
}, { passive: false });

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

    /* Power-up blink + countdown */
    if (pu) {
        puBlink = (puBlink + 1) % 30;
        puTimer--;
        if (puTimer <= 0) { pu = null; }
    }

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

    /* Wall wrap – Nokia style */
    if (nx < 0)    nx = COLS - 1;
    if (nx >= COLS) nx = 0;
    if (ny < 0)    ny = ROWS - 1;
    if (ny >= ROWS) ny = 0;

    /* Self collision */
    for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === nx && snake[i].y === ny) { die(); return; }
    }

    /* Prepend new head */
    snake.unshift({x: nx, y: ny});

    /* Eat power-up? */
    if (pu && nx === pu.x && ny === pu.y) {
        var secsLeft = (puTimer / 30) | 0;  /* seconds remaining 0-5 */
        if (secsLeft < 1) secsLeft = 1;

        if (pu.type === 1) {
            /* BONUS: 2 pts per second remaining */
            var bonus = secsLeft * 2;
            score += bonus;
            if (score > hiScore) { hiScore = score; newHi = true; saveHi(); }
        } else {
            /* DOUBLE: activate double-score mode */
            doubleActive = true;
            doubleMoves  = DOUBLE_COUNT;
        }
        pu = null;
        snake.pop();   /* no growth */
        return;
    }

    /* Eat food? */
    if (nx === food.x && ny === food.y) {
        var pts = 1;
        if (doubleActive) {
            pts = 2;
            doubleMoves--;
            if (doubleMoves <= 0) { doubleActive = false; }
            snake.pop();   /* no growth in double mode */
        }
        score += pts;
        if (score > hiScore) { hiScore = score; newHi = true; saveHi(); }
        /* Speed up every 5 points, min 3 ticks */
        if (score % 5 === 0 && speed > 3) speed--;
        /* Spawn power-up every 5 points */
        if (score >= puSpawnAt && !pu) {
            puSpawnAt += 5;
            spawnPowerUp();
        }
        spawnFood();
    } else {
        snake.pop();
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

    /* ---- FOOD  – apple with green stem ---- */
    var fx2 = gx(food.x);
    var fy2 = gy(food.y);
    if (foodBlink < 22) {
        ctx.fillStyle = foodBlink < 11 ? "#993333" : "#772222";
    } else {
        ctx.fillStyle = "#441111";
    }
    /* Apple body */
    ctx.fillRect(fx2 + 3, fy2 + 5, CELL - 6, CELL - 7);
    /* Stem – green */
    ctx.fillStyle = "#336633";
    ctx.fillRect(fx2 + (CELL >> 1) - 1, fy2 + 2, 2, 4);
    /* Leaf – tiny green dot */
    ctx.fillRect(fx2 + (CELL >> 1) + 1, fy2 + 3, 3, 2);

    /* ---- POWER-UP ---- */
    if (pu) {
        var px2  = gx(pu.x);
        var py2  = gy(pu.y);
        /* Blink faster in last 60 ticks */
        var vis = (puTimer > 60) ? (puBlink < 22) : (puBlink < 15);
        if (vis) {
            if (pu.type === 1) {
                /* BONUS – bright yellow-ish star shape (just a cross) */
                ctx.fillStyle = "#aaaa00";
                ctx.fillRect(px2 + (CELL >> 1) - 1, py2 + 2,  2, CELL - 4);
                ctx.fillRect(px2 + 2, py2 + (CELL >> 1) - 1,  CELL - 4, 2);
            } else {
                /* DOUBLE – cyan-ish diamond */
                ctx.fillStyle = "#007777";
                ctx.fillRect(px2 + (CELL >> 1) - 1, py2 + 2,  2, CELL - 4);
                ctx.fillRect(px2 + 2, py2 + (CELL >> 1) - 1,  CELL - 4, 2);
                ctx.fillRect(px2 + 4, py2 + 4, CELL - 8, CELL - 8);
            }
        }

        /* Power-up timer bar in HUD center */
        var secsLeft2 = ((puTimer / PU_TICKS) * 100) | 0;
        var barW = ((secsLeft2 / 100) * 120) | 0;
        var barX = (W - 120) >> 1;
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(barX, 4, 120, 10);
        ctx.fillStyle = pu.type === 1 ? "#888800" : "#006666";
        ctx.fillRect(barX, 4, barW, 10);
        /* Label */
        ctx.fillStyle = pu.type === 1 ? "#cccc00" : "#00aaaa";
        ctx.font = "9px monospace";
        var lbl = pu.type === 1 ? "BONUS x2/sec" : "DOUBLE SCORE";
        var ltw = ctx.measureText(lbl).width;
        ctx.fillText(lbl, (W - ltw) >> 1, 22);

        /* Seconds remaining number */
        var secNum = ((puTimer / 30) | 0) + 1;
        ctx.fillStyle = "#888";
        ctx.font = "9px monospace";
        ctx.fillText(secNum + "s", barX + 124, 13);
    }

    /* Double-score active indicator */
    if (doubleActive) {
        ctx.fillStyle = "#00aaaa";
        ctx.font = "9px monospace";
        var dlbl = "x2 (" + doubleMoves + ")";
        ctx.fillText(dlbl, W - 60, 32);
    }

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
