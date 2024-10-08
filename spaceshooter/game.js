//charlie aka reekid96 was here :3

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
let cumulativeScore = 0;
let isNewGamePlus = false;
let bulletDamage = 1;
let sounds = {};
let localSounds = {};
let soundsLoaded = false;
let gameVolume = 0.5;
let shootSoundPool = [];
let explosionSoundPool = [];
const SOUND_POOL_SIZE = 5;
let isLoggedIn = false;
let currentUser = null;
let isDevUser = false;

const db = firebase.firestore();
const rtdb = firebase.database()

function showLoginOverlay() {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) {
        loginOverlay.style.display = 'flex';
    }
}

function hideLoginOverlay() {
    document.getElementById('loginOverlay').style.display = 'none';
}

window.handleLogin = async function() {
    console.log('handleLogin function called');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        console.log(`Sending request to ${API_URL}/login`);
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            mode: 'cors',
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            isLoggedIn = true;
            currentUser = username;
console.log('Current user set to:', currentUser);
            isDevUser = data.isDevUser;
            hideLoginOverlay();
            if (isDevUser) {
                devMenuUnlocked = true;
                createDevMenuButton();
            }
            await startGame();
        } else {
            document.getElementById('loginMessage').textContent = data.message || 'Invalid username or password';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginMessage').textContent = 'An error occurred. Please try again.';
    }
}


async function handleRegistration(username, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();

        if (data.success) {
            alert('Registration successful! You can now log in.');
            // Automatically log in after successful registration
            await handleLogin({ preventDefault: () => {} });
        } else {
            alert(data.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration. Please try again.');
    }
}


function addScoreToLeaderboard(name, score) {
    console.log(`Adding score to leaderboard: ${name}, ${score}`); // Add this line for debugging
    return fetch(`${API_URL}/leaderboard`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: name, score: score }),
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('Score added to leaderboard successfully');
        } else {
            console.error('Failed to add score to leaderboard:', data.message);
        }
    })
    .catch((error) => {
        console.error("Error adding score to leaderboard:", error);
    });
}

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
    burst: { cooldown: 400, bulletSpeed: 9, bulletSize: 4, color: '#FFA500', burstCount: 3, burstDelay: 50 }
};

const ENEMY_TYPES = {
    basic: { health: 2, speed: 2, size: 30, color: COLORS.enemy, score: 10 },
    fast: { health: 1, speed: 4, size: 20, color: '#FF00FF', score: 20 },
    tank: { health: 3, speed: 1, size: 40, color: '#00FFFF', score: 30 },
    miniBoss: { health: 20, speed: 0.5, size: 60, color: '#FFA500', score: 100 },
    bigBoss: { health: 100, speed: 0.2, size: 100, color: '#FF0000', score: 500 },
    finalBoss: { health: 1000, speed: 2, size: 150, color: '#FF1493', score: 100000 },
    special: { health: 200, speed: 1, size: 50, color: '#800080', score: 1000 }
};

// Image loading
const playerImage = new Image();
playerImage.src = '../images/player.webp';

const enemyImage = new Image();
enemyImage.src = '../images/basic&bigboss.webp';

const explosionImage = new Image();
explosionImage.src = '../images/explosion.webp';

const finalBossImage = new Image();
finalBossImage.src = '../images/final-boss.webp';

const blueShipImage = new Image();
blueShipImage.src = '../images/blue_ship.webp';

const specialEnemyImage = new Image();
specialEnemyImage.src = '../images/nokotan.webp';

const congratsImage = new Image();
congratsImage.src = '../images/diegos-waifu.webp';

const freakyShipImage = new Image();
freakyShipImage.src = '../images/freaky_ship.webp';

const miniBossImage = new Image();
miniBossImage.src = '../images/miniboss.webp';

