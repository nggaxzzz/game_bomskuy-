/* ============================================================
   BOMSKUY - ARCADE BOMBER ENGINE WITH 3 LEVELS & ANIMATION
   ============================================================ */

// --- KONFIGURASI GAME ---
const GRID_COLS = 15; 
const GRID_ROWS = 13; 
const BOM_COUNTDOWN = 2500; 
const EXPLOSION_DURATION = 650; 
const INVINCIBLE_DURATION = 2000; 

// --- GAME STATE ---
let gameState = {
    playerName: "PLAYER",
    score: 0,
    lives: 3,
    timeElapsed: 0, 
    enemiesKilled: 0,
    currentLevel: 1, // Level aktif saat ini
    maxLevels: 3,    // Batas akhir level game
    isGameOver: false,
    isWon: false,
    activeScreen: "welcome"
};

// --- PLAYER STATE ---
let player = {
    x: 1, 
    y: 1, 
    radius: 2, 
    speed: 1, 
    isMoving: false,
    isInvincible: false
};

// --- DATA STRUKTUR GAME ---
let grid = []; 
let bombs = []; 
let enemies = []; 
let items = {}; 
let timers = {}; 

const TILE_EMPTY = 0;
const TILE_SOLID = 1;
const TILE_BREAKABLE = 2;

// --- DOM ELEMENTS ---
const screens = {
    welcome: document.getElementById("welcome-screen"),
    game: document.getElementById("game-screen"),
    gameover: document.getElementById("gameover-screen"),
    win: document.getElementById("win-screen")
};

const hud = {
    name: document.getElementById("hud-name"),
    score: document.getElementById("hud-score"),
    lives: document.getElementById("hud-lives"),
    timer: document.getElementById("hud-timer"),
    enemies: document.getElementById("hud-enemies")
};

const stats = {
    radius: document.getElementById("stat-radius"),
    speed: document.getElementById("stat-speed")
};

const results = {
    goName: document.getElementById("go-name"),
    goScore: document.getElementById("go-score"),
    goTime: document.getElementById("go-time"),
    goKills: document.getElementById("go-kills"),
    winName: document.getElementById("win-name"),
    winScore: document.getElementById("win-score"),
    winTime: document.getElementById("win-time"),
    winKills: document.getElementById("win-kills")
};

const gameGridEl = document.getElementById("game-grid");
const nameInput = document.getElementById("player-name-input");

// ==========================================
// 1. INISIALISASI & NAVIGASI LAYAR
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
    initWelcomeScreen();
    setupEventListeners();
});

function changeScreen(screenName) {
    gameState.activeScreen = screenName;
    Object.keys(screens).forEach(key => {
        if (key === screenName) {
            screens[key].classList.add("active");
        } else {
            screens[key].classList.remove("active");
        }
    });
}

function initWelcomeScreen() {
    changeScreen("welcome");
    createParticles();
    nameInput.value = "";
    nameInput.focus();
}

function createParticles() {
    const container = document.getElementById("bg-particles");
    container.innerHTML = "";
    const pCount = 20;
    for (let i = 0; i < pCount; i++) {
        const p = document.createElement("div");
        p.classList.add("particle");
        p.style.left = `${Math.random() * 100}%`;
        p.style.bottom = `-10px`;
        const size = Math.random() * 6 + 2;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.background = Math.random() > 0.5 ? "var(--cyan)" : "var(--purple)";
        p.style.animationDuration = `${Math.random() * 8 + 4}s`;
        p.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(p);
    }
}

// ==========================================
// 2. LOGIKA UTAMA GAME & SISTEM LEVEL UP
// ==========================================

function startGame() {
    const inputName = nameInput.value.trim();
    gameState.playerName = inputName !== "" ? inputName.toUpperCase() : "PLAYER 1";
    
    // Reset Total Game State ke awal mula
    gameState.score = 0;
    gameState.lives = 3;
    gameState.timeElapsed = 0;
    gameState.enemiesKilled = 0;
    gameState.currentLevel = 1; 
    gameState.isGameOver = false;
    gameState.isWon = false;

    startLevel();

    // Jalankan Loop Waktu global
    clearInterval(timers.gameClock);
    timers.gameClock = setInterval(() => {
        gameState.timeElapsed++;
        updateHUD();
    }, 1000);

    changeScreen("game");
    window.addEventListener("resize", resizeGameGrid);
}

