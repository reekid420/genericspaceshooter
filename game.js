const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const COLORS = {
    bg: '#000033', player: '#00FF00', enemy: '#FF0000', bullet: '#FFFF00',
    powerUp: { health: '#00FF00', score: '#0000FF' }, text: '#FFFFFF',
    guns: { default: '#FFFF00', spread: '#FF00FF', rapid: '#00FFFF' }
};

const GUNS = {
    default: { cooldown: 250, bulletSpeed: 8, bulletSize: 3, color: COLORS.guns.default },
    spread: { cooldown: 750, bulletSpeed: 6, bulletSize: 2, color: COLORS.guns.spread },
    rapid: { cooldown: 50, bulletSpeed: 10, bulletSize: 4, color: COLORS.guns.rapid }
};

const player = {
    x: 50, y: canvas.height / 2, w: 50, h: 30, baseSpeed: 5, speed: 5,
    minSpeed: 1, maxSpeed: 20,
    health: 100, score: 0, lastShot: 0, invulnerable: 0,
    currentGun: 'default', gunDuration: 0
};
let bullets = [], enemies = [], powerUps = [], stars = [], gameOver = false, level = 1;
const keys = {};

// Create stars
for (let i = 0; i < 200; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: 0.1 + Math.random() * 0.3
    });
}

function drawStarryBackground() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        star.x -= star.speed * player.speed / player.baseSpeed;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
    });
}

function drawDetailedShip(x, y, w, h, color, isPlayer) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // Add details
    ctx.strokeStyle = isPlayer ? '#00FFFF' : '#FF00FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, y + h * 0.3);
    ctx.lineTo(x + w * 0.4, y + h * 0.5);
    ctx.lineTo(x + w * 0.1, y + h * 0.7);
    ctx.stroke();

    // Add window
    ctx.fillStyle = '#87CEEB';
    ctx.beginPath();
    ctx.arc(x + w * 0.7, y + h * 0.5, h * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Add speed indicator for player
    if (isPlayer) {
        const speedRatio = (player.speed - player.minSpeed) / (player.maxSpeed - player.minSpeed);
        ctx.fillStyle = `rgb(${255 * speedRatio}, ${255 * (1 - speedRatio)}, 0)`;
        ctx.fillRect(x - 10, y, 5, h);
        ctx.fillRect(x - 10, y + h * (1 - speedRatio), 5, h * speedRatio);
    }

    // Add gun indicator for player
    if (isPlayer) {
        ctx.fillStyle = GUNS[player.currentGun].color;
        ctx.fillRect(x + w, y + h / 2 - 5, 10, 10);
    }
}

function spawnEnemy() {
    const size = 30 + Math.random() * 20;
    enemies.push({
        x: canvas.width, y: Math.random() * (canvas.height - size),
        w: size, h: size * 0.6, speed: 2 + Math.random() * 2 + level * 0.5
    });
}

function spawnPowerUp() {
    const type = Math.random() < 0.6 ? 'gun' : (Math.random() < 0.5 ? 'health' : 'score');
    let gunType = 'default';
    if (type === 'gun') {
        gunType = Math.random() < 0.5 ? 'spread' : 'rapid';
    }
    powerUps.push({
        x: canvas.width, y: Math.random() * (canvas.height - 20),
        w: 20, h: 20,
        type: type,
        gunType: gunType
    });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.w && rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + rect2.h && rect1.y + rect1.h > rect2.y;
}