function loadLocalSounds() {
    const soundFiles = {
        gameOver: '../sounds/game_over.mp3',
        victory: '../sounds/victory.mp3'
    };

    for (const [key, path] of Object.entries(soundFiles)) {
        localSounds[key] = new Audio(path);
        localSounds[key].volume = gameVolume;
        localSounds[key].addEventListener('canplaythrough', () => {
            console.log(`Loaded local sound: ${key}`);
        });
        localSounds[key].addEventListener('error', (e) => {
            console.error(`Error loading local sound ${key}:`, e);
        });
    }

    initializeSoundPools();
}

// Function to load the SoundCloud Widget API
function loadSoundCloudWidgetAPI() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://w.soundcloud.com/player/api.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

// Function to create a SoundCloud Widget
function createSoundCloudWidget(trackUrl) {
    const iframe = document.createElement('iframe');
    iframe.width = "100";
    iframe.height = "100";
    iframe.allow = "autoplay";
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;
    iframe.style.display = 'none';  // Hide the iframe
    document.body.appendChild(iframe);
    return SC.Widget(iframe);
}

// Function to initialize SoundCloud Widgets
async function initializeSoundCloudWidgets() {
    await loadSoundCloudWidgetAPI();

    const soundUrls = {
        enemyExplosion: 'https://soundcloud.com/purple-guy-774405712/explosion',
        shoot: 'https://soundcloud.com/purple-guy-774405712/shoot',
        gameOver: 'https://soundcloud.com/purple-guy-774405712/game-over',
        victory: 'https://soundcloud.com/purple-guy-774405712/victory'
    };

    for (const [key, url] of Object.entries(soundUrls)) {
        try {
            sounds[key] = createSoundCloudWidget(url);
            console.log(`Created widget for ${key} sound`);
        } catch (error) {
            console.error(`Error creating widget for ${key} sound:`, error);
        }
    }
}

// Function to play sounds
function initializeSoundPools() {
    for (let i = 0; i < SOUND_POOL_SIZE; i++) {
        let shootSound = new Audio('../sounds/shoot.mp3');
        shootSound.volume = gameVolume;
        shootSoundPool.push(shootSound);

        let explosionSound = new Audio('../sounds/explosion.mp3');
        explosionSound.volume = gameVolume;
        explosionSoundPool.push(explosionSound);
    }
}

function playPooledSound(pool) {
    for (let sound of pool) {
        if (sound.paused || sound.ended) {
            sound.play().catch(error => console.error('Error playing sound:', error));
            return;
        }
    }
    // If all sounds are playing, play the first one anyway
    pool[0].currentTime = 0;
    pool[0].play().catch(error => console.error('Error playing sound:', error));
}

function playSound(soundName) {
    if (!soundsLoaded) {
        console.warn('Sounds not loaded yet');
        return;
    }

    switch(soundName) {
        case 'shoot':
            playPooledSound(shootSoundPool);
            break;
        case 'enemyExplosion':
            playPooledSound(explosionSoundPool);
            break;
        default:
            if (localSounds[soundName]) {
                localSounds[soundName].volume = gameVolume;
                localSounds[soundName].currentTime = 0;
                localSounds[soundName].play().catch(error => {
                    console.error(`Error playing local sound ${soundName}:`, error);
                    fallbackToSoundCloud(soundName);
                });
            } else {
                fallbackToSoundCloud(soundName);
            }
    }
}

