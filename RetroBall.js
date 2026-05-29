/* =========================================================
   RETROBALL.JS
   Optimized Terminal Pong
   Lightweight + Better AI + Fixed Bugs
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

ctx.imageSmoothingEnabled = false;

/* ---------------------------------------------------------
   SETTINGS
--------------------------------------------------------- */

const WIN_SCORE = 10;

/* Bigger objects */
const BALL_SIZE = 8;

const PADDLE_W = 6;
const PADDLE_H = 70;

/* Positions */
const PLAYER_X = 14;
const CPU_X = W - 20;

/* Difficulty */
const DIFFICULTY = [
    {
        name: "EASY",
        speed: 2,
        mistake: 0.12
    },
    {
        name: "MEDIUM",
        speed: 3,
        mistake: 0.05
    },
    {
        name: "HARD",
        speed: 4,
        mistake: 0.01
    }
];

let difficulty = 1;

/* ---------------------------------------------------------
   STATE
--------------------------------------------------------- */

let started = false;
let gameOver = false;

/* ---------------------------------------------------------
   SCORES
--------------------------------------------------------- */

let playerScore = 0;
let cpuScore = 0;

/* ---------------------------------------------------------
   PLAYER
--------------------------------------------------------- */

let playerY = (H >> 1) - (PADDLE_H >> 1);
let cpuY = (H >> 1) - (PADDLE_H >> 1);

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

    const k = e.code;

    if (k === "ArrowUp" || k === "KeyW")
        up = 1;

    else if (k === "ArrowDown" || k === "KeyS")
        down = 1;

    else if (k === "Enter") {

        if (!started) {
            started = true;
        }

        else if (gameOver) {
            restartGame();
        }
    }

    else if (k === "KeyD") {

        difficulty++;

        if (difficulty > 2)
            difficulty = 0;
    }

});

document.addEventListener("keyup", function(e) {

    const k = e.code;

    if (k === "ArrowUp" || k === "KeyW")
        up = 0;

    else if (k === "ArrowDown" || k === "KeyS")
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
   RESTART
--------------------------------------------------------- */

function restartGame() {

    playerScore = 0;
    cpuScore = 0;

    gameOver = false;

    resetBall();
}

/* ---------------------------------------------------------
   UPDATE
--------------------------------------------------------- */

function update() {

    if (!started || gameOver)
        return;

    /* PLAYER */

    playerY += (down - up) * 5;

    if (playerY < 0)
        playerY = 0;

    else if (playerY > H - PADDLE_H)
        playerY = H - PADDLE_H;

    /* CPU AI */

    const ai = DIFFICULTY[difficulty];

    /*
       Mistake system:
       Sometimes AI intentionally reacts wrong
       making it beatable.
    */

    if (Math.random() > ai.mistake) {

        if (cpuY + (PADDLE_H >> 1) < ballY)
            cpuY += ai.speed;

        else if (cpuY + (PADDLE_H >> 1) > ballY)
            cpuY -= ai.speed;
    }

    if (cpuY < 0)
        cpuY = 0;

    else if (cpuY > H - PADDLE_H)
        cpuY = H - PADDLE_H;

    /* BALL */

    ballX += ballVX;
    ballY += ballVY;

    /* WALL */

    if (ballY <= 0) {

        ballY = 0;

        ballVY = -ballVY;
    }

    else if (ballY >= H - BALL_SIZE) {

        ballY = H - BALL_SIZE;

        ballVY = -ballVY;
    }

    /* PLAYER COLLISION */

    if (
        ballVX < 0 &&

        ballX <= PLAYER_X + PADDLE_W &&
        ballX >= PLAYER_X &&

        ballY + BALL_SIZE >= playerY &&
        ballY <= playerY + PADDLE_H
    ) {

        ballX = PLAYER_X + PADDLE_W;

        ballVX = 4;

        /*
           Add angle depending on hit position
        */

        ballVY = (
            (ballY - (playerY + (PADDLE_H >> 1)))
            / 10
        ) | 0;
    }

    /* CPU COLLISION */

    else if (
        ballVX > 0 &&

        ballX + BALL_SIZE >= CPU_X &&
        ballX <= CPU_X + PADDLE_W &&

        ballY + BALL_SIZE >= cpuY &&
        ballY <= cpuY + PADDLE_H
    ) {

        ballX = CPU_X - BALL_SIZE;

        ballVX = -4;

        ballVY = (
            (ballY - (cpuY + (PADDLE_H >> 1)))
            / 10
        ) | 0;
    }

    /* SCORE FIX */

    /*
       Score immediately when ball crosses edge.
       No late paddle save bug anymore.
    */

    if (ballX < -BALL_SIZE) {

        cpuScore++;

        if (cpuScore >= WIN_SCORE)
            gameOver = true;

        resetBall();
    }

    else if (ballX > W + BALL_SIZE) {

        playerScore++;

        if (playerScore >= WIN_SCORE)
            gameOver = true;

        resetBall();
    }
}

/* ---------------------------------------------------------
   DRAW
--------------------------------------------------------- */

function draw() {

    /* CLEAR */

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#AAA";

    /* START SCREEN */

    if (!started) {

        ctx.font = "14px monospace";

        ctx.fillText("TERMINAL ARCADE", 210, 110);

        ctx.fillText("RETRO BALL", 240, 145);

        ctx.fillText("ENTER = START", 225, 190);

        ctx.fillText("D = CHANGE DIFFICULTY", 170, 220);

        ctx.fillText(
            "MODE: " + DIFFICULTY[difficulty].name,
            215,
            260
        );

        return;
    }

    /* GAME OVER */

    if (gameOver) {

        ctx.font = "16px monospace";

        if (playerScore > cpuScore)
            ctx.fillText("YOU WIN", 250, 140);
        else
            ctx.fillText("CPU WINS", 245, 140);

        ctx.fillText(
            playerScore + " - " + cpuScore,
            270,
            180
        );

        ctx.fillText(
            "PRESS ENTER",
            225,
            240
        );
    }

    /* CENTER LINE */

    let y = 0;

    while (y < H) {

        ctx.fillRect((W >> 1) - 1, y, 2, 10);

        y += 18;
    }

    /* PLAYER */

    ctx.fillRect(
        PLAYER_X,
        playerY | 0,
        PADDLE_W,
        PADDLE_H
    );

    /* CPU */

    ctx.fillRect(
        CPU_X,
        cpuY | 0,
        PADDLE_W,
        PADDLE_H
    );

    /* BALL */

    ctx.fillRect(
        ballX | 0,
        ballY | 0,
        BALL_SIZE,
        BALL_SIZE
    );

    /* SCORE */

    ctx.font = "16px monospace";

    ctx.fillText(playerScore, 140, 25);

    ctx.fillText(cpuScore, W - 150, 25);

    /* MODE */

    ctx.font = "11px monospace";

    ctx.fillText(
        DIFFICULTY[difficulty].name,
        (W >> 1) - 25,
        20
    );
}

/* ---------------------------------------------------------
   MAIN LOOP
--------------------------------------------------------- */

/*
   Fixed 30 FPS
   Lighter than requestAnimationFrame
*/

setInterval(function() {

    update();

    draw();

}, 33);