function gameLoop() {
    if (gameOver) {
        drawStarryBackground();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 40px Arial';
        ctx.fillText(`Game Over - Score: ${player.score} - Level: ${level}`, canvas.width / 2 - 250, canvas.height / 2);
        ctx.font = '30px Arial';
        ctx.fillText('Press Space to Restart', canvas.width / 2 - 150, canvas.height / 2 + 50);
        if (keys.Space) {
            gameOver = false;
            player.health = 500;
            player.score = 0;
            bullets = [];
            enemies = [];
            powerUps = [];
            level = 1;
            player.y = canvas.height / 2;
            player.speed = player.baseSpeed;
            player.currentGun = 'default';
            player.gunDuration = 0;
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    drawStarryBackground();
    
    if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
    if (keys.ArrowDown && player.y < canvas.height - player.h) player.y += player.speed;
    if (keys.ArrowLeft) player.speed = Math.max(player.minSpeed, player.speed - 0.2);
    if (keys.ArrowRight) player.speed = Math.min(player.maxSpeed, player.speed + 0.2);

    if (keys.Space) shoot();

    bullets = bullets.filter(b => {
        b.x += b.speed;
        b.y += b.ySpeed || 0;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        return b.x < canvas.width && b.x > 0 && b.y > 0 && b.y < canvas.height;
    });

    enemies.forEach(e => {
        e.x -= e.speed * player.speed / player.baseSpeed;
        drawDetailedShip(e.x, e.y, e.w, e.h, COLORS.enemy, false);
    });
    enemies = enemies.filter(e => e.x > -e.w);

    powerUps.forEach(p => {
        p.x -= 2 * player.speed / player.baseSpeed;
        ctx.fillStyle = p.type === 'gun' ? GUNS[p.gunType].color : COLORS.powerUp[p.type];
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 16px Arial';
        ctx.fillText(p.type === 'gun' ? p.gunType[0].toUpperCase() : p.type[0].toUpperCase(), p.x + 6, p.y + 16);
    });
    powerUps = powerUps.filter(p => p.x > -p.w);

    if (player.invulnerable > 0) {
        player.invulnerable--;
        if (player.invulnerable % 10 < 5) {
            drawDetailedShip(player.x, player.y, player.w, player.h, 'rgba(0,255,0,0.5)', true);
        }
    } else {
        drawDetailedShip(player.x, player.y, player.w, player.h, COLORS.player, true);
    }

    if (Math.random() < 0.05 + level * 0.01) spawnEnemy();
    if (Math.random() < 0.005) spawnPowerUp();

    bullets = bullets.filter(b => {
        let bulletHit = false;
        enemies = enemies.filter(e => {
            if (!bulletHit && checkCollision({x: b.x - b.size, y: b.y - b.size, w: b.size * 2, h: b.size * 2}, e)) {
                player.score += 10;
                bulletHit = true;
                return false;
            }
            return true;
        });
        return !bulletHit;
    });

    if (player.invulnerable === 0) {
        enemies.forEach(e => {
            if (checkCollision(player, e)) {
                player.health -= 10;
                player.invulnerable = 60;
                if (player.health <= 0) gameOver = true;
            }
        });
    }

    powerUps = powerUps.filter(p => {
        if (checkCollision(player, p)) {
            if (p.type === 'health') player.health = Math.min(100, player.health + 5);
            else if (p.type === 'score') player.score += 50;
            else if (p.type === 'gun') {
                player.currentGun = p.gunType;
                player.gunDuration = 600; // 10 seconds
            }
            return false;
        }
        return true;
    });

    if (player.gunDuration > 0) {
        player.gunDuration--;
        if (player.gunDuration === 0) {
            player.currentGun = 'default';
        }
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Health: ${player.health} | Score: ${player.score} | Level: ${level} | Speed: ${player.speed.toFixed(1)} | Gun: ${player.currentGun}`, 10, 30);

    if (player.score >= level * 100) {
        level++;
        player.health = Math.min(100, player.health + 20);
    }

    requestAnimationFrame(gameLoop);
}

function shoot() {
    const now = Date.now();
    const gun = GUNS[player.currentGun];
    if (now - player.lastShot > gun.cooldown) {
        if (player.currentGun === 'spread') {
            for (let i = -2.5; i <= 2.5; i++) {
                const angle = i * Math.PI / 18; // Spread over 30 degrees
                const speed = gun.bulletSpeed + player.speed - player.baseSpeed;
                bullets.push({
                    x: player.x + player.w,
                    y: player.y + player.h / 2,
                    speed: Math.cos(angle) * speed,
                    ySpeed: Math.sin(angle) * speed,
                    size: gun.bulletSize,
                    color: gun.color
                });
            }
        } else {
            bullets.push({
                x: player.x + player.w,
                y: player.y + player.h / 2,
                speed: gun.bulletSpeed + player.speed - player.baseSpeed,
                size: gun.bulletSize,
                color: gun.color
            });
        }
        player.lastShot = now;
    }
}

window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    keys[e.code] = true;
});
window.addEventListener('keyup', e => keys[e.code] = false);

gameLoop();