function fallbackToSoundCloud(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].setVolume(gameVolume * 100);
        sounds[soundName].seekTo(0);
        sounds[soundName].play();
        console.log(`Falling back to SoundCloud for ${soundName}`);
    } else {
        console.warn(`Sound ${soundName} not available`);
    }
}
function createVolumeControl() {
    // Remove any existing volume control to avoid duplicates
    const existingControl = document.getElementById('volumeControl');
    if (existingControl) {
        existingControl.remove();
    }

    const volumeControl = document.createElement('div');
    volumeControl.id = 'volumeControl';
    volumeControl.style.position = 'absolute';
    volumeControl.style.top = '10px';
    volumeControl.style.right = '10px';
    volumeControl.style.zIndex = '1000';
    volumeControl.innerHTML = `
        <label for="volumeSlider" style="color: white;">Volume: </label>
        <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="${gameVolume}">
    `;
    document.body.appendChild(volumeControl);

    // Use a small delay to ensure the element is in the DOM
    setTimeout(() => {
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                gameVolume = parseFloat(e.target.value);
                // Update volume for all local sounds
                for (let sound in localSounds) {
                    localSounds[sound].volume = gameVolume;
                }
                // Update volume for sound pools
                shootSoundPool.forEach(sound => sound.volume = gameVolume);
                explosionSoundPool.forEach(sound => sound.volume = gameVolume);
                // Update volume for all SoundCloud widgets
                for (let sound in sounds) {
                    if (sounds[sound] && sounds[sound].setVolume) {
                        sounds[sound].setVolume(gameVolume * 100);
                    }
                }
            });
        } else {
            console.error('Volume slider element not found');
        }
    }, 0);
}

function createUIOverlay() {
    const uiOverlay = document.getElementById('ui-overlay');
    if (!uiOverlay) {
        console.error('UI overlay element not found');
        return;
    }

    // Clear existing content
    uiOverlay.innerHTML = '';

    // Create volume control
    const volumeControl = document.createElement('div');
    volumeControl.id = 'volumeControl';
    volumeControl.innerHTML = `
        <label for="volumeSlider" style="color: white;">Volume: </label>
        <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="${gameVolume}">
    `;
    uiOverlay.appendChild(volumeControl);

    // Create leaderboard toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'leaderboard-toggle';
    toggleButton.textContent = 'Toggle Leaderboard';
    toggleButton.style.marginTop = '20px'; // Add some space between volume control and button
    toggleButton.addEventListener('click', toggleLeaderboard);
    uiOverlay.appendChild(toggleButton);

    // Create leaderboard container
    const leaderboardContainer = document.createElement('div');
    leaderboardContainer.id = 'leaderboard';
    leaderboardContainer.style.display = 'none';
    uiOverlay.appendChild(leaderboardContainer);

    // Add volume control event listener
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function(e) {
            gameVolume = parseFloat(e.target.value);
            updateAllSoundVolumes();
        });
    }
}

function setupGameOverListeners() {
    // Remove any existing event listeners to prevent duplicates
    window.removeEventListener('keydown', handleRestart);
    if (canvas) {
        canvas.removeEventListener('touchstart', handleRestart);
    }

    // Add event listeners for restart
    window.addEventListener('keydown', handleRestart);
    if (canvas) {
        canvas.addEventListener('touchstart', handleRestart);
    }
}
async function startGame() {
    window.removeEventListener('keydown', handleRestart);
    
    // Get the canvas element
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    
    if (canvas) {
        canvas.removeEventListener('touchstart', handleRestart);
    }
    
    if (isNewGamePlus) {
        cumulativeScore += player ? player.score : 0;
    } else {
        cumulativeScore = 0;
    }
    
    // Initialize game state
    gameOver = false;
    gameOverSoundPlayed = false;
    player = {
        x: 50,
        y: canvas.height / 2,
        w: 50,
        h: 30,
        speed: 5,
        baseSpeed: 5,
        minSpeed: 1,
        maxSpeed: 20,
        health: 100,
        score: 0,
        currentGun: 'default',
        gunDuration: 0,
        lastShot: 0,
        damageInvulnerable: 0,
        invincible: false
    };

    bullets = []; enemies = []; powerUps = []; stars = []; explosions = [];
    level = 1;
    showDevMenu = false;
    boss = null;
    bossPhase = 0;
    bulletDamage = 1;
   
    // Set up touch event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('click', handleDevMenuInteraction);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    createStars();

    loadLocalSounds();
    try {
        await initializeSoundCloudWidgets();
        console.log('SoundCloud Widgets initialized successfully');
    } catch (error) {
        console.error('Error initializing SoundCloud Widgets:', error);
    }
    soundsLoaded = true;
    
    // Add volume control event listener
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.value = gameVolume;
        volumeSlider.addEventListener('input', function(e) {
            gameVolume = parseFloat(e.target.value);
            updateAllSoundVolumes();
        });
    }
    
    createUIOverlay();
    
    setupGameOverListeners();
    setTimeout(createVolumeControl, 100);
    if (typeof displayLeaderboard === 'function') {
        displayLeaderboard();
    } else {
        console.error('displayLeaderboard function not found');
    }

    requestAnimationFrame(gameLoop);
    
}

