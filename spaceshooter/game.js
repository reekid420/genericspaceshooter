// Global declarations
let bullets = [], enemies = [], powerUps = [], stars = [], explosions = [];
let gameOver = false, level = 1;
let player;
let canvas, ctx;
const keys = {};
let activeTouches = {};
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
let showDevMenu = false;
let devMenuUnlocked = false;
let isUsingKeyboard = false;
let lastKeyboardY = 0;
let lastKeyboardSpeed = 5;
let boss = null;
let bossPhase = 0;
let rapidShotCount = 0;
let lastShotTime = 0;
let devMenuButton = null;
let touchControls = {};
let activeSlider = null;

// Constants
const COLORS = {
    bg: '#000033', player: '#00FF00', enemy: '#FF0000', bullet: '#FFFF00',
    powerUp: { health: '#00FF00', score: '#0000FF' }, text: '#FFFFFF',
    guns: { default: '#FFFF00', spread: '#FF00FF', rapid: '#00FFFF' },
    devMenu: 'rgba(0, 0, 0, 0.8)'
};

const GUNS = {
    default: { cooldown: 200, bulletSpeed: 8, bulletSize: 4, color: COLORS.guns.default },
    spread: { cooldown: 650, bulletSpeed: 6, bulletSize: 4, color: COLORS.guns.spread },
    rapid: { cooldown: 50, bulletSpeed: 10, bulletSize: 4, color: COLORS.guns.rapid },
    burst: { cooldown: 500, bulletSpeed: 9, bulletSize: 4, color: '#FFA500', burstCount: 3, burstDelay: 50 }
};

const ENEMY_TYPES = {
    basic: { health: 2, speed: 2, size: 30, color: COLORS.enemy, score: 10 },
    fast: { health: 1, speed: 4, size: 20, color: '#FF00FF', score: 20 },
    tank: { health: 3, speed: 1, size: 40, color: '#00FFFF', score: 30 },
    miniBoss: { health: 20, speed: 0.5, size: 60, color: '#FFA500', score: 100 },
    bigBoss: { health: 100, speed: 0.2, size: 100, color: '#FF0000', score: 500 },
    finalBoss: { health: 1000, speed: 2, size: 150, color: '#FF1493', score: 10000 }
};

// Image loading
const playerImage = new Image();
playerImage.src = '../images/player.png';

const enemyImage = new Image();
enemyImage.src = '../images/basic&bigboss.png';

const explosionImage = new Image();
explosionImage.src = '../images/explosion.png';

const finalBossImage = new Image();
finalBossImage.src = '../images/final-boss.png';

const blueShipImage = new Image();
blueShipImage.src = '../images/blue_ship.png';

function initGame() {
    window.removeEventListener('keydown', handleRestart);
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.removeEventListener('touchstart', handleRestart);
    }
    
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    player = {
        x: 50, y: canvas.height / 2, w: 50, h: 30, baseSpeed: 5, speed: 5,
        minSpeed: 1, maxSpeed: 20,
        damageInvulnerable: 0,
        health: 100, score: 0, lastShot: 0, invulnerable: 0,
        currentGun: 'default', gunDuration: 0,
        invincible: false
    };

    bullets = []; enemies = []; powerUps = []; stars = []; explosions = [];
    gameOver = false; level = 1;
    showDevMenu = false;
    boss = null;
    bossPhase = 0;

    // Set up touch event listeners
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    resizeCanvas();
    createStars();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        updateTouchControls();
    }
}

function createStars() {
    stars = [];
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

function updateTouchControls() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    const buttonSize = Math.min(80, canvas.width / 8);
    const gap = 5;
    const sliderHeight = canvas.height * 0.6;
    const sliderWidth = buttonSize / 2;
    
    touchControls = {
        moveSlider: { x: 20, y: (canvas.height - sliderHeight) / 2, w: sliderWidth, h: sliderHeight, value: 0.5 },
        speedSlider: { x: canvas.width - sliderWidth - 20, y: (canvas.height - sliderHeight) / 2, w: sliderWidth, h: sliderHeight, value: 0.5 },
        shoot: { x: canvas.width - buttonSize - gap - 60, y: canvas.height - buttonSize - gap, w: buttonSize, h: buttonSize }
    };
}