function startLevel() {
    // Reset Player Posisi ke pojok kiri atas
    player.x = 1;
    player.y = 1;
    player.isMoving = false;
    player.isInvincible = false;

    // Bersihkan entitas sisa level sebelumnya
    bombs = [];
    enemies = [];
    items = {};

    clearInterval(timers.enemyAI);

    // Setup Grid Map Baru
    generateMapGrid();

    // Tingkat kesulitan berdasarkan Level (LV1 = 3, LV2 = 5, LV3 = 7 musuh)
    let enemyCount = 1 + (gameState.currentLevel * 2); 
    spawnEnemies(enemyCount);

    updateHUD();
    resizeGameGrid();
    renderPlayer();

    // Efek kilatan layar saat level baru dimulai
    triggerScreenFlash("white");

    // Jalankan pergerakan AI Musuh
    timers.enemyAI = setInterval(() => {
        updateEnemiesAI();
    }, 400);
}

function checkLevelOrWinCondition() {
    if (enemies.length === 0 && !gameState.isGameOver && !gameState.isWon) {
        
        // JIKA MENANG TINGKAT LEVEL (Masih ada level berikutnya)
        if (gameState.currentLevel < gameState.maxLevels) {
            gameState.currentLevel++;
            
            gameState.score += 500; // Bonus skor naik level
            updateHUD();

            // Hentikan sementara pergerakan AI musuh agar aman selama animasi
            clearInterval(timers.enemyAI); 

            // Panggil Animasi Naik Level Keren
            showLevelUpAnimation(`LEVEL ${gameState.currentLevel - 1} CLEAR!`);

            // Beri jeda 2 detik (menunggu animasi selesai) baru masuk ke level berikutnya
            setTimeout(() => {
                startLevel();
            }, 2000);

        } else {
            // JIKA MENANG TOTAL (Berhasil menyelesaikan Level 3)
            gameState.isWon = true;
            stopGameTimers();
            
            results.winName.innerText = gameState.playerName;
            results.winScore.innerText = gameState.score;
            results.winTime.innerText = formatTime(gameState.timeElapsed);
            results.winKills.innerText = gameState.enemiesKilled;
            
            triggerConfetti();
            setTimeout(() => changeScreen("win"), 500);
        }
    }
}

// Fungsi membuat overlay teks animasi naik level secara dinamis
function showLevelUpAnimation(textMessage) {
    const animEl = document.createElement("div");
    animEl.className = "level-up-overlay";
    animEl.innerText = textMessage;

    screens.game.appendChild(animEl);

    // Bikin layar berkedip flash putih dramatis
    triggerScreenFlash("white");

    // Hapus elemen teks dari layar setelah 2 detik agar bersih kembali
    setTimeout(() => {
        animEl.remove();
    }, 2000);
}

function stopGameTimers() {
    clearInterval(timers.gameClock);
    clearInterval(timers.enemyAI);
}

function triggerGameOver() {
    gameState.isGameOver = true;
    stopGameTimers();

    results.goName.innerText = gameState.playerName;
    results.goScore.innerText = gameState.score;
    results.goTime.innerText = formatTime(gameState.timeElapsed);
    results.goKills.innerText = gameState.enemiesKilled;

    setTimeout(() => changeScreen("gameover"), 800);
}

// ==========================================
// 3. GENERASI MAP & RESPONSIVE GRID
// ==========================================

function generateMapGrid() {
    gameGridEl.innerHTML = "";
    grid = [];
    
    gameGridEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;
    gameGridEl.style.gridTemplateRows = `repeat(${GRID_ROWS}, 1fr)`;

    for (let r = 0; r < GRID_ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < GRID_COLS; c++) {
            let type = TILE_EMPTY;

            if (r === 0 || r === GRID_ROWS - 1 || c === 0 || c === GRID_COLS - 1 || (r % 2 === 0 && c % 2 === 0)) {
                type = TILE_SOLID;
            } 
            else if (!((r === 1 && c === 1) || (r === 1 && c === 2) || (r === 2 && c === 1))) {
                // Kerapatan bata naik bertahap (LV1: 30%, LV2: 35%, LV3: 40%)
                let brickChance = 0.25 + (gameState.currentLevel * 0.05);
                if (Math.random() < brickChance) {
                    type = TILE_BREAKABLE;
                }
            }

            grid[r][c] = type;

            const tileEl = document.createElement("div");
            tileEl.id = `tile-${r}-${c}`;
            tileEl.className = "tile";
            if (type === TILE_SOLID) tileEl.classList.add("tile-solid");
            else if (type === TILE_BREAKABLE) tileEl.classList.add("tile-breakable");
            else tileEl.classList.add("tile-empty");

            gameGridEl.appendChild(tileEl);
        }
    }
}

