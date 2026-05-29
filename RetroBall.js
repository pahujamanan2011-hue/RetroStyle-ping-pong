/* =========================================================
   RETROBALL.JS  v2
   Terminal Pong – Fixed & Improved
   - Arrow keys no longer scroll the page
   - Ball vibration / shake fixed
   - Fullscreen mode (F key or button)
   - P = Pause, Escape = exit fullscreen
   - Start menu with Help screen & difficulty picker
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   CANVAS  (created dynamically so the page stays clean)
--------------------------------------------------------- */

var canvas = document.getElementById("pong");
var ctx    = canvas.getContext("2d", { alpha: false });

var W = canvas.width;   /* 640 */
var H = canvas.height;  /* 360 */

ctx.imageSmoothingEnabled = false;

/* ---------------------------------------------------------
   SETTINGS
--------------------------------------------------------- */

var WIN_SCORE  = 10;
var BALL_SIZE  = 8;
var PADDLE_W   = 6;
var PADDLE_H   = 70;
var PLAYER_X   = 14;
var CPU_X      = W - 20;

var DIFFICULTY = [
    { name: "EASY",   speed: 2, mistake: 0.12 },
    { name: "MEDIUM", speed: 3, mistake: 0.05 },
    { name: "HARD",   speed: 4, mistake: 0.01 }
];

/* ---------------------------------------------------------
   STATE
--------------------------------------------------------- */

var SCREEN_MENU = 0;
var SCREEN_HELP = 1;
var SCREEN_PLAY = 2;

var screen     = SCREEN_MENU;
var difficulty = 1;   /* default MEDIUM */
var paused     = false;
var gameOver   = false;

/* ---------------------------------------------------------
   SCORES / POSITIONS
--------------------------------------------------------- */

var playerScore = 0;
var cpuScore    = 0;

var playerY = (H >> 1) - (PADDLE_H >> 1);
var cpuY    = (H >> 1) - (PADDLE_H >> 1);

var ballX = W >> 1;
var ballY = H >> 1;
var ballVX = 6;
var ballVY = 3;

/* ---------------------------------------------------------
   INPUT  – prevent default on arrow keys to stop page scroll
--------------------------------------------------------- */

var up   = 0;
var down = 0;

document.addEventListener("keydown", function (e) {

    var k = e.code;

    /* Stop arrow keys / space from scrolling the page */
    if (k === "ArrowUp"   || k === "ArrowDown" ||
        k === "ArrowLeft" || k === "ArrowRight" ||
        k === "Space") {
        e.preventDefault();
    }

    if (k === "ArrowUp"   || k === "KeyW") { up   = 1; return; }
    if (k === "ArrowDown" || k === "KeyS") { down = 1; return; }

    /* P = pause (only in game) */
    if (k === "KeyP" && screen === SCREEN_PLAY && !gameOver) {
        paused = !paused;
        return;
    }

    /* F = toggle fullscreen */
    if (k === "KeyF") {
        toggleFullscreen();
        return;
    }

    /* Escape = exit fullscreen */
    if (k === "Escape") {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        return;
    }

    /* Enter / Space advance screens */
    if (k === "Enter" || k === "Space") {

        if (screen === SCREEN_MENU) {
            /* Enter on menu handled by mouse; but keyboard works too.
               We treat Enter as "Start Game" */
            startGame();
            return;
        }

        if (screen === SCREEN_HELP) {
            screen = SCREEN_MENU;
            return;
        }

        if (screen === SCREEN_PLAY && gameOver) {
            restartGame();
            return;
        }

        return;
    }

    /* D = cycle difficulty (on menu only) */
    if (k === "KeyD" && screen === SCREEN_MENU) {
        difficulty = (difficulty + 1) % 3;
        return;
    }

});

document.addEventListener("keyup", function (e) {
    var k = e.code;
    if (k === "ArrowUp"   || k === "KeyW") up   = 0;
    if (k === "ArrowDown" || k === "KeyS") down = 0;
});

/* ---------------------------------------------------------
   MOUSE – menu button clicks
   We track click position relative to canvas
--------------------------------------------------------- */

canvas.addEventListener("click", function (e) {

    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top)  * scaleY;

    if (screen === SCREEN_MENU) {

        /* START button  220..420  y 155..185 */
        if (mx >= 220 && mx <= 420 && my >= 155 && my <= 185) {
            startGame();
            return;
        }

        /* HELP button   220..420  y 200..230 */
        if (mx >= 220 && mx <= 420 && my >= 200 && my <= 230) {
            screen = SCREEN_HELP;
            return;
        }

        /* Difficulty buttons */
        /* EASY   130..230  y 270..295 */
        if (mx >= 130 && mx <= 230 && my >= 270 && my <= 295) {
            difficulty = 0; return;
        }
        /* MEDIUM 260..380  y 270..295 */
        if (mx >= 260 && mx <= 380 && my >= 270 && my <= 295) {
            difficulty = 1; return;
        }
        /* HARD   410..510  y 270..295 */
        if (mx >= 410 && mx <= 510 && my >= 270 && my <= 295) {
            difficulty = 2; return;
        }
    }

    if (screen === SCREEN_HELP) {
        screen = SCREEN_MENU;
        return;
    }
});

