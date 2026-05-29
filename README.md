# RetroStyle-ping-pong
# 🕹️ GAME VISUALISER — Retro Pong

> A lightweight retro-style Pong game inspired by old 90s desktop game visualizers.  
> Dark. Minimal. Nostalgic. Built to run on anything.

---

## 📸 About

**GAME VISUALISER** is a classic Pong recreation styled after retro utility software from the Windows XP / early Linux era. It features a dark charcoal UI, flat geometry, scanline overlays, and deliberately minimal visuals — designed to feel like something you'd find on a dusty CD-ROM from 2001.

This is an **AI-assisted project**, built by [Manan Pahuja](https://github.com/mananpahuja) in collaboration with **Claude** (by Anthropic). The entire game — logic, visuals, and UI — was designed and generated with the help of Claude AI.

---

## ✨ Features

- Classic Pong gameplay with a circular ball
- Player vs AI with 3 difficulty levels (Easy / Medium / Hard)
- Retro dark-gray UI styled like an old desktop utility
- Lightweight scanline effect (single draw call)
- Tiny square-wave beep sound effects via Web Audio API
- FPS-capped game loop — runs smoothly on low-spec hardware
- Score tracker with win condition (first to 7)
- Pause menu, Game Over screen, and Main Menu
- Sound toggle and difficulty toggle
- Zero dependencies — pure HTML5 + CSS + Vanilla JS

---

## 🗂️ File Structure

```
retro-pong/
├── index.html      # App window shell, layout, menus
├── style.css       # Retro dark UI styling
├── game.js         # All game logic, physics, AI, audio, rendering
└── README.md       # You are here
```

---

## 🚀 Getting Started

No build step. No install. No server required.

```bash
# Clone the repo
git clone https://github.com/mananpahuja/retro-pong.git

# Enter the folder
cd retro-pong

# Open in your browser
firefox index.html
# or
chromium index.html
```

Works on any modern browser. Optimised for **Firefox and Chromium on Linux**.

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Move paddle up |
| `S` / `↓` | Move paddle down |
| `Enter` | Start game / Resume from pause |
| `ESC` | Pause game / Open pause menu |

**In-menu buttons:**

| Button | Action |
|--------|--------|
| `START` | Begin a new game |
| `AI: EASY / MEDIUM / HARD` | Cycle AI difficulty |
| `SOUND: ON / OFF` | Toggle beep sound effects |
| `QUIT` | Close the window |

---

## ⚙️ Performance

Designed to run on extremely low-spec hardware:

- Canvas 2D only — no WebGL, no shaders
- No external libraries or frameworks
- FPS capped at 60 with early-exit frame skipping
- Scanlines rendered once to an offscreen canvas
- Minimal DOM, no heavy redraws
- Fast startup — loads instantly

Tested on Firefox and Chromium on Linux.

---

## 🤖 AI Project

This game was **created with Claude**, an AI assistant by [Anthropic](https://www.anthropic.com).  
The design, code architecture, visual style, game logic, and this README were all produced through a conversation between the developer and Claude.

> **Developer:** Manan Pahuja  
> **AI Assistant:** Claude by Anthropic  
> **Project Type:** AI-Assisted Game Development

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*"It should feel like an old-school minimal utility from a retro Linux machine."*