function updateAllSoundVolumes() {
    // Update volume for all local sounds
    for (let sound in localSounds) {
        localSounds[sound].volume = gameVolume;
    }
    // Update volume for sound pools
    shootSoundPool.forEach(sound => sound.volume = gameVolume);
    explosionSoundPool.forEach(sound => sound.volume = gameVolume);
    // Update volume for all SoundCloud widgets
    for (let sound in sounds) {
        if (sounds[sound] && sounds[sound].setVolume) {
            sounds[sound].setVolume(gameVolume * 100);
        }
    }
}


function resizeCanvas() {
    if (canvas) {
        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Adjust for mobile browsers' UI
            setTimeout(() => {
                canvas.height = window.innerHeight;
            }, 100);
        } else {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
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
    
    const isLandscape = canvas.width > canvas.height;
    const buttonSize = Math.min(120, canvas.width / 6);
    const gap = 20;
    const sliderHeight = isLandscape ? canvas.height * 0.8 : canvas.height * 0.6;
    const sliderWidth = buttonSize / 2;
    
    touchControls = {
        moveSlider: { x: 20, y: (canvas.height - sliderHeight) / 2, w: sliderWidth, h: sliderHeight, value: 0.5 },
        speedSlider: { x: canvas.width - sliderWidth - 20, y: (canvas.height - sliderHeight) / 2, w: sliderWidth, h: sliderHeight, value: 0.5 },
        shoot: { 
            x: isLandscape ? canvas.width - buttonSize * 1.5 - gap : canvas.width / 2 - buttonSize, 
            y: canvas.height - buttonSize - gap, 
            w: buttonSize, 
            h: buttonSize 
        }
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
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHOOT', x + w / 2, y + h / 2);
    
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
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
            if (activeTouches[touch.identifier].control === 'shoot') {
                keys.shoot = false;
            }
            delete activeTouches[touch.identifier];
        }
    }
    if (Object.keys(activeTouches).length === 0) {
        activeSlider = null;
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
    if (e.type === 'special' && specialEnemyImage.complete) {
        ctx.drawImage(specialEnemyImage, e.x, e.y, e.w, e.h);
    } else if (e.type === 'tank' && blueShipImage.complete) {
        ctx.drawImage(blueShipImage, e.x, e.y, e.w, e.h);
    } else if (e.type === 'fast' && freakyShipImage.complete) {
        ctx.drawImage(freakyShipImage, e.x, e.y, e.w, e.h);
    } else if (e.type === 'miniBoss' && miniBossImage.complete) {
        ctx.drawImage(miniBossImage, e.x, e.y, e.w, e.h);
    } else {
        drawDetailedShip(e.x, e.y, e.w, e.h, e.color, false, e.type);
    }
    
    
    if (e.type === 'miniBoss' || e.type === 'bigBoss' || e.type === 'special') {
        const healthPercentage = e.health / e.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x, e.y - 10, e.w, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(e.x, e.y - 10, e.w * healthPercentage, 5);
    }
}

function spawnEnemy() {
    let type;
    if (Math.random() < 0.001) { // 1 in 1000 chance
        type = 'special';
    } else if (level % 50 === 0 && !enemies.some(e => e.type === 'bigBoss')) {
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
        playSound('shoot');
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
    const menuItemCount = 9; 
    const menuHeight = (menuItemCount + 1) * menuItemHeight;
    
    const menuStartX = (canvas.width - menuWidth) / 2;
    const menuStartY = (canvas.height - menuHeight) / 2;

    ctx.fillStyle = COLORS.devMenu;
    ctx.fillRect(menuStartX, menuStartY, menuWidth, menuHeight);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Dev Menu', menuStartX + 10, menuStartY + 25);

    const menuItems = [
        'Set Level', 'Set Health', 'Set Gun', 'Set Score',
        'Set Cumulative Score', 'Spawn Enemy', 'Clear Enemies', 'Set Bullet Damage',
        'Toggle Invincibility' 
    ];

    menuItems.forEach((item, index) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(menuStartX, menuStartY + (index + 1) * menuItemHeight, menuWidth, menuItemHeight);
        ctx.fillStyle = 'white';
        ctx.fillText(item, menuStartX + 10, menuStartY + (index + 2) * menuItemHeight - 10);
    });
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
                e.health -= bulletDamage;
                if (e.health <= 0) {
                    player.score += e.score;
                    explosions.push({
                        x: e.x,
                        y: e.y,
                        size: e.w * 1.5,
                        duration: 30
                    });
                    playSound('enemyExplosion');
    return false;
}
                bulletHit = true;
            }
            return true;
        });

        // Check collision with final boss
        if (!bulletHit && boss && checkCollision({x: b.x - b.size, y: b.y - b.size, w: b.size * 2, h: b.size * 2}, boss)) {
            boss.health -= bulletDamage;
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
                if (e.type === 'special') {
                    player.health = 0;
                    gameOver = true;
                } else {
                    player.health -= 10;
                    player.damageInvulnerable = 60;
                    if (player.health <= 0) gameOver = true;
                }
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
        ctx.fillText(`Health: ${player.health} | Score: ${player.score} | Total: ${cumulativeScore + player.score}`, 10, yPosition);
        ctx.fillText(`Level: ${level} | Speed: ${player.speed.toFixed(1)} | Gun: ${player.currentGun}`, 10, yPosition + 30);
        ctx.fillText(`Invuln: ${player.damageInvulnerable > 0 ? 'Yes' : 'No'} | Invincible: ${player.invincible ? 'Yes' : 'No'}`, 10, yPosition + 60);
    } else {
        ctx.fillText(`Health: ${player.health} | Score: ${player.score} | Total: ${cumulativeScore + player.score} | Level: ${level}`, 10, yPosition);
        ctx.fillText(`Speed: ${player.speed.toFixed(1)} | Gun: ${player.currentGun}`, 10, yPosition + 30);
    }
}