function resizeGameGrid() {
    if (gameState.activeScreen !== "game") return;
    
    const hudHeight = document.getElementById("hud").offsetHeight;
    const statusBarHeight = document.getElementById("status-bar").offsetHeight;
    const mobileControlsHeight = document.getElementById("mobile-controls").offsetHeight;
    
    let isMobile = window.getComputedStyle(document.getElementById("mobile-controls")).display !== "none";
    let offsetHeight = hudHeight + statusBarHeight + (isMobile ? mobileControlsHeight : 0) + 40;

    let availableWidth = window.innerWidth - 32;
    let availableHeight = window.innerHeight - offsetHeight;

    let tileW = availableWidth / GRID_COLS;
    let tileH = availableHeight / GRID_ROWS;
    let tileSize = Math.floor(Math.min(tileW, tileH, 60)); 
    if (tileSize < 24) tileSize = 24; 

    document.documentElement.style.setProperty('--ts', `${tileSize}px`);
    gameGridEl.style.width = `${tileSize * GRID_COLS}px`;
    gameGridEl.style.height = `${tileSize * GRID_ROWS}px`;

    renderPlayer();
    enemies.forEach(e => renderEnemyDOM(e));
    bombs.forEach(b => {
        const bombEl = document.getElementById(`bomb-${b.id}`);
        if(bombEl) setEntityGridPosition(bombEl, b.x, b.y);
    });
}

function setEntityGridPosition(element, x, y) {
    element.style.width = "var(--ts)";
    element.style.height = "var(--ts)";
    element.style.left = `calc(${x} * var(--ts))`;
    element.style.top = `calc(${y} * var(--ts))`;
}

// ==========================================
// 4. KONTROL GERAKAN PLAYER
// ==========================================

function movePlayer(dx, dy) {
    if (gameState.isGameOver || gameState.isWon || player.isMoving) return;

    let targetX = player.x + dx;
    let targetY = player.y + dy;

    if (grid[targetY][targetX] !== TILE_EMPTY) return;

    let hitBomb = bombs.some(b => b.x === targetX && b.y === targetY);
    if (hitBomb) return;

    player.isMoving = true;
    player.x = targetX;
    player.y = targetY;

    renderPlayer();
    checkItemPickup(player.x, player.y);
    checkPlayerEnemyCollision();

    setTimeout(() => {
        player.isMoving = false;
    }, 110 / player.speed); 
}

function renderPlayer() {
    let playerEl = document.getElementById("player");
    if (!playerEl) {
        playerEl = document.createElement("div");
        playerEl.id = "player";
        playerEl.innerHTML = `<div class="player-body">🧑‍🚀</div>`;
        gameGridEl.appendChild(playerEl);
    }
    
    if (player.isInvincible) playerEl.classList.add("invincible");
    else playerEl.classList.remove("invincible");

    setEntityGridPosition(playerEl, player.x, player.y);
}

// ==========================================
// 5. SISTEM BOM & LEDAKAN
// ==========================================

