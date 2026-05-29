/* ============================================================
   GAME VISUALISER — game.js
   Retro Pong, Canvas 2D only, no libraries, no frameworks
   Optimised for low-spec Linux systems
   ============================================================ */

"use strict";

/* ── Canvas & context ───────────────────────────────────────── */
const canvas  = document.getElementById("pong");
const ctx     = canvas.getContext("2d");

const W = canvas.width;   // 600
const H = canvas.height;  // 360

/* ── DOM refs ────────────────────────────────────────────────── */
const overlay      = document.getElementById("overlay");
const menuMain     = document.getElementById("menu-main");
const menuPause    = document.getElementById("menu-pause");
const menuGameover = document.getElementById("menu-gameover");
const goTitle      = document.getElementById("go-title");
const goSub        = document.getElementById("go-sub");
const statusMsg    = document.getElementById("status-msg");
const statusFps    = document.getElementById("status-fps");
const pScoreEl     = document.getElementById("p-score");
const aScoreEl     = document.getElementById("a-score");

/* ── Buttons ─────────────────────────────────────────────────── */
document.getElementById("btn-start")     .addEventListener("click", startGame);
document.getElementById("btn-difficulty").addEventListener("click", cycleDifficulty);
document.getElementById("btn-sound")     .addEventListener("click", toggleSound);
document.getElementById("btn-quit")      .addEventListener("click", () => window.close());
document.getElementById("btn-resume")    .addEventListener("click", resumeGame);
document.getElementById("btn-restart")   .addEventListener("click", startGame);
document.getElementById("btn-mainmenu")  .addEventListener("click", showMain);
document.getElementById("btn-playagain") .addEventListener("click", startGame);
document.getElementById("btn-gomainmenu").addEventListener("click", showMain);

/* ── Game state ──────────────────────────────────────────────── */
const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3 };
let state = STATE.MENU;

/* ── Settings ────────────────────────────────────────────────── */
const DIFFICULTY = ["EASY", "MEDIUM", "HARD"];
let diffIdx    = 1;                  // default: MEDIUM
let soundOn    = true;

/* AI speed per difficulty (pixels per frame) */
const AI_SPEED = [1.8, 2.9, 4.2];

/* ── Physics constants ───────────────────────────────────────── */
const PADDLE_W   = 10;
const PADDLE_H   = 64;
const BALL_R     = 7;
const PLAYER_X   = 18;
const AI_X       = W - 18 - PADDLE_W;
const WIN_SCORE  = 7;
const BASE_SPEED = 4.0;
const MAX_SPEED  = 9.0;

/* ── Game objects ────────────────────────────────────────────── */
let player, ai, ball, playerScore, aiScore;

function resetObjects() {
  player = { x: PLAYER_X,  y: H / 2 - PADDLE_H / 2, dy: 0 };
  ai     = { x: AI_X,      y: H / 2 - PADDLE_H / 2 };
  resetBall();
  playerScore = 0;
  aiScore     = 0;
  pScoreEl.textContent = 0;
  aScoreEl.textContent = 0;
}

function resetBall(towardPlayer) {
  /* serve toward whoever last scored, or random */
  const dir = (towardPlayer === undefined) ? (Math.random() < 0.5 ? 1 : -1) : (towardPlayer ? -1 : 1);
  const angle = (Math.random() * 0.6 - 0.3);  // ±0.3 rad
  ball = {
    x:  W / 2,
    y:  H / 2,
    vx: Math.cos(angle) * BASE_SPEED * dir,
    vy: Math.sin(angle) * BASE_SPEED
  };
}

/* ── Input ───────────────────────────────────────────────────── */
const keys = {};
document.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (e.code === "Escape") {
    if (state === STATE.PLAYING) pauseGame();
    else if (state === STATE.PAUSED) resumeGame();
  }
  if (e.code === "Enter" && state === STATE.MENU) startGame();
  if (e.code === "Enter" && state === STATE.PAUSED) resumeGame();

  /* prevent page scroll */
  if (["ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault();
});
document.addEventListener("keyup", e => { keys[e.code] = false; });

/* ── Audio (tiny beeps via Web Audio) ───────────────────────── */
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  catch(e) { soundOn = false; }
}