function drawGameOver() {
    playSound('gameOver'); // Play game over sound
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${player.score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`Total Score: ${cumulativeScore + player.score}`, canvas.width / 2, canvas.height / 2 + 40);
    
    ctx.font = '18px Arial';
    ctx.fillText('Press SPACE to restart', canvas.width / 2, canvas.height / 2 + 80);

    // We'll handle score submission in the handleRestart function
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
    const menuItemCount = 9;
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
                const newScore = prompt("Enter new score:", player.score);
                if (newScore) devMenu.setScore(parseInt(newScore));
                break;
            case 4:
                const newCumulativeScore = prompt("Enter new cumulative score:", cumulativeScore);
                if (newCumulativeScore) devMenu.setCumulativeScore(parseInt(newCumulativeScore));
                break;
            case 5:
                const enemyType = prompt("Enter enemy type to spawn:", "basic");
                if (enemyType) devMenu.spawnEnemy(enemyType);
                break;
            case 6:
                devMenu.clearEnemies();
                break;
            case 7:
                const newBulletDamage = prompt("Enter new bullet damage:", bulletDamage);
                if (newBulletDamage) devMenu.setBulletDamage(parseInt(newBulletDamage));
                break;
            case 8: 
                devMenu.toggleInvincibility();
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
    playSound('victory'); // Play victory sound
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the congratulatory image
    if (congratsImage.complete) {
        const imageWidth = 200;
        const imageHeight = 200;
        const imageX = canvas.width / 2 - imageWidth / 2;
        const imageY = canvas.height / 4 - imageHeight / 2;
        ctx.drawImage(congratsImage, imageX, imageY, imageWidth, imageHeight);
    } else {
        // Fallback if image hasn't loaded
        ctx.fillStyle = '#888888';
        ctx.fillRect(canvas.width / 2 - 100, canvas.height / 4 - 100, 200, 200);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Congratulatory Image', canvas.width / 2, canvas.height / 4 + 120);
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2 + 50);
    ctx.font = '24px Arial';
    ctx.fillText(`You beat the game!`, canvas.width / 2, canvas.height / 2 + 100);
    ctx.fillText(`Final Score: ${player.score}`, canvas.width / 2, canvas.height / 2 + 130);
    ctx.fillText(`Total Score: ${cumulativeScore + player.score}`, canvas.width / 2, canvas.height / 2 + 160);
    
    // Add a fun message about the reward
    ctx.font = '20px Arial';
    ctx.fillText('congratulations you win miku but only if your diego rodriguez aka spydudereek if your not then you get a freakyship', canvas.width / 2, canvas.height / 2 + 200);

    ctx.font = '18px Arial';
    ctx.fillText('Press SPACE to start a new game+', canvas.width / 2, canvas.height - 50);

    gameOver = true;
    isNewGamePlus = true;  // Set this flag for the next game
    
    // We'll handle score submission in the handleRestart function
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
        
         // Remove any existing event listeners to prevent duplicates
         window.removeEventListener('keydown', handleRestart);
         canvas.removeEventListener('touchstart', handleRestart);
         
        // Add event listeners for restart
        window.addEventListener('keydown', handleRestart);
        canvas.addEventListener('touchstart', handleRestart);
    }
}

