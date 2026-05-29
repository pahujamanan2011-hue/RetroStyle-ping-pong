/* =========================================================
   TERMINAL PONG — ULTRA LIGHT VERSION
   Designed for OLD PCs and Linux systems
   No audio
   No overlays
   No animations
   No transparency
   No gradients
   No heavy math
   Fixed 30 FPS
   ========================================================= */

"use strict";

/* ---------- CANVAS ---------- */

const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d", {
  alpha: false,
  desynchronized: true
});

const W = canvas.width;
const H = canvas.height;

/* Disable smoothing */
ctx.imageSmoothingEnabled = false;

/* ---------- GAME STATE ---------- */

let running = false;

/* ---------- PLAYER ---------- */

const PADDLE_W = 4;
const PADDLE_H = 44;

const PLAYER_X = 8;
const CPU_X = W - 12;

let playerY = (H >> 1) - (PADDLE_H >> 1);
let cpuY    = (H >> 1) - (PADDLE_H >> 1);

/* ---------- BALL ---------- */

let ballX = W >> 1;
let ballY = H >> 1;

let ballVX = 4;
let ballVY = 2;

/* ---------- SCORE ---------- */

let playerScore = 0;
let cpuScore = 0;

/* ---------- INPUT ---------- */

let up = false;
let down = false;

document.addEventListener("keydown", function(e) {

  if (e.code === "ArrowUp" || e.code === "KeyW")
    up = true;

  if (e.code === "ArrowDown" || e.code === "KeyS")
    down = true;

  if (e.code === "Enter")
    running = true;

});

document.addEventListener("keyup", function(e) {

  if (e.code === "ArrowUp" || e.code === "KeyW")
    up = false;

  if (e.code === "ArrowDown" || e.code === "KeyS")
    down = false;

});

/* ---------- RESET BALL ---------- */

function resetBall() {

  ballX = W >> 1;
  ballY = H >> 1;

  ballVX = (Math.random() < 0.5) ? 4 : -4;

  /* VERY LIGHT RANDOM */
  ballVY = ((Math.random() * 4) | 0) - 2;

  if (ballVY === 0)
    ballVY = 1;
}

/* ---------- UPDATE ---------- */

function update() {

  if (!running)
    return;

  /* PLAYER */

  if (up)
    playerY -= 5;

  if (down)
    playerY += 5;

  /* LIMITS */

  if (playerY < 0)
    playerY = 0;

  if (playerY > H - PADDLE_H)
    playerY = H - PADDLE_H;

  /* SIMPLE CPU */

  if (cpuY + 20 < ballY)
    cpuY += 3;
  else if (cpuY + 20 > ballY)
    cpuY -= 3;

  /* LIMIT CPU */

  if (cpuY < 0)
    cpuY = 0;

  if (cpuY > H - PADDLE_H)
    cpuY = H - PADDLE_H;

  /* BALL */

  ballX += ballVX;
  ballY += ballVY;

  /* TOP/BOTTOM */

  if (ballY <= 0 || ballY >= H - 4)
    ballVY = -ballVY;

  /* PLAYER HIT */

  if (
    ballX <= PLAYER_X + PADDLE_W &&
    ballY + 4 >= playerY &&
    ballY <= playerY + PADDLE_H
  ) {
    ballVX = 4;
  }

  /* CPU HIT */

  if (
    ballX + 4 >= CPU_X &&
    ballY + 4 >= cpuY &&
    ballY <= cpuY + PADDLE_H
  ) {
    ballVX = -4;
  }

  /* SCORE */

  if (ballX < 0) {
    cpuScore++;
    resetBall();
  }

  if (ballX > W) {
    playerScore++;
    resetBall();
  }
}

/* ---------- DRAW ---------- */

function draw() {

  /* CLEAR */

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  /* COLOR */

  ctx.fillStyle = "#AAA";

  /* CENTER LINE */

  for (let y = 0; y < H; y += 16) {
    ctx.fillRect((W >> 1) - 1, y, 2, 8);
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
    4,
    4
  );

  /* TEXT */

  ctx.font = "12px monospace";

  ctx.fillText(playerScore, 120, 20);
  ctx.fillText(cpuScore, W - 120, 20);

  /* START SCREEN */

  if (!running) {

    ctx.fillText("TERMINAL PONG", 220, 140);
    ctx.fillText("PRESS ENTER", 225, 170);

    ctx.fillText("W/S OR ARROWS", 210, 210);

  }
}

/* ---------- MAIN LOOP ---------- */

/*
  setInterval is lighter on old systems
  than uncapped requestAnimationFrame
*/

setInterval(function() {

  update();
  draw();

}, 33); // ~30 FPS