function beep(freq, dur, vol) {
  if (!soundOn || !audioCtx) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = vol || 0.06;
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

const SFX = {
  paddle : () => beep(320, 0.04, 0.05),
  wall   : () => beep(220, 0.03, 0.04),
  score  : () => beep(110, 0.12, 0.07),
  start  : () => beep(440, 0.06, 0.05)
};

/* ── FPS counter (lightweight) ───────────────────────────────── */
let fpsFrames = 0, fpsLast = performance.now(), fpsDisplay = 0;

function updateFps(now) {
  fpsFrames++;
  if (now - fpsLast >= 1000) {
    fpsDisplay = fpsFrames;
    fpsFrames  = 0;
    fpsLast    = now;
    statusFps.textContent = fpsDisplay + " FPS";
  }
}

/* ── Menu helpers ────────────────────────────────────────────── */
function showMenu(which) {
  overlay.classList.add("active");
  menuMain.classList.remove("active");
  menuPause.classList.remove("active");
  menuGameover.classList.remove("active");
  which.classList.add("active");
}

function hideOverlay() {
  overlay.classList.remove("active");
  menuMain.classList.remove("active");
  menuPause.classList.remove("active");
  menuGameover.classList.remove("active");
}

function showMain() {
  state = STATE.MENU;
  statusMsg.textContent = "READY";
  showMenu(menuMain);
}

function cycleDifficulty() {
  diffIdx = (diffIdx + 1) % DIFFICULTY.length;
  document.getElementById("btn-difficulty").textContent = "AI: " + DIFFICULTY[diffIdx];
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("btn-sound").textContent = "SOUND: " + (soundOn ? "ON" : "OFF");
}

function startGame() {
  initAudio();
  resetObjects();
  state = STATE.PLAYING;
  statusMsg.textContent = "PLAYING";
  hideOverlay();
  SFX.start();
}

function pauseGame() {
  state = STATE.PAUSED;
  statusMsg.textContent = "PAUSED";
  showMenu(menuPause);
}

function resumeGame() {
  state = STATE.PLAYING;
  statusMsg.textContent = "PLAYING";
  hideOverlay();
}

function gameOver(playerWon) {
  state = STATE.GAMEOVER;
  goTitle.textContent = playerWon ? "YOU WIN" : "YOU LOSE";
  goSub.textContent   = "PLR " + playerScore + "  —  CPU " + aiScore;
  statusMsg.textContent = playerWon ? "PLAYER WINS" : "CPU WINS";
  showMenu(menuGameover);
  SFX.score();
}

/* ── Update logic ────────────────────────────────────────────── */
const PADDLE_SPEED = 5.5;

function update() {
  if (state !== STATE.PLAYING) return;

  /* --- Player movement --- */
  if (keys["KeyW"] || keys["ArrowUp"]) {
    player.y -= PADDLE_SPEED;
  }
  if (keys["KeyS"] || keys["ArrowDown"]) {
    player.y += PADDLE_SPEED;
  }
  player.y = Math.max(0, Math.min(H - PADDLE_H, player.y));

  /* --- AI movement --- */
  const aiCenter = ai.y + PADDLE_H / 2;
  const aiSpd    = AI_SPEED[diffIdx];
  if (ball.vx > 0) {                         // ball coming toward AI
    if (aiCenter < ball.y - 4) ai.y += aiSpd;
    else if (aiCenter > ball.y + 4) ai.y -= aiSpd;
  } else {                                   // ball moving away — drift to center
    if (aiCenter < H / 2 - 4) ai.y += aiSpd * 0.4;
    else if (aiCenter > H / 2 + 4) ai.y -= aiSpd * 0.4;
  }
  ai.y = Math.max(0, Math.min(H - PADDLE_H, ai.y));

  /* --- Ball movement --- */
  ball.x += ball.vx;
  ball.y += ball.vy;

  /* --- Wall bounce (top/bottom) --- */
  if (ball.y - BALL_R <= 0) {
    ball.y = BALL_R;
    ball.vy = Math.abs(ball.vy);
    SFX.wall();
  }
  if (ball.y + BALL_R >= H) {
    ball.y = H - BALL_R;
    ball.vy = -Math.abs(ball.vy);
    SFX.wall();
  }

  /* --- Paddle collision helper --- */
  function hitPaddle(paddle) {
    return (
      ball.x - BALL_R < paddle.x + PADDLE_W &&
      ball.x + BALL_R > paddle.x &&
      ball.y - BALL_R < paddle.y + PADDLE_H &&
      ball.y + BALL_R > paddle.y
    );
  }

  /* --- Player paddle --- */
  if (ball.vx < 0 && hitPaddle(player)) {
    /* calculate deflection based on hit position on paddle */
    const rel    = (ball.y - (player.y + PADDLE_H / 2)) / (PADDLE_H / 2); // -1 to 1
    const angle  = rel * 0.9;  // max ~51°
    const spd    = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, MAX_SPEED);
    ball.vx =  Math.cos(angle) * spd;
    ball.vy =  Math.sin(angle) * spd;
    ball.x  = player.x + PADDLE_W + BALL_R;  // push out of paddle
    SFX.paddle();
  }

  /* --- AI paddle --- */
  if (ball.vx > 0 && hitPaddle(ai)) {
    const rel   = (ball.y - (ai.y + PADDLE_H / 2)) / (PADDLE_H / 2);
    const angle = rel * 0.9;
    const spd   = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, MAX_SPEED);
    ball.vx = -Math.cos(angle) * spd;
    ball.vy =  Math.sin(angle) * spd;
    ball.x  = ai.x - BALL_R;
    SFX.paddle();
  }

  /* --- Scoring --- */
  if (ball.x + BALL_R < 0) {
    aiScore++;
    aScoreEl.textContent = aiScore;
    SFX.score();
    if (aiScore >= WIN_SCORE) { gameOver(false); return; }
    resetBall(false);  // serve toward player
  }
  if (ball.x - BALL_R > W) {
    playerScore++;
    pScoreEl.textContent = playerScore;
    SFX.score();
    if (playerScore >= WIN_SCORE) { gameOver(true); return; }
    resetBall(true);   // serve toward AI
  }
}

