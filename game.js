console.log("Script loaded");
// Global declarations
let canvas, ctx;
let bullets = [], enemies = [], powerUps = [], stars = [], explosions = [];
let gameOver = false, level = 1;
const keys = {};
let activeTouches = {};
let showDebugOverlay = false;
let lastFrameTime = Date.now();
let showDevMenu = false;

// Constants
const COLORS = {
    bg: '#000033', player: '#00FF00', enemy: '#FF0000', bullet: '#FFFF00',
    powerUp: { health: '#00FF00', score: '#0000FF' }, text: '#FFFFFF',
    guns: { default: '#FFFF00', spread: '#FF00FF', rapid: '#00FFFF' },
    devMenu: 'rgba(0, 0, 0, 0.8)'
};

const GUNS = {
    default: { cooldown: 250, bulletSpeed: 8, bulletSize: 3, color: COLORS.guns.default },
    spread: { cooldown: 750, bulletSpeed: 6, bulletSize: 4, color: COLORS.guns.spread },
    rapid: { cooldown: 50, bulletSpeed: 10, bulletSize: 4, color: COLORS.guns.rapid }
};

const ENEMY_TYPES = {
    basic: { health: 1, speed: 2, size: 30, color: COLORS.enemy, score: 10 },
    fast: { health: 1, speed: 4, size: 20, color: '#FF00FF', score: 20 },
    tank: { health: 3, speed: 1, size: 40, color: '#00FFFF', score: 30 },
    miniBoss: { health: 20, speed: 1.5, size: 60, color: '#FFA500', score: 100 },
    bigBoss: { health: 100, speed: 0.5, size: 100, color: '#FF0000', score: 500 }
};

// Image loading
const playerImage = new Image();
playerImage.src = 'images/player.png';

const enemyImage = new Image();
enemyImage.src = 'images/basic&bigboss.png';

const explosionImage = new Image();
explosionImage.src = 'images/explosion.png';

// Player object
let player;

// Touch controls
let touchControls = {};

function initGame() {
    console.log("Game initialized");
    
    // Canvas setup
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size to match the screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    console.log('Initial Canvas dimensions:', canvas.width, canvas.height);

    // Initialize player
    player = {
        x: 50, y: canvas.height / 2, w: 50, h: 30, baseSpeed: 5, speed: 5,
        minSpeed: 1, maxSpeed: 20,
        damageInvulnerable: 0,
        health: 100, score: 0, lastShot: 0, invulnerable: 0,
        currentGun: 'default', gunDuration: 0,
        invincible: false
    };

    // Reset game state
    bullets = []; enemies = []; powerUps = []; stars = []; explosions = [];
    gameOver = false; level = 1;
    showDebugOverlay = false;
    showDevMenu = false;

    // Initialize game
    resizeCanvas();
    createStars();
    console.log('Starting game loop');
    gameLoop();
}


// Canvas resizing
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateTouchControls();
    console.log('Resized canvas dimensions:', canvas.width, canvas.height);
}

// Debug info
function drawDebugInfo() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Canvas size: ${canvas.width}x${canvas.height}`, 10, 30);
    ctx.fillText(`Game loop running: ${new Date().toLocaleTimeString()}`, 10, 60);
}

// Star background
function createStars() {
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: 0.1 + Math.random() * 0.3
        });
    }
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

// Touch controls
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
                    shoot();
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

// Drawing functions
function drawDetailedShip(x, y, w, h, color, isPlayer, type) {
    if (isPlayer && player.damageInvulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
        // Skip drawing the player every other 100ms when damage invulnerable
        return;
    }
    if (isPlayer && playerImage.complete) {
        ctx.drawImage(playerImage, x, y, w, h);
    } else if (!isPlayer && enemyImage.complete && (type === 'basic' || type === 'bigBoss')) {
        ctx.drawImage(enemyImage, x, y, w, h);
    } else {
        // Fallback to colored triangles for specific enemy types
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();

        switch(type) {
            case 'fast':
                ctx.fillStyle = '#FF00FF'; // Pink
                break;
            case 'tank':
                ctx.fillStyle = '#00FFFF'; // Blue
                break;
            case 'miniBoss':
                ctx.fillStyle = '#FFA500'; // Orange
                break;
            default:
                ctx.fillStyle = color;
        }

        ctx.fill();
    }
    
    if (isPlayer) {
        const speedRatio = (player.speed - player.minSpeed) / (player.maxSpeed - player.minSpeed);
        ctx.fillStyle = `rgb(${255 * speedRatio}, ${255 * (1 - speedRatio)}, 0)`;
        ctx.fillRect(x - 10, y, 5, h);
        ctx.fillRect(x - 10, y + h * (1 - speedRatio), 5, h * speedRatio);

        ctx.fillStyle = GUNS[player.currentGun].color;
        ctx.fillRect(x + w, y + h / 2 - 5, 10, 10);
    }
}

function drawEnemy(e) {
    drawDetailedShip(e.x, e.y, e.w, e.h, e.color, false, e.type);
    
    if (e.type === 'miniBoss' || e.type === 'bigBoss') {
        const healthPercentage = e.health / e.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x, e.y - 10, e.w, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(e.x, e.y - 10, e.w * healthPercentage, 5);
    }
}

// Game mechanics
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
    console.log(`Spawned ${type} enemy:`, enemies[enemies.length - 1]);
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

function shoot() {
    const now = Date.now();
    const gun = GUNS[player.currentGun];
    if (now - player.lastShot > gun.cooldown) {
        if (player.currentGun === 'spread') {
            for (let layer = -1; layer <= 1; layer += 2) {
                for (let i = -2; i <= 2; i++) {
                    const angle = i * Math.PI / 18 + layer * Math.PI / 36;
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


function drawDebugOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Player: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`, 10, 20);
    ctx.fillText(`Enemies: ${enemies.length}`, 10, 40);
    ctx.fillText(`Bullets: ${bullets.length}`, 10, 60);
    const fps = lastFrameTime ? (1000 / (Date.now() - lastFrameTime)).toFixed(2) : 'N/A';
    ctx.fillText(`FPS: ${fps}`, 10, 80);
}

function toggleDebugOverlay() {
    showDebugOverlay = !showDebugOverlay;
    console.log(`Debug overlay ${showDebugOverlay ? 'enabled' : 'disabled'}`);
}

function updateAndDrawBullets() {
    bullets = bullets.filter(b => {
        b.x += b.speed;
        b.y += b.ySpeed || 0;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        return b.x < canvas.width && b.x > 0 && b.y > 0 && b.y < canvas.height;
    });
}

function updateAndDrawEnemies() {
    enemies.forEach(e => {
        e.x -= e.speed * player.speed / player.baseSpeed;
        drawEnemy(e);
    });
    enemies = enemies.filter(e => e.x > -e.w);
}

function updateAndDrawPowerUps() {
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
}

function drawExplosions() {
    explosions = explosions.filter(explosion => {
        ctx.drawImage(explosionImage, explosion.x, explosion.y, explosion.size, explosion.size);
        explosion.duration--;
        return explosion.duration > 0;
    });
}

function checkCollisions() {
    checkBulletEnemyCollisions();
    checkPlayerEnemyCollisions();
    checkPlayerPowerUpCollisions();
}

function checkBulletEnemyCollisions() {
    bullets = bullets.filter(b => {
        let bulletHit = false;
        enemies = enemies.filter(e => {
            if (!bulletHit && checkCollision({x: b.x - b.size, y: b.y - b.size, w: b.size * 2, h: b.size * 2}, e)) {
                e.health--;
                if (e.health <= 0) {
                    player.score += e.score;
                    explosions.push({
                        x: e.x,
                        y: e.y,
                        size: e.w * 1.5,
                        duration: 30
                    });
                    return false;
                }
                bulletHit = true;
            }
            return true;
        });
        return !bulletHit;
    });
}

function checkPlayerEnemyCollisions() {
    if (!player.invincible && player.damageInvulnerable === 0) {
        enemies.forEach(e => {
            if (checkCollision(player, e)) {
                player.health -= 10;
                player.damageInvulnerable = 60; // Set invulnerability frames
                if (player.health <= 0) gameOver = true;
            }
        });
    } else if (player.damageInvulnerable > 0) {
        player.damageInvulnerable--; // Decrease invulnerability frames
    }
}

function checkPlayerPowerUpCollisions() {
    powerUps = powerUps.filter(p => {
        if (checkCollision(player, p)) {
            if (p.type === 'health') {
                player.health = Math.min(100, player.health + 20);
            } else if (p.type === 'score') {
                player.score += 50;
            } else if (p.type === 'gun') {
                player.currentGun = p.gunType;
                player.gunDuration = 600; // 10 seconds
            }
            return false;
        }
        return true;
    });
}

function updateGunDuration() {
    if (player.gunDuration > 0) {
        player.gunDuration--;
        if (player.gunDuration === 0) {
            player.currentGun = 'default';
        }
    }
}