function placeBomb() {
    if (gameState.isGameOver || gameState.isWon) return;

    let bx = player.x;
    let by = player.y;

    if (bombs.some(b => b.x === bx && b.y === by)) return;

    let bombId = Date.now() + Math.random().toString(36).substr(2, 5);
    let bombData = { id: bombId, x: bx, y: by, radius: player.radius, progress: 100 };

    bombs.push(bombData);

    const bombEl = document.createElement("div");
    bombEl.id = `bomb-${bombId}`;
    bombEl.className = "bomb";
    bombEl.innerHTML = `
        <svg class="bomb-svg" viewBox="0 0 40 40">
            <circle class="bomb-ring-bg" cx="20" cy="20" r="16"></circle>
            <circle class="bomb-ring-fg" id="ring-${bombId}" cx="20" cy="20" r="16" stroke-dasharray="100.5" stroke-dashoffset="0"></circle>
        </svg>
        <div class="bomb-body">💣</div>
        <div class="bomb-fuse"></div>
        <div class="bomb-spark">💥</div>
    `;
    setEntityGridPosition(bombEl, bx, by);
    gameGridEl.appendChild(bombEl);

    const startTime = Date.now();
    let ringInterval = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let remainingPercent = 1 - (elapsed / BOM_COUNTDOWN);
        if (remainingPercent < 0) remainingPercent = 0;
        
        const fgRing = document.getElementById(`ring-${bombId}`);
        if (fgRing) {
            let offset = 100.5 * (1 - remainingPercent);
            fgRing.style.strokeDashoffset = offset;
        }
    }, 50);

    setTimeout(() => {
        clearInterval(ringInterval);
        explodeBomb(bombId);
    }, BOM_COUNTDOWN);
}

function explodeBomb(id) {
    let index = bombs.findIndex(b => b.id === id);
    if (index === -1) return;
    
    let bomb = bombs[index];
    bombs.splice(index, 1); 

    const bombEl = document.getElementById(`bomb-${id}`);
    if (bombEl) bombEl.remove();

    triggerScreenFlash("white");

    let cellsToExplode = [{ x: bomb.x, y: bomb.y, center: true }];
    const directions = [{dx:0, dy:-1}, {dx:0, dy:1}, {dx:-1, dy:0}, {dx:1, dy:0}];

    directions.forEach(dir => {
        for (let i = 1; i <= bomb.radius; i++) {
            let tx = bomb.x + (dir.dx * i);
            let ty = bomb.y + (dir.dy * i);

            if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) break;

            let tileType = grid[ty][tx];

            if (tileType === TILE_SOLID) {
                break; 
            } else if (tileType === TILE_BREAKABLE) {
                cellsToExplode.push({ x: tx, y: ty, center: false, destroyBlock: true });
                break; 
            } else {
                cellsToExplode.push({ x: tx, y: ty, center: false });
            }
        }
    });

    cellsToExplode.forEach(cell => {
        renderExplosionDOM(cell.x, cell.y, cell.center);
        damageCheckAt(cell.x, cell.y);

        if (cell.destroyBlock) {
            destroyBreakableTile(cell.x, cell.y);
        }
    });
}

function renderExplosionDOM(x, y, isCenter) {
    const expEl = document.createElement("div");
    expEl.className = `explosion ${isCenter ? 'exp-center' : ''}`;
    setEntityGridPosition(expEl, x, y);
    gameGridEl.appendChild(expEl);

    setTimeout(() => expEl.remove(), EXPLOSION_DURATION);
}

function destroyBreakableTile(x, y) {
    grid[y][x] = TILE_EMPTY;
    const tileEl = document.getElementById(`tile-${y}-${x}`);
    if (tileEl) {
        tileEl.className = "tile tile-empty";
    }

    addScore(10, x, y);

    if (Math.random() < 0.25) {
        spawnPowerUpItem(x, y);
    }
}

// ==========================================
// 6. LOGIKA DATA & AI PERGERAKAN MUSUH
// ==========================================

function spawnEnemies(count) {
    let spawned = 0;
    let attempts = 0;

    while (spawned < count && attempts < 100) {
        attempts++;
        let rx = Math.floor(Math.random() * (GRID_COLS - 4)) + 3;
        let ry = Math.floor(Math.random() * (GRID_ROWS - 4)) + 3;

        if (grid[ry][rx] === TILE_EMPTY && !enemies.some(e => e.x === rx && e.y === ry)) {
            let enemyId = "enemy-" + spawned + "-" + Date.now().toString(36);
            let type = spawned % 4; 
            
            let newEnemy = { id: enemyId, x: rx, y: ry, type: type, isDead: false };
            enemies.push(newEnemy);
            renderEnemyDOM(newEnemy);
            spawned++;
        }
    }
}

function renderEnemyDOM(enemy) {
    let enemyEl = document.getElementById(enemy.id);
    if (!enemyEl) {
        enemyEl = document.createElement("div");
        enemyEl.id = enemy.id;
        enemyEl.className = `enemy enemy-type-${enemy.type}`;
        enemyEl.innerHTML = `<div class="enemy-body">👾</div>`;
        gameGridEl.appendChild(enemyEl);
    }
    setEntityGridPosition(enemyEl, enemy.x, enemy.y);
}

