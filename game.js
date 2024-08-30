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

// Add touch controls
const touchControls = {
    up: { x: 10, y: canvas.height - 110, w: 80, h: 80 },
    down: { x: 10, y: canvas.height - 20, w: 80, h: 80 },
    speedDown: { x: canvas.width - 180, y: canvas.height - 110, w: 80, h: 80 },
    speedUp: { x: canvas.width - 180, y: canvas.height - 20, w: 80, h: 80 },
    shoot: { x: canvas.width - 90, y: canvas.height - 65, w: 80, h: 80 }
};

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
                keys[control] = true;
                return;
            }
        }
    }
}

function handleTouchEnd(e) {
    for (const control in touchControls) {
        keys[control] = false;
    }
}

canvas.addEventListener('touchstart', handleTouch, false);
canvas.addEventListener('touchmove', handleTouch, false);
canvas.addEventListener('touchend', handleTouchEnd, false);

// ... (rest of the code remains the same until the gameLoop function)

function gameLoop() {
    // ... (existing game loop code)

    if (keys.up && player.y > 0) player.y -= player.speed;
    if (keys.down && player.y < canvas.height - player.h) player.y += player.speed;
    if (keys.speedDown) player.speed = Math.max(player.minSpeed, player.speed - 0.2);
    if (keys.speedUp) player.speed = Math.min(player.maxSpeed, player.speed + 0.2);

    if (keys.shoot) shoot();

    // ... (rest of the game loop code)

    drawTouchControls();

    requestAnimationFrame(gameLoop);
}

// ... (rest of the code remains the same)

window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    keys[e.code] = true;
});
window.addEventListener('keyup', e => keys[e.code] = false);

gameLoop();