function drawTouchControls() {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    
    for (const control of ['moveSlider', 'speedSlider']) {
        const { x, y, w, h, value } = touchControls[control];
        ctx.fillRect(x, y, w, h);
        
        const knobHeight = h / 10;
        const knobY = y + (h - knobHeight) * (1 - value);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - w, knobY, w * 3, knobHeight);
        ctx.fillStyle = '#FFFFFF';
    }
    
    const { x, y, w, h } = touchControls.shoot;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('SHOOT', x + 10, y + 45);
    
    ctx.globalAlpha = 1;
}

function handleTouch(e) {
    e.preventDefault();
    isUsingKeyboard = false;
    const touches = e.touches;
    
    keys.shoot = false;
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleSingleTouch(x, y, touch.identifier);
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    isUsingKeyboard = false;
    const touches = e.changedTouches;
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleSingleTouch(x, y, touch.identifier);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        if (activeTouches[touch.identifier]) {
            delete activeTouches[touch.identifier];
        }
    }
    if (Object.keys(activeTouches).length === 0) {
        activeSlider = null;
        keys.shoot = false;
    }
}

function handleSingleTouch(x, y, identifier) {
    let touchHandled = false;
    
    for (const control of ['moveSlider', 'speedSlider']) {
        const slider = touchControls[control];
        if (x >= slider.x - slider.w && x <= slider.x + slider.w * 2 && y >= slider.y && y <= slider.y + slider.h) {
            slider.value = 1 - Math.max(0, Math.min(1, (y - slider.y) / slider.h));
            activeSlider = control;
            touchHandled = true;
            activeTouches[identifier] = { control: control, x: x, y: y };
            break;
        }
    }
    
    if (!touchHandled && checkCollision({x: x, y: y, w: 1, h: 1}, touchControls.shoot)) {
        keys.shoot = true;
        touchHandled = true;
        activeTouches[identifier] = { control: 'shoot', x: x, y: y };
    }
    
    if (!touchHandled) {
        activeSlider = null;
    }
}

function updatePlayerPosition() {
    let moveY = 0;
    let speedChange = 0;

    if (isUsingKeyboard) {
        if (keys.ArrowUp || keys.KeyW) {
            moveY = -player.speed;
        } else if (keys.ArrowDown || keys.KeyS) {
            moveY = player.speed;
        }

        if (keys.ArrowLeft || keys.KeyA) {
            speedChange = -0.2;
        } else if (keys.ArrowRight || keys.KeyD) {
            speedChange = 0.2;
        }

        // Update position
        player.y += moveY;
        player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

        // Update speed
        player.speed = Math.max(player.minSpeed, Math.min(player.maxSpeed, player.speed + speedChange));
    } else {
        // Touch controls
        const moveValue = touchControls.moveSlider.value;
        const speedValue = touchControls.speedSlider.value;
        
        player.y = (1 - moveValue) * (canvas.height - player.h);
        player.speed = player.minSpeed + (player.maxSpeed - player.minSpeed) * speedValue;
    }

    // Shooting
    if (keys.Space || keys.shoot) shoot();

    // Check for dev menu unlock
    checkDevMenuUnlock();
}

function resetControls() {
    isUsingKeyboard = false;
    for (let key in keys) {
        keys[key] = false;
    }
    if (touchControls && touchControls.moveSlider && touchControls.speedSlider) {
        touchControls.moveSlider.value = 0.5;
        touchControls.speedSlider.value = 0.5;
    }
    activeSlider = null;
}