function updateEnemiesAI() {
    if (gameState.isGameOver || gameState.isWon) return;

    enemies.forEach(enemy => {
        if (enemy.isDead) return;

        const directions = [{dx:0, dy:-1}, {dx:0, dy:1}, {dx:-1, dy:0}, {dx:1, dy:0}];
        let validMoves = [];

        directions.forEach(d => {
            let nx = enemy.x + d.dx;
            let ny = enemy.y + d.dy;
            if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
                if (grid[ny][nx] === TILE_EMPTY && !bombs.some(b => b.x === nx && b.y === ny)) {
                    validMoves.push(d);
                }
            }
        });

        if (validMoves.length > 0) {
            let choice = validMoves[Math.floor(Math.random() * validMoves.length)];
            enemy.x += choice.dx;
            enemy.y += choice.dy;
            renderEnemyDOM(enemy);
        }
    });

    checkPlayerEnemyCollision();
}

// ==========================================
// 7. SISTEM DAMAGE & POWER-UP PICKUP
// ==========================================

function damageCheckAt(x, y) {
    if (player.x === x && player.y === y) {
        damagePlayer();
    }

    enemies.forEach(enemy => {
        if (!enemy.isDead && enemy.x === x && enemy.y === y) {
            killEnemy(enemy);
        }
    });
}

function killEnemy(enemy) {
    enemy.isDead = true;
    gameState.enemiesKilled++;
    addScore(100, enemy.x, enemy.y);

    const enemyEl = document.getElementById(enemy.id);
    if (enemyEl) {
        enemyEl.classList.add("dying");
        setTimeout(() => enemyEl.remove(), 300);
    }

    enemies = enemies.filter(e => e.id !== enemy.id);
    updateHUD();
    
    checkLevelOrWinCondition();
}

function damagePlayer() {
    if (player.isInvincible || gameState.isGameOver || gameState.isWon) return;

    gameState.lives--;
    triggerScreenFlash("red");
    updateHUD();

    if (gameState.lives <= 0) {
        triggerGameOver();
        const pEl = document.getElementById("player");
        if(pEl) pEl.innerHTML = `<div class="player-body">💀</div>`;
    } else {
        player.isInvincible = true;
        renderPlayer();
        
        setTimeout(() => {
            player.isInvincible = false;
            renderPlayer();
        }, INVINCIBLE_DURATION);
    }
}

function checkPlayerEnemyCollision() {
    if (player.isInvincible || gameState.isGameOver || gameState.isWon) return;
    
    let hit = enemies.some(e => !e.isDead && e.x === player.x && e.y === player.y);
    if (hit) {
        damagePlayer();
    }
}

function spawnPowerUpItem(x, y) {
    let type = Math.random() > 0.5 ? 'radius' : 'speed';
    let key = `${x},${y}`;
    items[key] = type;

    const itemEl = document.createElement("div");
    itemEl.id = `item-${x}-${y}`;
    itemEl.className = "item";
    itemEl.innerHTML = type === 'radius' ? '💣' : '⚡';
    setEntityGridPosition(itemEl, x, y);
    gameGridEl.appendChild(itemEl);
}

function checkItemPickup(x, y) {
    let key = `${x},${y}`;
    if (items[key]) {
        let type = items[key];
        delete items[key];

        const itemEl = document.getElementById(`item-${x}-${y}`);
        if (itemEl) {
            itemEl.classList.add("collected");
            setTimeout(() => itemEl.remove(), 350);
        }

        if (type === 'radius') {
            player.radius++;
            addScore(50, x, y);
        } else if (type === 'speed') {
            player.speed += 0.25; 
            addScore(50, x, y);
        }
        updateHUD();
    }
}

// ==========================================
// 8. HELPER UI & PARTICLES EFFECT
// ==========================================

function addScore(amount, gridX, gridY) {
    gameState.score += amount;
    updateHUD();

    const pop = document.createElement("div");
    pop.className = "score-pop";
    pop.innerText = `+${amount}`;
    
    let tileSize = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--ts'));
    pop.style.left = `calc((${gridX} * var(--ts)) + (${tileSize / 2}px))`;
    pop.style.top = `calc(${gridY} * var(--ts))`;
    
    gameGridEl.appendChild(pop);
    setTimeout(() => pop.remove(), 1100);
}

function updateHUD() {
    hud.name.innerText = `${gameState.playerName} [LV${gameState.currentLevel}]`;
    hud.score.innerText = gameState.score;
    hud.timer.innerText = formatTime(gameState.timeElapsed);
    hud.enemies.innerText = enemies.length;

    let heartStr = "";
    for (let i = 0; i < 3; i++) {
        heartStr += i < gameState.lives ? "❤️" : "🖤";
    }
    hud.lives.innerText = heartStr;

    stats.radius.innerText = player.radius;
    stats.speed.innerText = player.speed === 1 ? "Normal" : `Fast x${player.speed.toFixed(2)}`;
}

function formatTime(totalSeconds) {
    let mins = Math.floor(totalSeconds / 60);
    let secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function triggerScreenFlash(className) {
    const flash = document.createElement("div");
    flash.className = `screen-flash ${className}`;
    screens.game.appendChild(flash);
    setTimeout(() => flash.remove(), 450);
}

function triggerConfetti() {
    const container = document.getElementById("confetti-container");
    container.innerHTML = "";
    const colors = ["#00ffff", "#ff00cc", "#ffdd00", "#00ff88", "#ffffff"];
    
    for (let i = 0; i < 60; i++) {
        const c = document.createElement("div");
        c.classList.add("confetti-p");
        c.style.left = `${Math.random() * 100}%`;
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        let w = Math.random() * 8 + 5;
        c.style.width = `${w}px`;
        c.style.height = `${Math.random() * 12 + 6}px`;
        
        c.style.setProperty('--spin', `${Math.random() * 360 + 360}deg`);
        c.style.setProperty('--drift', `${Math.random() * 100 - 50}px`);
        c.style.animationDuration = `${Math.random() * 2.5 + 1.5}s`;
        c.style.animationDelay = `${Math.random() * 0.4}s`;
        
        container.appendChild(c);
    }
}

// ==========================================
// 9. EVENT LISTENERS & INPUT CONTROLLER
// ==========================================

function setupEventListeners() {
    document.getElementById("start-btn").addEventListener("click", startGame);
    document.getElementById("go-menu-btn").addEventListener("click", initWelcomeScreen);
    document.getElementById("win-menu-btn").addEventListener("click", initWelcomeScreen);

    window.addEventListener("keydown", (e) => {
        if (gameState.activeScreen === "welcome" && e.key === "Enter") {
            startGame();
            return;
        }

        if (gameState.activeScreen !== "game") return;

        switch (e.key) {
            case "ArrowUp":
            case "w":
            case "W":
                movePlayer(0, -1);
                e.preventDefault();
                break;
            case "ArrowDown":
            case "s":
            case "S":
                movePlayer(0, 1);
                e.preventDefault();
                break;
            case "ArrowLeft":
            case "a":
            case "A":
                movePlayer(-1, 0);
                e.preventDefault();
                break;
            case "ArrowRight":
            case "d":
            case "D":
                movePlayer(1, 0);
                e.preventDefault();
                break;
            case " ":
                placeBomb();
                e.preventDefault();
                break;
        }
    });

    const mobileTouchMapping = [
        { id: "btn-up",    action: () => movePlayer(0, -1) },
        { id: "btn-down",  action: () => movePlayer(0, 1) },
        { id: "btn-left",  action: () => movePlayer(-1, 0) },
        { id: "btn-right", action: () => movePlayer(1, 0) },
        { id: "btn-bomb",  action: () => placeBomb() }
    ];

    mobileTouchMapping.forEach(control => {
        const btn = document.getElementById(control.id);
        if (btn) {
            btn.addEventListener("touchstart", (e) => {
                e.preventDefault();
                btn.classList.add("pressed");
                control.action();
            });
            btn.addEventListener("touchend", () => {
                btn.classList.remove("pressed");
            });
            btn.addEventListener("mousedown", () => {
                btn.classList.add("pressed");
                control.action();
            });
            btn.addEventListener("mouseup", () => {
                btn.classList.remove("pressed");
            });
        }
    });
}