/* ---------------------------------------------------------
   FULLSCREEN
--------------------------------------------------------- */

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen && canvas.requestFullscreen();
    } else {
        document.exitFullscreen && document.exitFullscreen();
    }
}

/* ---------------------------------------------------------
   GAME FUNCTIONS
--------------------------------------------------------- */

function startGame() {
    playerScore = 0;
    cpuScore    = 0;
    gameOver    = false;
    paused      = false;
    playerY     = (H >> 1) - (PADDLE_H >> 1);
    cpuY        = (H >> 1) - (PADDLE_H >> 1);
    screen      = SCREEN_PLAY;
    resetBall();
}

function resetBall() {
    ballX  = W >> 1;
    ballY  = H >> 1;
    ballVX = (Math.random() < 0.5) ? 4 : -4;
    ballVY = ((Math.random() * 4) | 0) - 2;
    if (ballVY === 0) ballVY = 1;
}

function restartGame() {
    playerScore = 0;
    cpuScore    = 0;
    gameOver    = false;
    paused      = false;
    resetBall();
}

/* ---------------------------------------------------------
   UPDATE
--------------------------------------------------------- */

function update() {

    if (screen !== SCREEN_PLAY || paused || gameOver) return;

    /* PLAYER */
    playerY += (down - up) * 5;
    if (playerY < 0)             playerY = 0;
    if (playerY > H - PADDLE_H)  playerY = H - PADDLE_H;

    /* CPU AI */
    var ai = DIFFICULTY[difficulty];
    if (Math.random() > ai.mistake) {
        var mid = cpuY + (PADDLE_H >> 1);
        if (mid < ballY) cpuY += ai.speed;
        else if (mid > ballY) cpuY -= ai.speed;
    }
    if (cpuY < 0)            cpuY = 0;
    if (cpuY > H - PADDLE_H) cpuY = H - PADDLE_H;

    /* BALL MOVE */
    ballX += ballVX;
    ballY += ballVY;

    /* WALL BOUNCE */
    if (ballY <= 0) {
        ballY  = 0;
        ballVY = Math.abs(ballVY);   /* always bounce down */
    } else if (ballY >= H - BALL_SIZE) {
        ballY  = H - BALL_SIZE;
        ballVY = -Math.abs(ballVY);  /* always bounce up */
    }

    /* PLAYER PADDLE COLLISION */
    if (ballVX < 0 &&
        ballX       <= PLAYER_X + PADDLE_W &&
        ballX       >= PLAYER_X - 2 &&
        ballY + BALL_SIZE >= playerY &&
        ballY             <= playerY + PADDLE_H) {

        ballX  = PLAYER_X + PADDLE_W + 1;
        ballVX = 4;

        /* Angle based on hit position, clamped to avoid vibration */
        ballVY = ((ballY - (playerY + (PADDLE_H >> 1))) / 10) | 0;
        if (ballVY === 0) ballVY = (Math.random() < 0.5) ? 1 : -1;
    }

    /* CPU PADDLE COLLISION */
    else if (ballVX > 0 &&
             ballX + BALL_SIZE >= CPU_X - 1 &&
             ballX             <= CPU_X + PADDLE_W &&
             ballY + BALL_SIZE >= cpuY &&
             ballY             <= cpuY + PADDLE_H) {

        ballX  = CPU_X - BALL_SIZE - 1;
        ballVX = -4;

        ballVY = ((ballY - (cpuY + (PADDLE_H >> 1))) / 10) | 0;
        if (ballVY === 0) ballVY = (Math.random() < 0.5) ? 1 : -1;
    }

    /* SCORING */
    if (ballX < -BALL_SIZE) {
        cpuScore++;
        if (cpuScore >= WIN_SCORE) gameOver = true;
        else resetBall();
    } else if (ballX > W + BALL_SIZE) {
        playerScore++;
        if (playerScore >= WIN_SCORE) gameOver = true;
        else resetBall();
    }
}

/* ---------------------------------------------------------
   DRAW HELPERS
--------------------------------------------------------- */