function handleRestart(e) {
    if ((e.code === 'Space' || e.type === 'touchstart') && gameOver) {
        e.preventDefault();
        
        // Submit the score before starting a new game
        const totalScore = cumulativeScore + player.score;
        console.log(`Submitting score: ${currentUser}, ${totalScore}`); // Add this line for debugging
        addScoreToLeaderboard(currentUser, totalScore);
        
        // Remove the event listeners
        window.removeEventListener('keydown', handleRestart);
        canvas.removeEventListener('touchstart', handleRestart);
        
        startGame();
        displayLeaderboard(); // Update leaderboard display
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
    setBulletDamage: (newDamage) => {
        if (newDamage > 0) {
            bulletDamage = newDamage;
            console.log(`Bullet damage set to ${bulletDamage}`);
        } else {
            console.log("Invalid damage. Please enter a positive number.");
        }
    },
    setScore: (newScore) => {
        if (newScore >= 0) {
            player.score = newScore;
            console.log(`Score set to ${player.score}`);
            console.log(`Total score: ${cumulativeScore + player.score}`);
            checkLevelUp(); // Check if the new score affects the level
        } else {
            console.log("Invalid score. Please enter a non-negative number.");
        }
    },
    setCumulativeScore: (newScore) => {
        if (newScore >= 0) {
            cumulativeScore = newScore;
            console.log(`Cumulative score set to ${cumulativeScore}`);
            console.log(`Total score: ${cumulativeScore + player.score}`);
        } else {
            console.log("Invalid score. Please enter a non-negative number.");
        }
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





async function initializeGame() {
    if (!isLoggedIn) {
        showLoginOverlay();
        return;
    }
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
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 100);
    });

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
    displayLeaderboard();
    await startGame();
    }


// Add an event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found');
    }

    console.log('DOM fully loaded');
    showLoginOverlay();
});