/* ── Draw ────────────────────────────────────────────────────── */

/* Pre-compute scanline pattern once into an offscreen canvas */
const scanCanvas = document.createElement("canvas");
scanCanvas.width  = W;
scanCanvas.height = H;
const scanCtx = scanCanvas.getContext("2d");
(function buildScanlines() {
  scanCtx.fillStyle = "rgba(0,0,0,0.07)";
  for (let y = 0; y < H; y += 3) {
    scanCtx.fillRect(0, y, W, 1);
  }
})();

function draw() {
  /* Background */
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, H);

  /* Center dashed line */
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "#2a2626";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  if (state === STATE.MENU || state === STATE.GAMEOVER) {
    /* Draw a still placeholder scene */
    drawPaddle(player);
    drawPaddle(ai);
    drawBall();
    ctx.drawImage(scanCanvas, 0, 0);
    return;
  }

  /* Paddles */
  drawPaddle(player);
  drawPaddle(ai);

  /* Ball */
  drawBall();

  /* Scanline overlay — very cheap, one draw call */
  ctx.drawImage(scanCanvas, 0, 0);
}

function drawPaddle(p) {
  /* Main paddle body */
  ctx.fillStyle = "#c0b8b8";
  ctx.fillRect(p.x, p.y, PADDLE_W, PADDLE_H);

  /* Simple inset shading — top 1px lighter, bottom 1px darker */
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(p.x, p.y, PADDLE_W, 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(p.x, p.y + PADDLE_H - 2, PADDLE_W, 2);
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = "#e0d8d8";
  ctx.fill();

  /* Tiny dark edge for depth */
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* ── Main loop ───────────────────────────────────────────────── */
/* FPS cap: 60 is plenty; on weak hardware the browser itself throttles */
let lastTime = 0;
const FRAME_MS = 1000 / 60;

function loop(now) {
  requestAnimationFrame(loop);

  const delta = now - lastTime;
  if (delta < FRAME_MS - 1) return;   // skip frame if too soon
  lastTime = now;

  update();
  draw();
  updateFps(now);
}

/* ── Boot ────────────────────────────────────────────────────── */
resetObjects();
showMain();
requestAnimationFrame(loop);