function drawHUD() {
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Health: ${player.health} | Score: ${player.score} | Level: ${level} | Speed: ${player.speed.toFixed(1)} | Gun: ${player.currentGun} | Invulnerable: ${player.damageInvulnerable > 0 ? 'Yes' : 'No'}`, 10, 30);
}

function checkLevelUp() {
    if (player.score >= level * 100) {
        let canLevelUp = true;
        
        if (level % 10 === 0) {
            canLevelUp = !enemies.some(e => e.type === 'miniBoss' || e.type === 'bigBoss');
        }
        
        if (canLevelUp) {
            level++;
            player.health = Math.min(100, player.health + 20);
            console.log('Level increased to:', level);
        }
    }
}

function trySpawnPowerUp() {
    if (Math.random() < 0.005) {  // 0.5% chance each frame
        spawnPowerUp();
    }
}
function updatePlayerPosition() {
    if ((keys.ArrowUp || keys.KeyW) && player.y > 0) player.y -= player.speed;
    if ((keys.ArrowDown || keys.KeyS) && player.y < canvas.height - player.h) player.y += player.speed;
    if (keys.ArrowLeft || keys.KeyA) player.speed = Math.max(player.minSpeed, player.speed - 0.2);
    if (keys.ArrowRight || keys.KeyD) player.speed = Math.min(player.maxSpeed, player.speed + 0.2);

    if (keys.up && player.y > 0) player.y -= player.speed;
    if (keys.down && player.y < canvas.height - player.h) player.y += player.speed;
    if (keys.speedDown) player.speed = Math.max(player.minSpeed, player.speed - 0.2);
    if (keys.speedUp) player.speed = Math.min(player.maxSpeed, player.speed + 0.2);

    if (keys.Space || keys.shoot) shoot();
}

// Add this function definition
function handleDevMenuInteraction(e) {
    if (!showDevMenu) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 10 && x <= 310 && y >= 40 && y <= 340) {
        const optionIndex = Math.floor((y - 40) / 30);
        switch (optionIndex) {
            case 0:
                const newLevel = prompt("Enter new level (1-100):", level);
                if (newLevel) devMenu.setLevel(parseInt(newLevel));
                break;
            case 1:
                const newHealth = prompt("Enter new health (1-100):", player.health);
                if (newHealth) devMenu.setHealth(parseInt(newHealth));
                break;
            case 2:
                const newGun = prompt("Enter new gun type (default, spread, rapid):", player.currentGun);
                if (newGun) devMenu.setGun(newGun);
                break;
            case 3:
                const scoreToAdd = prompt("Enter score to add:", 0);
                if (scoreToAdd) devMenu.addScore(parseInt(scoreToAdd));
                break;
            case 4:
                const enemyType = prompt("Enter enemy type to spawn:", "basic");
                if (enemyType) devMenu.spawnEnemy(enemyType);
                break;
            case 5:
                devMenu.clearEnemies();
                break;
            case 6:
                devMenu.toggleInvincibility();
                break;
            case 7:
                devMenu.toggleDebugOverlay();
                break;
        }
    }
}
function gameLoop() {
    const currentTime = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawStarryBackground();
    
    // Draw player
    drawDetailedShip(player.x, player.y, player.w, player.h, COLORS.player, true);
    
    // Draw enemies
    enemies.forEach((enemy) => {
        drawEnemy(enemy);
    });
    
    updatePlayerPosition();
    updateAndDrawBullets();
    updateAndDrawEnemies();
    updateAndDrawPowerUps();
    drawExplosions();
    checkCollisions();
    drawTouchControls();
    updateGunDuration();
    drawHUD();
    checkLevelUp();

    // Spawn enemies
    if (Math.random() < 0.02) {  // 2% chance each frame
        spawnEnemy();
    }

    // Try to spawn power-ups
    trySpawnPowerUp();

    if (showDebugOverlay) {
        drawDebugOverlay();
    }
    if (showDevMenu) {
        drawDevMenu();
    }
    
    const frameTime = Date.now() - currentTime;
    lastFrameTime = frameTime > 0 ? frameTime : 1; // Ensure we don't divide by zero

    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    } else {
        drawGameOver();
    }
}
const devMenu = {
    setLevel: (newLevel) => {
        level = Math.max(1, Math.min(100, newLevel));
        console.log(`Level set to ${level}`);
    },
    setHealth: (newHealth) => {
        player.health = Math.max(1, Math.min(100, newHealth));
        console.log(`Player health set to ${player.health}`);
    },
    setGun: (gunType) => {
        if (GUNS[gunType]) {
            player.currentGun = gunType;
            player.gunDuration = Infinity;
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
    },
    toggleDebugOverlay: toggleDebugOverlay
};
function initializeGame() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    ctx = canvas.getContext('2d');

    // Touch event listeners
    canvas.addEventListener('touchstart', handleTouch, false);
    canvas.addEventListener('touchmove', handleTouch, false);
    canvas.addEventListener('touchend', handleTouchEnd, false);
    canvas.addEventListener('touchcancel', handleTouchEnd, false);

    // Click listener for dev menu
    canvas.addEventListener('click', handleDevMenuInteraction);

   
    // Window event listeners
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
            e.preventDefault();
        }
        keys[e.code] = true;

        if (e.code === 'F4') {
            e.preventDefault();
            toggleDebugOverlay();
            console.log(`Debug overlay ${showDebugOverlay ? 'enabled' : 'disabled'}`);
        } else if (e.code === 'F5') {
            e.preventDefault();
            showDevMenu = !showDevMenu;
            console.log(`Dev menu ${showDevMenu ? 'opened' : 'closed'}`);
        }
    });

    window.addEventListener('keyup', e => keys[e.code] = false);
    window.addEventListener('resize', resizeCanvas);

    // Image loading error handlers
    playerImage.onerror = () => console.error("Failed to load player image");
    enemyImage.onerror = () => console.error("Failed to load enemy image");
    explosionImage.onerror = () => console.error("Failed to load explosion image");

    // Make devMenu accessible globally
    window.devMenu = devMenu;

    // Initialize the game
    initGame();
}

// Add an event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeGame);
