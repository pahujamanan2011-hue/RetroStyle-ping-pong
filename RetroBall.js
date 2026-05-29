"use strict";

const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
const W = canvas.width;
const H = canvas.height;

ctx.imageSmoothingEnabled = false;

/* SETTINGS */
const WIN_SCORE = 10;
const BALL_SIZE = 8;
const PADDLE_W = 6;
const PADDLE_H = 70;
const PLAYER_X = 14;
const CPU_X = W - 20;

const DIFFICULTY = [
    { name: "EASY",   speed: 2, mistake: 0.15 },
    { name: "MEDIUM", speed: 3, mistake: 0.06 },
    { name: "HARD",   speed: 4, mistake: 0.01 }
];

let difficulty = 1;
let started = false;
let paused = false;
let gameOver = false;

let playerScore = 0;
let cpuScore = 0;

let playerY = (H >> 1) - (PADDLE_H >> 1);
let cpuY = (H >> 1) - (PADDLE_H >> 1);

let ballX = W >> 1;
let ballY = H >> 1;
let ballVX = 4;
let ballVY = 2;

let up = 0, down = 0;

/* ====================== INPUT ====================== */
document.addEventListener("keydown", e => {
    const k = e.code;

    if (k === "ArrowUp" || k === "KeyW") { up = 1; e.preventDefault(); }
    if (k === "ArrowDown" || k === "KeyS") { down = 1; e.preventDefault(); }

    if (k === "KeyP") paused = !paused;

    if (k === "KeyF") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    }

    if (k === "Enter") {
        if (!started) started = true;
        else if (gameOver) restartGame();
    }

    if (k === "KeyD" && !started) {
        difficulty = (difficulty + 1) % 3;
    }
});

document.addEventListener("keyup", e => {
    const k = e.code;
    if (k === "ArrowUp" || k === "KeyW") up = 0;
    if (k === "ArrowDown" || k === "KeyS") down = 0;
});

/* ====================== GAME FUNCTIONS ====================== */
function resetBall() {
    ballX = W >> 1;
    ballY = H >> 1;
    ballVX = (Math.random() < 0.5) ? 4 : -4;
    ballVY = ((Math.random() * 4) | 0) - 2;
    if (ballVY === 0) ballVY = 1;
}

function restartGame() {
    playerScore = 0;
    cpuScore = 0;
    gameOver = false;
    paused = false;
    resetBall();
}

/* ====================== UPDATE ====================== */
function update() {
    if (!started || gameOver || paused) return;

    // Player
    playerY += (down - up) * 5;
    playerY = Math.max(0, Math.min(H - PADDLE_H, playerY));

    // CPU AI
    const ai = DIFFICULTY[difficulty];
    if (Math.random() > ai.mistake) {
        const target = ballY + (BALL_SIZE >> 1);
        const paddleCenter = cpuY + (PADDLE_H >> 1);
        if (paddleCenter < target) cpuY += ai.speed;
        else if (paddleCenter > target) cpuY -= ai.speed;
    }
    cpuY = Math.max(0, Math.min(H - PADDLE_H, cpuY));

    // Ball
    ballX += ballVX;
    ballY += ballVY;

    // Wall bounce
    if (ballY <= 0) { ballY = 0; ballVY = -ballVY; }
    if (ballY >= H - BALL_SIZE) { ballY = H - BALL_SIZE; ballVY = -ballVY; }

    // Player collision
    if (ballVX < 0 &&
        ballX <= PLAYER_X + PADDLE_W &&
        ballX >= PLAYER_X &&
        ballY + BALL_SIZE >= playerY &&
        ballY <= playerY + PADDLE_H) {
        
        ballX = PLAYER_X + PADDLE_W;
        ballVX = 4;
        ballVY = ((ballY - (playerY + (PADDLE_H >> 1))) / 10) | 0;
    }

    // CPU collision
    else if (ballVX > 0 &&
        ballX + BALL_SIZE >= CPU_X &&
        ballX <= CPU_X + PADDLE_W &&
        ballY + BALL_SIZE >= cpuY &&
        ballY <= cpuY + PADDLE_H) {
        
        ballX = CPU_X - BALL_SIZE;
        ballVX = -4;
        ballVY = ((ballY - (cpuY + (PADDLE_H >> 1))) / 10) | 0;
    }

    // Scoring
    if (ballX < -BALL_SIZE) {
        cpuScore++;
        if (cpuScore >= WIN_SCORE) gameOver = true;
        resetBall();
    } else if (ballX > W + BALL_SIZE) {
        playerScore++;
        if (playerScore >= WIN_SCORE) gameOver = true;
        resetBall();
    }
}

/* ====================== DRAW ====================== */
function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#AAA";

    if (!started) {
        ctx.font = "14px monospace";
        ctx.fillText("TERMINAL ARCADE", 200, 100);
        ctx.fillText("RETRO BALL", 245, 135);
        ctx.fillText("PRESS ENTER TO START", 190, 190);
        ctx.fillText("D = CHANGE DIFFICULTY", 195, 220);
        ctx.fillText("MODE: " + DIFFICULTY[difficulty].name, 230, 255);
        return;
    }

    if (gameOver) {
        ctx.font = "16px monospace";
        ctx.fillText(playerScore > cpuScore ? "YOU WIN" : "CPU WINS", 245, 140);
        ctx.fillText(playerScore + " - " + cpuScore, 270, 180);
        ctx.fillText("PRESS ENTER TO RESTART", 190, 240);
        return;
    }

    if (paused) {
        ctx.font = "16px monospace";
        ctx.fillText("PAUSED", 270, 180);
    }

    // Center line
    for (let y = 0; y < H; y += 18) {
        ctx.fillRect((W >> 1) - 1, y, 2, 10);
    }

    // Paddles
    ctx.fillRect(PLAYER_X, playerY | 0, PADDLE_W, PADDLE_H);
    ctx.fillRect(CPU_X, cpuY | 0, PADDLE_W, PADDLE_H);

    // Ball
    ctx.fillRect(ballX | 0, ballY | 0, BALL_SIZE, BALL_SIZE);

    // Score
    ctx.font = "16px monospace";
    ctx.fillText(playerScore, 140, 30);
    ctx.fillText(cpuScore, W - 150, 30);

    // Mode
    ctx.font = "11px monospace";
    ctx.fillText(DIFFICULTY[difficulty].name, (W >> 1) - 30, 20);
}

/* ====================== MAIN LOOP ====================== */
setInterval(() => {
    update();
    draw();
}, 33); // \~30 FPS - perfect for old machines