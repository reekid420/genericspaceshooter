const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 400;

const player = {x: 50, y: 200, w: 40, h: 20, speed: 5, health: 100, score: 0, lastShot: 0, invulnerable: 0};
let bullets = [], enemies = [], powerUps = [];
let gameOver = false;
const keys = {};

function drawTriangle(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + height / 2);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();
}

function gameLoop() {
  if (gameOver) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('Game Over - Score: ' + player.score, 250, 200);
    return;
  }

  ctx.fillStyle = '#000033';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
  if (keys.ArrowDown && player.y < canvas.height - player.h) player.y += player.speed;

  bullets = bullets.filter(b => {
    b.x += b.speed;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
    return b.x < canvas.width;
  });

  enemies = enemies.filter(e => {
    e.x -= e.speed;
    drawTriangle(e.x, e.y, e.w, e.h, 'red');
    return e.x > -e.w;
  });

  powerUps = powerUps.filter(p => {
    p.x -= 1;
    ctx.fillStyle = 'blue';
    ctx.fillRect(p.x, p.y, 15, 15);
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(p.type[0].toUpperCase(), p.x + 4, p.y + 12);
    return p.x > -15;
  });

  if (player.invulnerable > 0) {
    player.invulnerable--;
    if (player.invulnerable % 10 < 5) {  // Flashing effect
      drawTriangle(player.x, player.y, player.w, player.h, 'rgba(0,255,0,0.5)');
    }
  } else {
    drawTriangle(player.x, player.y, player.w, player.h, 'lime');
  }

  if (Math.random() < 0.02) {
    enemies.push({x: canvas.width, y: Math.random() * (canvas.height - 20), w: 30, h: 20, speed: 2 + Math.random() * 2});
  }
  if (Math.random() < 0.005) {
    powerUps.push({x: canvas.width, y: Math.random() * (canvas.height - 15), type: Math.random() < 0.5 ? 'health' : 'score'});
  }

  bullets.forEach(b => {
    enemies.forEach((e, ei) => {
      if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
        enemies.splice(ei, 1);
        player.score += 10;
      }
    });
  });

  if (player.invulnerable === 0) {
    enemies.forEach(e => {
      if (player.x < e.x + e.w && player.x + player.w > e.x &&
          player.y < e.y + e.h && player.y + player.h > e.y) {
        player.health -= 10;
        player.invulnerable = 60;  // 1 second invulnerability (assuming 60 FPS)
        if (player.health <= 0) gameOver = true;
      }
    });
  }

  powerUps.forEach((p, pi) => {
    if (player.x < p.x + 15 && player.x + player.w > p.x &&
        player.y < p.y + 15 && player.y + player.h > p.y) {
      if (p.type === 'health') player.health = Math.min(100, player.health + 20);
      else player.score += 50;
      powerUps.splice(pi, 1);
    }
  });

  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('Health: ' + player.health + ' Score: ' + player.score, 10, 30);

  requestAnimationFrame(gameLoop);
}

function shoot() {
  const now = Date.now();
  if (now - player.lastShot > 250) {  // 250ms cooldown
    bullets.push({x: player.x + player.w, y: player.y + player.h / 2, speed: 8, size: 3, color: 'yellow'});
    player.lastShot = now;
  }
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') shoot();
});
window.addEventListener('keyup', e => keys[e.code] = false);

gameLoop();