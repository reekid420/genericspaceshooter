console.log("Script loaded");
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

console.log('Initial Canvas dimensions:', canvas.width, canvas.height);

let touchControls = {};
function updateTouchControls() {
    const buttonSize = Math.min(80, canvas.width / 8);
    touchControls = {
        up: { x: 10, y: canvas.height - buttonSize * 2 - 10, w: buttonSize, h: buttonSize },
        down: { x: 10, y: canvas.height - buttonSize - 5, w: buttonSize, h: buttonSize },
        speedDown: { x: canvas.width - buttonSize * 2 - 10, y: canvas.height - buttonSize * 2 - 10, w: buttonSize, h: buttonSize },
        speedUp: { x: canvas.width - buttonSize * 2 - 10, y: canvas.height - buttonSize - 5, w: buttonSize, h: buttonSize },
        shoot: { x: canvas.width - buttonSize - 5, y: canvas.height - buttonSize - 5, w: buttonSize, h: buttonSize }
    };
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateTouchControls();
    console.log('Resized canvas dimensions:', canvas.width, canvas.height);
}
function drawDebugInfo() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Canvas size: ${canvas.width}x${canvas.height}`, 10, 30);
    ctx.fillText(`Game loop running: ${new Date().toLocaleTimeString()}`, 10, 60);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
const COLORS = {
    bg: '#000033', player: '#00FF00', enemy: '#FF0000', bullet: '#FFFF00',
    powerUp: { health: '#00FF00', score: '#0000FF' }, text: '#FFFFFF',
    guns: { default: '#FFFF00', spread: '#FF00FF', rapid: '#00FFFF' }
};
const playerImage = new Image();
playerImage.src = 'untitled2-removebg-preview.png';

const enemyImage = new Image();
enemyImage.src = 'untitled2.png';
const GUNS = {
    default: { cooldown: 250, bulletSpeed: 8, bulletSize: 3, color: COLORS.guns.default },
    spread: { cooldown: 750, bulletSpeed: 6, bulletSize: 4, color: COLORS.guns.spread }, // Increased bullet size
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
const ENEMY_TYPES = {
    basic: { health: 1, speed: 2, size: 30, color: COLORS.enemy, score: 10 },
    fast: { health: 1, speed: 4, size: 20, color: '#FF00FF', score: 20 },
    tank: { health: 3, speed: 1, size: 40, color: '#00FFFF', score: 30 },
    miniBoss: { health: 20, speed: 1.5, size: 60, color: '#FFA500', score: 100 },
    bigBoss: { health: 100, speed: 0.5, size: 100, color: '#FF0000', score: 500 }
};
const devMenu = {
    setLevel: (newLevel) => {
        level = newLevel;
        console.log(`Level set to ${newLevel}`);
    },
    setHealth: (newHealth) => {
        player.health = newHealth;
        console.log(`Player health set to ${newHealth}`);
    },
    setGun: (gunType) => {
        if (GUNS[gunType]) {
            player.currentGun = gunType;
            player.gunDuration = Infinity; // Make it permanent
            console.log(`Gun set to ${gunType}`);
        } else {
            console.log(`Invalid gun type. Available types: ${Object.keys(GUNS).join(', ')}`);
        }
    },
    addScore: (amount) => {
        player.score += amount;
        console.log(`Added ${amount} to score. New score: ${player.score}`);
    },
    spawnEnemy: (type) => {
        if (ENEMY_TYPES[type]) {
            const enemy = { ...ENEMY_TYPES[type] };
            enemy.x = canvas.width;
            enemy.y = Math.random() * (canvas.height - enemy.size);
            enemy.w = enemy.size;
            enemy.h = enemy.size * 0.6;
            enemy.type = type;
            enemies.push(enemy);
            console.log(`Spawned ${type} enemy`);
        } else {
            console.log(`Invalid enemy type. Available types: ${Object.keys(ENEMY_TYPES).join(', ')}`);
        }
    },
    clearEnemies: () => {
        enemies = [];
        console.log("All enemies cleared");
    },
    toggleInvincibility: () => {
        player.invincible = !player.invincible;
        console.log(`Invincibility ${player.invincible ? 'enabled' : 'disabled'}`);
    }
};
window.devMenu = devMenu;
function spawnEnemy() {
    let type;
    if (level % 50 === 0 && !enemies.some(e => e.type === 'bigBoss')) {
        type = 'bigBoss';
    } else if (level % 10 === 0 && !enemies.some(e => e.type === 'miniBoss')) {
        type = 'miniBoss';
    } else {
        const roll = Math.random();
        if (roll < 0.5) type = 'basic';
        else if (roll < 0.75) type = 'fast';
        else type = 'tank';
    }

    const enemyType = ENEMY_TYPES[type];
    const size = enemyType.size + Math.random() * 20;
    enemies.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        w: size,
        h: size * 0.6,
        speed: enemyType.speed * (1 + level * 0.1),
        health: enemyType.health,
        maxHealth: enemyType.health,
        color: enemyType.color,
        type: type,
        score: enemyType.score
    });
}

function drawEnemy(e) {
    drawDetailedShip(e.x, e.y, e.w, e.h, e.color, false);
    
    // Draw health bar for bosses
    if (e.type === 'miniBoss' || e.type === 'bigBoss') {
        const healthPercentage = e.health / e.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x, e.y - 10, e.w, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(e.x, e.y - 10, e.w * healthPercentage, 5);
    }
}                                                                                                                                                                                                                                                                                                                                       

function updateTouchControls() {
    const buttonSize = Math.min(80, canvas.width / 8);
    touchControls = {
        up: { x: 10, y: canvas.height - buttonSize * 2 - 10, w: buttonSize, h: buttonSize },
        down: { x: 10, y: canvas.height - buttonSize - 5, w: buttonSize, h: buttonSize },
        speedDown: { x: canvas.width - buttonSize * 2 - 10, y: canvas.height - buttonSize * 2 - 10, w: buttonSize, h: buttonSize },
        speedUp: { x: canvas.width - buttonSize * 2 - 10, y: canvas.height - buttonSize - 5, w: buttonSize, h: buttonSize },
        shoot: { x: canvas.width - buttonSize - 5, y: canvas.height - buttonSize - 5, w: buttonSize, h: buttonSize }
    };
}

function drawTouchControls() {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    for (const control in touchControls) {
        const { x, y, w, h } = touchControls[control];
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(control, x + 10, y + 45);
        ctx.fillStyle = '#FFFFFF';
    }
    ctx.globalAlpha = 1;
}

let activeTouches = {};

function handleTouch(e) {
    e.preventDefault();
    const touches = e.touches;
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX;
        const y = touch.clientY;
        for (const control in touchControls) {
            const { x: cx, y: cy, w, h } = touchControls[control];
            if (x >= cx && x <= cx + w && y >= cy && y <= cy + h) {
                activeTouches[touch.identifier] = control;
                keys[control] = true;
                if (control === 'shoot') {
                    shoot(); // Immediately shoot when the shoot button is touched
                }
            }
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        if (activeTouches[touch.identifier]) {
            keys[activeTouches[touch.identifier]] = false;
            delete activeTouches[touch.identifier];
        }
    }
}

canvas.addEventListener('touchstart', handleTouch, false);
canvas.addEventListener('touchmove', handleTouch, false);
canvas.addEventListener('touchend', handleTouchEnd, false);
canvas.addEventListener('touchcancel', handleTouchEnd, false);
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
    if (isPlayer) {
        ctx.drawImage(playerImage, x, y, w, h);
    } else if (color === COLORS.enemy) {
        ctx.drawImage(enemyImage, x, y, w, h);
    } else {
        // Fallback to the original drawing method for other ships
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();

        // Add details (window, etc.) as before
        // ...
    }

    // Keep the speed and gun indicators for the player
    if (isPlayer) {
        const speedRatio = (player.speed - player.minSpeed) / (player.maxSpeed - player.minSpeed);
        ctx.fillStyle = `rgb(${255 * speedRatio}, ${255 * (1 - speedRatio)}, 0)`;
        ctx.fillRect(x - 10, y, 5, h);
        ctx.fillRect(x - 10, y + h * (1 - speedRatio), 5, h * speedRatio);

        ctx.fillStyle = GUNS[player.currentGun].color;
        ctx.fillRect(x + w, y + h / 2 - 5, 10, 10);
    }
}


function spawnEnemy() {
    let type;
    if (level % 50 === 0 && !enemies.some(e => e.type === 'bigBoss')) {
        type = 'bigBoss';
    } else if (level % 10 === 0 && !enemies.some(e => e.type === 'miniBoss')) {
        type = 'miniBoss';
    } else {
        const roll = Math.random();
        if (roll < 0.5) type = 'basic';
        else if (roll < 0.75) type = 'fast';
        else type = 'tank';
    }

    const enemyType = ENEMY_TYPES[type];
    const size = enemyType.size + Math.random() * 20;
    enemies.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        w: size,
        h: size * 0.6,
        speed: enemyType.speed * (1 + level * 0.1),
        health: enemyType.health,
        maxHealth: enemyType.health,
        color: enemyType.color,
        type: type,
        score: enemyType.score
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
    console.log('Game loop running');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'red';
    ctx.fillRect(50, 50, 100, 100);
    drawDebugInfo();
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
    if (keys.up && player.y > 0) player.y -= player.speed;
    if (keys.down && player.y < canvas.height - player.h) player.y += player.speed;
    if (keys.speedDown) player.speed = Math.max(player.minSpeed, player.speed - 0.2);
    if (keys.speedUp) player.speed = Math.min(player.maxSpeed, player.speed + 0.2);

    if (keys.Space || keys.shoot) shoot();

    // Update bullet positions and draw them
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
        drawEnemy(e);
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

    
    if (playerImage.complete && enemyImage.complete) {
        if (player.invulnerable > 0) {
            player.invulnerable--;
            if (player.invulnerable % 10 < 5) {
                ctx.globalAlpha = 0.5;
                drawDetailedShip(player.x, player.y, player.w, player.h, COLORS.player, true);
                ctx.globalAlpha = 1;
            }
        } else {
            drawDetailedShip(player.x, player.y, player.w, player.h, COLORS.player, true);
        }

        enemies.forEach(e => {
            e.x -= e.speed * player.speed / player.baseSpeed;
            drawDetailedShip(e.x, e.y, e.w, e.h, e.color, false);
        });
    }

    const baseSpawnRate = 0.05;
    const speedFactor = player.speed / player.baseSpeed;
    const adjustedSpawnRate = baseSpawnRate * (1 / speedFactor);

    if (Math.random() < adjustedSpawnRate + level * 0.01) spawnEnemy();
    if (Math.random() < 0.005) spawnPowerUp();

    bullets = bullets.filter(b => {
        let bulletHit = false;
        enemies = enemies.filter(e => {
            if (!bulletHit && checkCollision({x: b.x - b.size, y: b.y - b.size, w: b.size * 2, h: b.size * 2}, e)) {
                e.health--;
                if (e.health <= 0) {
                    player.score += e.score;
                    return false;
                }
                bulletHit = true;
            }
            return true;
        });
        return !bulletHit;
    });

    
    if (!player.invincible && player.invulnerable === 0) {
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

    drawTouchControls();

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
        let canLevelUp = true;
        
        if (level % 10 === 0) {
            // Check for mini-boss or big boss
            canLevelUp = !enemies.some(e => e.type === 'miniBoss' || e.type === 'bigBoss');
        }
        
        if (canLevelUp) {
            level++;
            player.health = Math.min(100, player.health + 20);
            console.log('Level increased to:', level); // Debug log
        }
    }

    requestAnimationFrame(gameLoop);
}

function shoot() {
    const now = Date.now();
    const gun = GUNS[player.currentGun];
    if (now - player.lastShot > gun.cooldown) {
        if (player.currentGun === 'spread') {
            for (let layer = -1; layer <= 1; layer += 2) { // Two layers of spread
                for (let i = -2; i <= 2; i++) {
                    const angle = i * Math.PI / 18 + layer * Math.PI / 36; // Spread over 40 degrees, with two layers
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

console.log('Starting game loop');
gameLoop();