function drawDetailedShip(x, y, w, h, color, isPlayer, type) {
    if (isPlayer && player.damageInvulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
        return;
    }
    if (isPlayer && playerImage.complete) {
        ctx.drawImage(playerImage, x, y, w, h);
    } else if (!isPlayer && enemyImage.complete && (type === 'basic' || type === 'bigBoss')) {
        ctx.drawImage(enemyImage, x, y, w, h);
    } else {
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();

        switch(type) {
            case 'fast':
                ctx.fillStyle = '#FF00FF';
                break;
            case 'tank':
                ctx.fillStyle = '#00FFFF';
                break;
            case 'miniBoss':
                ctx.fillStyle = '#FFA500';
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
    if (e.type === 'tank' && blueShipImage.complete) {
        ctx.drawImage(blueShipImage, e.x, e.y, e.w, e.h);
    } else {
        drawDetailedShip(e.x, e.y, e.w, e.h, e.color, false, e.type);
    }
    
    if (e.type === 'miniBoss' || e.type === 'bigBoss') {
        const healthPercentage = e.health / e.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x, e.y - 10, e.w, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(e.x, e.y - 10, e.w * healthPercentage, 5);
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
        const roll = Math.random();
        if (roll < 0.3) gunType = 'spread';
        else if (roll < 0.6) gunType = 'rapid';
        else gunType = 'burst';
    }
    powerUps.push({
        x: canvas.width, y: Math.random() * (canvas.height - 20),
        w:20, h: 20, type: type,
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
        player.lastShot = now;
        
        switch (player.currentGun) {
            case 'spread':
                for (let i = -2; i <= 2; i++) {
                    const angle = i * Math.PI / 18;
                    const speedX = Math.cos(angle) * gun.bulletSpeed;
                    const speedY = Math.sin(angle) * gun.bulletSpeed;
                    bullets.push({
                        x: player.x + player.w,
                        y: player.y + player.h / 2,
                        speedX: speedX + player.speed - player.baseSpeed,
                        speedY: speedY,
                        size: gun.bulletSize,
                        color: gun.color
                    });
                }
                break;
            
            case 'burst':
                for (let i = 0; i < gun.burstCount; i++) {
                    setTimeout(() => {
                        bullets.push({
                            x: player.x + player.w,
                            y: player.y + player.h / 2,
                            speedX: gun.bulletSpeed + player.speed - player.baseSpeed,
                            speedY: 0,
                            size: gun.bulletSize,
                            color: gun.color
                        });
                    }, i * gun.burstDelay);
                }
                break;
            
            default:
                bullets.push({
                    x: player.x + player.w,
                    y: player.y + player.h / 2,
                    speedX: gun.bulletSpeed + player.speed - player.baseSpeed,
                    speedY: 0,
                    size: gun.bulletSize,
                    color: gun.color
                });
                break;
        }
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
    ctx.fillText(`FPS: ${fps.toFixed(2)}`, 10, 80);
}

function drawDevMenu() {
    const menuWidth = Math.min(300, canvas.width * 0.8);
    const menuItemHeight = 40;
    const menuItemCount = 8;
    const menuHeight = (menuItemCount + 1) * menuItemHeight;
    
    const menuStartX = (canvas.width - menuWidth) / 2;
    const menuStartY = (canvas.height - menuHeight) / 2;

    ctx.fillStyle = COLORS.devMenu;
    ctx.fillRect(menuStartX, menuStartY, menuWidth, menuHeight);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Dev Menu', menuStartX + 10, menuStartY + 25);

    const menuItems = [
        'Set Level', 'Set Health', 'Set Gun', 'Add Score',
        'Spawn Enemy', 'Clear Enemies', 'Toggle Invincibility', 'Toggle Debug Overlay'
    ];

    menuItems.forEach((item, index) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(menuStartX, menuStartY + (index + 1) * menuItemHeight, menuWidth, menuItemHeight);
        ctx.fillStyle = 'white';
        ctx.fillText(item, menuStartX + 10, menuStartY + (index + 2) * menuItemHeight - 10);
    });
}

function checkDevMenuUnlock() {
    const now = Date.now();
    if (player.y <= player.h && player.speed >= 1 && player.speed <= 2) {
        if (now - lastShotTime <= 2000) {
            rapidShotCount++;
            if (rapidShotCount >= 15) {
                unlockDevMenu();
            }
        } else {
            rapidShotCount = 1;
        }
        lastShotTime = now;
    } else {
        rapidShotCount = 0;
    }
}

function unlockDevMenu() {
    if (!devMenuUnlocked) {
        devMenuUnlocked = true;
        console.log("Dev menu unlocked. Press 'P' to toggle.");
        createDevMenuButton();
    }
}

function createDevMenuButton() {
    if (!devMenuButton) {
        devMenuButton = document.createElement('button');
        devMenuButton.textContent = 'Dev Menu';
        devMenuButton.style.position = 'fixed';
        devMenuButton.style.bottom = '10px';
        devMenuButton.style.left = '10px';
        devMenuButton.style.zIndex = '1000';
        devMenuButton.addEventListener('click', toggleDevMenu);
        document.body.appendChild(devMenuButton);
    }
}

function toggleDevMenu() {
    if (devMenuUnlocked) {
        showDevMenu = !showDevMenu;
    }
}

function toggleDebugOverlay() {
    showDebugOverlay = !showDebugOverlay;
    console.log(`Debug overlay ${showDebugOverlay ? 'enabled' : 'disabled'}`);
}

function updateAndDrawBullets() {
    bullets = bullets.filter(b => {
        b.x += b.speedX;
        b.y += b.speedY;
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
        if (b.fromBoss) return true; // Don't remove boss bullets here

        let bulletHit = false;

        // Check collision with regular enemies
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

        // Check collision with final boss
        if (!bulletHit && boss && checkCollision({x: b.x - b.size, y: b.y - b.size, w: b.size * 2, h: b.size * 2}, boss)) {
            boss.health--;
            if (boss.health <= 0) {
                player.score += ENEMY_TYPES.finalBoss.score;
                explosions.push({
                    x: boss.x,
                    y: boss.y,
                    size: boss.w * 1.5,
                    duration: 30
                });
                showCongratulationsScreen();
            }
            bulletHit = true;
        }

        return !bulletHit;
    });
}

function checkPlayerEnemyCollisions() {
    if (!player.invincible && player.damageInvulnerable === 0) {
        enemies.forEach(e => {
            if (checkCollision(player, e)) {
                player.health -= 10;
                player.damageInvulnerable = 60;
                if (player.health <= 0) gameOver = true;
            }
        });
    } else if (player.damageInvulnerable > 0) {
        player.damageInvulnerable--;
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
                player.gunDuration = 600;
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
    
    const isMobile = window.innerWidth <= 768;
    const yPosition = 30;
    
    if (isMobile) {
        ctx.fillText(`Health: ${player.health} | Score: ${player.score} | Level: ${level}`, 10, yPosition);
        ctx.fillText(`Speed: ${player.speed.toFixed(1)} | Gun: ${player.currentGun} | Invuln: ${player.damageInvulnerable > 0 ? 'Yes' : 'No'}`, 10, yPosition + 30);
    } else {
        ctx.fillText(`Health: ${player.health} | Score: ${player.score} | Level: ${level} | Speed: ${player.speed.toFixed(1)} | Gun: ${player.currentGun} | Invuln: ${player.damageInvulnerable > 0 ? 'Yes' : 'No'}`, 10, yPosition);
    }
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${player.score}`, canvas.width / 2, canvas.height / 2 + 10);
    
    ctx.font = '18px Arial';
    ctx.fillText('Press SPACE to restart', canvas.width / 2, canvas.height / 2 + 50);
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

            if (level === 100) {
                enemies = []; // Clear all enemies
                createFinalBoss();
            }

            if (level > 100) {
                bossPhase = (bossPhase + 1) % 3; // Cycle through boss phases
            }
        }
    }
}

function trySpawnPowerUp() {
    if (Math.random() < 0.005) {
        spawnPowerUp();
    }
}

function handleDevMenuInteraction(e) {
    if (!devMenuUnlocked || !showDevMenu) return;

    let x, y;
    if (e.type === 'touchstart') {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        x = touch.clientX - rect.left;
        y = touch.clientY - rect.top;
    } else {
        const rect = canvas.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }

    const menuWidth = Math.min(300, canvas.width * 0.8);
    const menuItemHeight = 40;
    const menuItemCount = 8;
    const menuHeight = (menuItemCount + 1) * menuItemHeight;
    
    const menuStartX = (canvas.width - menuWidth) / 2;
    const menuStartY = (canvas.height - menuHeight) / 2;

    if (x >= menuStartX && x <= menuStartX + menuWidth &&
        y >= menuStartY + menuItemHeight && y <= menuStartY + menuHeight) {
        
        const optionIndex = Math.floor((y - (menuStartY + menuItemHeight)) / menuItemHeight);
        
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
                const newGun = prompt("Enter new gun type (default, spread, rapid, burst):", player.currentGun);
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






function addDebugMessage(message) {
    debugMessages.push(message);
    if (debugMessages.length > 10) {
        debugMessages.shift();
    }
}

function createFinalBoss() {
    boss = {
        x: canvas.width - 200,
        y: canvas.height / 2,
        w: ENEMY_TYPES.finalBoss.size,
        h: ENEMY_TYPES.finalBoss.size,
        health: ENEMY_TYPES.finalBoss.health,
        maxHealth: ENEMY_TYPES.finalBoss.health,
        color: ENEMY_TYPES.finalBoss.color,
        direction: 1,
        lastShot: 0
    };
    bossPhase = 0; // Initialize bossPhase when creating the boss
}

function updateAndDrawBoss() {
    if (!boss) return;

    // Move boss up and down
    boss.y += boss.direction * ENEMY_TYPES.finalBoss.speed;
    if (boss.y <= 0 || boss.y + boss.h >= canvas.height) {
        boss.direction *= -1;
    }

    // Draw boss using the image
    if (finalBossImage.complete) {
        ctx.drawImage(finalBossImage, boss.x, boss.y, boss.w, boss.h);
    } else {
        // Fallback to rectangle if image hasn't loaded
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
    }

    // Draw boss health bar
    const healthPercentage = boss.health / boss.maxHealth;
    ctx.fillStyle = 'red';
    ctx.fillRect(boss.x, boss.y - 20, boss.w, 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(boss.x, boss.y - 20, boss.w * healthPercentage, 10);

    // Boss shooting
    const now = Date.now();
    if (now - boss.lastShot > 1000) { // Shoot every second
        boss.lastShot = now;
        bossShoot();
    }
}

function bossShoot() {
    switch(bossPhase) {
        case 0: // Single bullet
            createBossBullet(0);
            break;
        case 1: // Three-way spread
            for (let i = -1; i <= 1; i++) {
                createBossBullet(i * Math.PI / 12);
            }
            break;
        case 2: // Circle pattern
            for (let i = 0; i < 8; i++) {
                createBossBullet(i * Math.PI / 4);
            }
            break;
    }
}

function createBossBullet(angle) {
    const speed = 5;
    bullets.push({
        x: boss.x,
        y: boss.y + boss.h / 2,
        speedX: -Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        size: 8,
        color: 'red',
        fromBoss: true
    });
}

function checkBossBulletCollisions() {
    bullets = bullets.filter(b => {
        if (b.fromBoss && checkCollision(player, {x: b.x - b.size, y: b.y - b.size, w: b.size * 2, h: b.size * 2})) {
            player.health -= 10;
            if (player.health <= 0) gameOver = true;
            return false;
        }
        return true;
    });
}

function checkPlayerBossCollisions() {
    if (boss && checkCollision(player, boss)) {
        player.health -= 20;
        if (player.health <= 0) gameOver = true;
    }
}

function showCongratulationsScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px Arial';
    ctx.fillText(`You beat the game! Final Score: ${player.score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.font = '18px Arial';
    ctx.fillText('Press SPACE to start a new game+', canvas.width / 2, canvas.height / 2 + 50);

    gameOver = true;
}

function gameLoop(currentTime) {
    frameCount++;
    if (currentTime - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = currentTime;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawStarryBackground();
    
    if (!gameOver) {
        drawDetailedShip(player.x, player.y, player.w, player.h, COLORS.player, true);
        
        if (level === 100 && !boss) {
            createFinalBoss();
        }

        if (boss) {
            updateAndDrawBoss();
            checkBossBulletCollisions();
            checkPlayerBossCollisions();
        } else {
            enemies.forEach((enemy) => {
                drawEnemy(enemy);
            });
            
            if (Math.random() < 0.02) {
                spawnEnemy();
            }
        }
        
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
        trySpawnPowerUp();

        if (devMenuUnlocked && showDevMenu) {
            drawDevMenu();
        }

        requestAnimationFrame(gameLoop);
    } else {
        if (boss && boss.health <= 0) {
            showCongratulationsScreen();
        } else {
            drawGameOver();
        }
        window.addEventListener('keydown', handleRestart);
        canvas.addEventListener('touchstart', handleRestart);
    }
}

function handleRestart(e) {
    if (e.code === 'Space' || e.type === 'touchstart') {
        e.preventDefault();
        const currentScore = player.score;
        initGame();
        player.score = currentScore;
        level = boss ? 1 : level; // Reset to level 1 if boss was defeated
        boss = null;
        bossPhase = 0;
    }
}

function handleKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        keys[e.code] = true;
        isUsingKeyboard = true;
    }
    if (e.code === 'KeyP') {
        toggleDevMenu();
    }
}

function handleKeyUp(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        keys[e.code] = false;
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

    // Set initial canvas size
    resizeCanvas();

    // Add event listener for window resize and orientation change
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    // Remove existing listeners to prevent duplicates
    canvas.removeEventListener('touchstart', handleTouch);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('touchcancel', handleTouchEnd);
    canvas.removeEventListener('click', handleDevMenuInteraction);
    canvas.removeEventListener('touchstart', handleDevMenuInteraction);

    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Add dev menu interaction listeners
    canvas.addEventListener('click', handleDevMenuInteraction);
    canvas.addEventListener('touchstart', handleDevMenuInteraction, { passive: false });

    // Add keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    initGame();
}

// Add an event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeGame);