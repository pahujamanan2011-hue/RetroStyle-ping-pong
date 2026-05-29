/* =========================================================
   RETROBALL.JS
   ULTRA-LIGHT TERMINAL PONG
   Optimized for VERY old Linux/Windows PCs
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   CANVAS
--------------------------------------------------------- */

const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
});

const W = canvas.width;
const H = canvas.height;

/* Disable smoothing completely */
ctx.imageSmoothingEnabled = false;

/* ---------------------------------------------------------
   GAME STATE
--------------------------------------------------------- */

let gameStarted = false;

/* ---------------------------------------------------------
   SCORES
--------------------------------------------------------- */

let playerScore = 0;
let cpuScore = 0;

/* ---------------------------------------------------------
   PADDLES
--------------------------------------------------------- */

const PW = 4;
const PH = 40;

const PLAYER_X = 8;
const CPU_X = W - 12;

let playerY = (H >> 1) - (PH >> 1);
let cpuY = (H >> 1) - (PH >> 1);

/* ---------------------------------------------------------
   BALL
--------------------------------------------------------- */

let ballX = W >> 1;
let ballY = H >> 1;

let ballVX = 4;
let ballVY = 2;

/* ---------------------------------------------------------
   INPUT
--------------------------------------------------------- */

let up = 0;
let down = 0;

document.addEventListener("keydown", function(e) {

    const c = e.code;

    if (c === "ArrowUp" || c === "KeyW")
        up = 1;

    else if (c === "ArrowDown" || c === "KeyS")
        down = 1;

    else if (c === "Enter")
        gameStarted = true;

});

document.addEventListener("keyup", function(e) {

    const c = e.code;

    if (c === "ArrowUp" || c === "KeyW")
        up = 0;

    else if (c === "ArrowDown" || c === "KeyS")
        down = 0;

});

/* ---------------------------------------------------------
   RESET BALL
--------------------------------------------------------- */

function resetBall() {

    ballX = W >> 1;
    ballY = H >> 1;

    ballVX = (Math.random() < 0.5) ? 4 : -4;

    ballVY = ((Math.random() * 4) | 0) - 2;

    if (ballVY === 0)
        ballVY = 1;
}

/* ---------------------------------------------------------
   UPDATE
--------------------------------------------------------- */

function update() {

    if (!gameStarted)
        return;

    /* PLAYER */

    playerY += (down - up) * 5;

    if (playerY < 0)
        playerY = 0;

    else if (playerY > H - PH)
        playerY = H - PH;

    /* SIMPLE CPU */

    if (cpuY + 18 < ballY)
        cpuY += 3;

    else if (cpuY + 18 > ballY)
        cpuY -= 3;

    if (cpuY < 0)
        cpuY = 0;

    else if (cpuY > H - PH)
        cpuY = H - PH;

    /* BALL */

    ballX += ballVX;
    ballY += ballVY;

    /* WALL */

    if (ballY <= 0 || ballY >= H - 4)
        ballVY = -ballVY;

    /* PLAYER HIT */

    if (
        ballX <= PLAYER_X + PW &&
        ballY + 4 >= playerY &&
        ballY <= playerY + PH
    ) {
        ballVX = 4;
    }

    /* CPU HIT */

    else if (
        ballX + 4 >= CPU_X &&
        ballY + 4 >= cpuY &&
        ballY <= cpuY + PH
    ) {
        ballVX = -4;
    }

    /* SCORE */

    if (ballX < 0) {

        cpuScore++;

        resetBall();
    }

    else if (ballX > W) {

        playerScore++;

        resetBall();
    }
}

/* ---------------------------------------------------------
   DRAW
--------------------------------------------------------- */

function draw() {

    /* CLEAR SCREEN */

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    /* MAIN COLOR */

    ctx.fillStyle = "#AAA";

    /* START SCREEN */

    if (!gameStarted) {

        ctx.font = "14px monospace";

        ctx.fillText("TERMINAL ARCADE", 220, 120);

        ctx.fillText("RETRO BALL", 250, 150);

        ctx.fillText("PRESS ENTER TO START", 190, 210);

        ctx.fillText("W/S OR ARROW KEYS", 200, 240);

        return;
    }

    /* CENTER LINE */

    let y = 0;

    while (y < H) {

        ctx.fillRect((W >> 1) - 1, y, 2, 8);

        y += 16;
    }

    /* PLAYER */

    ctx.fillRect(
        PLAYER_X,
        playerY | 0,
        PW,
        PH
    );

    /* CPU */

    ctx.fillRect(
        CPU_X,
        cpuY | 0,
        PW,
        PH
    );

    /* BALL */

    ctx.fillRect(
        ballX | 0,
        ballY | 0,
        4,
        4
    );

    /* SCORE */

    ctx.font = "14px monospace";

    ctx.fillText(playerScore, 120, 20);

    ctx.fillText(cpuScore, W - 120, 20);
}

/* ---------------------------------------------------------
   MAIN LOOP
--------------------------------------------------------- */

/*
   30 FPS FIXED LOOP
   MUCH LIGHTER than requestAnimationFrame
*/

setInterval(function() {

    update();

    draw();

}, 33);