function fillBtn(x, y, w, h, active) {
    ctx.fillStyle = active ? "#555" : "#1a1a1a";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = active ? "#aaa" : "#444";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function centeredText(txt, y, size) {
    ctx.font = size + "px monospace";
    var tw = ctx.measureText(txt).width;
    ctx.fillText(txt, (W - tw) >> 1, y);
}

/* ---------------------------------------------------------
   DRAW
--------------------------------------------------------- */

function draw() {

    /* CLEAR */
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    /* ---------- MENU SCREEN ---------- */
    if (screen === SCREEN_MENU) {

        ctx.fillStyle = "#aaa";
        centeredText("TERMINAL ARCADE", 60, 18);

        ctx.fillStyle = "#fff";
        centeredText("RETRO BALL", 100, 22);

        /* START button */
        fillBtn(220, 155, 200, 30, false);
        ctx.fillStyle = "#ccc";
        ctx.font = "14px monospace";
        ctx.fillText("START GAME", 268, 176);

        /* HELP button */
        fillBtn(220, 200, 200, 30, false);
        ctx.fillStyle = "#ccc";
        ctx.font = "14px monospace";
        ctx.fillText("HELP / KEYS", 263, 221);

        /* Difficulty label */
        ctx.fillStyle = "#777";
        ctx.font = "12px monospace";
        centeredText("SELECT DIFFICULTY:", 260, 12);

        /* 3 difficulty buttons */
        var dnames = ["EASY", "MEDIUM", "HARD"];
        var dbx    = [130,    260,      410];
        var dbw    = [100,    120,      100];

        for (var i = 0; i < 3; i++) {
            fillBtn(dbx[i], 270, dbw[i], 25, difficulty === i);
            ctx.fillStyle = difficulty === i ? "#fff" : "#888";
            ctx.font = "12px monospace";
            var tw = ctx.measureText(dnames[i]).width;
            ctx.fillText(dnames[i], dbx[i] + ((dbw[i] - tw) >> 1), 288);
        }

        ctx.fillStyle = "#444";
        ctx.font = "11px monospace";
        centeredText("D = CYCLE DIFFICULTY  |  ENTER = START  |  F = FULLSCREEN", 340, 11);

        return;
    }

    /* ---------- HELP SCREEN ---------- */
    if (screen === SCREEN_HELP) {

        ctx.fillStyle = "#aaa";
        centeredText("CONTROLS", 50, 16);

        ctx.fillStyle = "#888";
        ctx.font = "13px monospace";

        var lines = [
            "W / UP ARROW   - Move paddle up",
            "S / DOWN ARROW - Move paddle down",
            "P              - Pause / Resume",
            "F              - Toggle fullscreen",
            "ESC            - Exit fullscreen",
            "D              - Change difficulty (menu)",
            "ENTER          - Start / Restart"
        ];

        for (var i = 0; i < lines.length; i++) {
            var tw = ctx.measureText(lines[i]).width;
            ctx.fillText(lines[i], (W - tw) >> 1, 90 + i * 26);
        }

        ctx.fillStyle = "#555";
        centeredText("CLICK OR ENTER TO GO BACK", 330, 12);

        return;
    }

    /* ---------- PLAY SCREEN ---------- */

    /* Center dashed line */
    ctx.fillStyle = "#222";
    for (var y = 0; y < H; y += 18) {
        ctx.fillRect((W >> 1) - 1, y, 2, 10);
    }

    /* Paddles */
    ctx.fillStyle = "#aaa";
    ctx.fillRect(PLAYER_X, playerY | 0, PADDLE_W, PADDLE_H);
    ctx.fillRect(CPU_X,    cpuY    | 0, PADDLE_W, PADDLE_H);

    /* Ball */
    ctx.fillStyle = "#fff";
    ctx.fillRect(ballX | 0, ballY | 0, BALL_SIZE, BALL_SIZE);

    /* Score */
    ctx.fillStyle = "#aaa";
    ctx.font = "16px monospace";
    ctx.fillText(playerScore, 140, 25);
    ctx.fillText(cpuScore,    W - 150, 25);

    /* Difficulty label top center */
    ctx.fillStyle = "#444";
    ctx.font = "11px monospace";
    var dlabel = DIFFICULTY[difficulty].name;
    var dtw = ctx.measureText(dlabel).width;
    ctx.fillText(dlabel, (W - dtw) >> 1, 20);

    /* PAUSED overlay */
    if (paused) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#aaa";
        centeredText("PAUSED", 175, 20);
        ctx.fillStyle = "#555";
        centeredText("PRESS P TO RESUME", 210, 13);
    }

    /* GAME OVER overlay */
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        centeredText(playerScore > cpuScore ? "YOU WIN!" : "CPU WINS", 145, 18);
        ctx.fillStyle = "#aaa";
        centeredText(playerScore + "  -  " + cpuScore, 180, 16);
        ctx.fillStyle = "#666";
        centeredText("PRESS ENTER TO PLAY AGAIN", 230, 13);
        centeredText("CLICK RETRO BALL TO RETURN TO MENU", 255, 11);
    }
}

/* ---------------------------------------------------------
   MAIN LOOP  – fixed ~30 FPS, ultra-lightweight
--------------------------------------------------------- */

setInterval(function () {
    update();
    draw();
}, 33);
