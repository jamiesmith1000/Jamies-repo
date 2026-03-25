const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

const PADDLE_W = 12;
const PADDLE_H = 80;
const BALL_SIZE = 12;
const PADDLE_SPEED = 5;
const BALL_SPEED_INIT = 5;
const WINNING_SCORE = 7;

const state = {
  running: false,
  over: false,
  left:  { y: H / 2 - PADDLE_H / 2, score: 0, up: false, down: false },
  right: { y: H / 2 - PADDLE_H / 2, score: 0, up: false, down: false },
  ball: resetBall(),
};

function resetBall() {
  const angle = (Math.random() * Math.PI / 3) - Math.PI / 6; // ±30°
  const dir = Math.random() < 0.5 ? 1 : -1;
  return {
    x: W / 2,
    y: H / 2,
    vx: dir * BALL_SPEED_INIT * Math.cos(angle),
    vy: BALL_SPEED_INIT * Math.sin(angle),
  };
}

// Input
document.addEventListener('keydown', e => {
  if (e.key === 'w' || e.key === 'W') state.left.up = true;
  if (e.key === 's' || e.key === 'S') state.left.down = true;
  if (e.key === 'ArrowUp')   { state.right.up = true;   e.preventDefault(); }
  if (e.key === 'ArrowDown') { state.right.down = true;  e.preventDefault(); }
  if (e.key === 'Enter') {
    if (state.over) {
      state.left.score = 0;
      state.right.score = 0;
      state.left.y = H / 2 - PADDLE_H / 2;
      state.right.y = H / 2 - PADDLE_H / 2;
      state.ball = resetBall();
      state.over = false;
    }
    state.running = !state.running;
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'w' || e.key === 'W') state.left.up = false;
  if (e.key === 's' || e.key === 'S') state.left.down = false;
  if (e.key === 'ArrowUp')   state.right.up = false;
  if (e.key === 'ArrowDown') state.right.down = false;
});

// Touch controls
function clientToCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (W / rect.width),
    y: (clientY - rect.top)  * (H / rect.height),
  };
}

const touchState = { left: null, right: null };

canvas.addEventListener('touchstart', e => {
  e.preventDefault();

  // Two-finger tap = pause
  if (e.touches.length === 2 && state.running) {
    state.running = false;
    return;
  }

  // Tap to start / restart
  if (!state.running) {
    if (state.over) {
      state.left.score  = 0;
      state.right.score = 0;
      state.left.y  = H / 2 - PADDLE_H / 2;
      state.right.y = H / 2 - PADDLE_H / 2;
      state.ball = resetBall();
      state.over = false;
    }
    state.running = true;
  }

  for (const touch of e.changedTouches) {
    const pos = clientToCanvas(touch.clientX, touch.clientY);
    if (pos.x < W / 2 && touchState.left === null) {
      touchState.left = touch.identifier;
      state.left.y = Math.max(0, Math.min(H - PADDLE_H, pos.y - PADDLE_H / 2));
    } else if (pos.x >= W / 2 && touchState.right === null) {
      touchState.right = touch.identifier;
      state.right.y = Math.max(0, Math.min(H - PADDLE_H, pos.y - PADDLE_H / 2));
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const pos = clientToCanvas(touch.clientX, touch.clientY);
    if (touch.identifier === touchState.left) {
      state.left.y = Math.max(0, Math.min(H - PADDLE_H, pos.y - PADDLE_H / 2));
    } else if (touch.identifier === touchState.right) {
      state.right.y = Math.max(0, Math.min(H - PADDLE_H, pos.y - PADDLE_H / 2));
    }
  }
}, { passive: false });

function handleTouchEnd(e) {
  for (const touch of e.changedTouches) {
    if (touch.identifier === touchState.left)  touchState.left  = null;
    if (touch.identifier === touchState.right) touchState.right = null;
  }
}
canvas.addEventListener('touchend',    handleTouchEnd);
canvas.addEventListener('touchcancel', handleTouchEnd);

function movePaddle(paddle) {
  if (paddle.up)   paddle.y -= PADDLE_SPEED;
  if (paddle.down) paddle.y += PADDLE_SPEED;
  paddle.y = Math.max(0, Math.min(H - PADDLE_H, paddle.y));
}

function update() {
  if (!state.running) return;

  movePaddle(state.left);
  movePaddle(state.right);

  const b = state.ball;
  b.x += b.vx;
  b.y += b.vy;

  // Top/bottom walls
  if (b.y <= 0) { b.y = 0; b.vy *= -1; }
  if (b.y + BALL_SIZE >= H) { b.y = H - BALL_SIZE; b.vy *= -1; }

  // Left paddle collision
  const lp = state.left;
  if (b.x <= PADDLE_W + 20 && b.x >= 20 &&
      b.y + BALL_SIZE >= lp.y && b.y <= lp.y + PADDLE_H) {
    b.x = PADDLE_W + 20;
    b.vx = Math.abs(b.vx) * 1.05;
    b.vy += ((b.y + BALL_SIZE / 2) - (lp.y + PADDLE_H / 2)) * 0.1;
    b.vx = Math.min(b.vx, 15);
  }

  // Right paddle collision
  const rp = state.right;
  if (b.x + BALL_SIZE >= W - PADDLE_W - 20 && b.x + BALL_SIZE <= W - 20 &&
      b.y + BALL_SIZE >= rp.y && b.y <= rp.y + PADDLE_H) {
    b.x = W - PADDLE_W - 20 - BALL_SIZE;
    b.vx = -Math.abs(b.vx) * 1.05;
    b.vy += ((b.y + BALL_SIZE / 2) - (rp.y + PADDLE_H / 2)) * 0.1;
    b.vx = Math.max(b.vx, -15);
  }

  // Scoring
  if (b.x < 0) {
    state.right.score++;
    checkWin();
    state.ball = resetBall();
  }
  if (b.x > W) {
    state.left.score++;
    checkWin();
    state.ball = resetBall();
  }
}

function checkWin() {
  if (state.left.score >= WINNING_SCORE || state.right.score >= WINNING_SCORE) {
    state.running = false;
    state.over = true;
  }
}

function drawRect(x, y, w, h, color = '#fff') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawText(text, x, y, size = 24, align = 'center') {
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function drawDashedCenter() {
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);
}

function draw() {
  // Background
  drawRect(0, 0, W, H, '#000');

  drawDashedCenter();

  // Scores
  drawText(state.left.score, W / 4, 60, 48);
  drawText(state.right.score, (3 * W) / 4, 60, 48);

  // Paddles
  drawRect(20, state.left.y, PADDLE_W, PADDLE_H);
  drawRect(W - 20 - PADDLE_W, state.right.y, PADDLE_W, PADDLE_H);

  // Ball
  drawRect(state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE);

  // Overlay messages
  if (state.over) {
    const winner = state.left.score >= WINNING_SCORE ? 'Left Player' : 'Right Player';
    drawText(`${winner} Wins!`, W / 2, H / 2 - 20, 40);
    drawText('Tap to play again', W / 2, H / 2 + 30, 18);
  } else if (!state.running) {
    drawText('PONG', W / 2, H / 2 - 20, 52);
    drawText('Tap to start', W / 2, H / 2 + 30, 18);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
