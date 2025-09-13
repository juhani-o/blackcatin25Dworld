import "./w.js";
import zzfx from "./ZzFXMicro.min.js";
import { map1, map2 } from "./maps/maps.js";
import spritesheet from "./assets/spritesheet.png";
import desertSvg from "./assets/desert.svg";

const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });

// Constants
const TILE_SIZE = 1;
const EPS = 0.001;
const GRAVITY = -0.015;
const JUMP_FORCE = 0.35;
const MAX_FALL_SPEED = -0.25;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// Map state
let mapWidth = 0;
let mapHeight = 0;
let currentMap = null;


// Scene definition - contains objects to render
// Based on https://xem.github.io/microW/ with modifications

const scene = {

  // Background color (rgb)
  b: { c: [0,0,0,0] },
  
  // Camera position and rotation
  c: {p: [6, 5, -10], r: [0, 0, 0]},
  
  // Diffuse light position and color
  d: {p: [.5, -.3, -.7], c: [1, 1, 1]},
  
  // Ambient light color
  a: {c: [0.3, 0.3, 0.2]},
  
  // Objects to render (model, size, position, rotation, color)
  o: []
};

// Rendering optimization - separate static and dynamic objects
let staticObjects = []; // Cached static map objects
let lastRenderedMap = null; // Track when map changes
let coinObjects = []; // Cached coin objects (need rotation updates)

// Camera state (unused - keeping for compatibility)
// let cameraZ = 10;
// let cameraRotation = 0;

// Player object. Static start point, time ran out.
let player = {
  x: 6,
  y: 5,
  z: 0.5,
  w: .75, 
  h: .75,
  speed: 0.1,
  vy: 0,
  onGround: false,
};

// Animation
const IDLE_FRAME = 8;
const WALK_FRAMES_START = 9;
const WALK_FRAMES_END = 11;

// Simplified Jump frames
const JUMP_UP_FRAME = 1;
const JUMP_PEAK_FRAME = 2;
const JUMP_DOWN_FRAME = 3;

let currentFrame = IDLE_FRAME;
let animationSpeed = 2;
let frameTimer = 0;
let direction = 1;

let keys = {};

// Teleport state to avoid repeated toggles while staying on the tile
let wasOnTeleport = false;

// Handles time counter and coins
let userTime = document.getElementById("time");
let userCoins = document.getElementById("coins");

// Set the background image source
document.getElementById("backgroundImg").src = desertSvg;

// Game state
const GAME_DURATION = 5 * 60 * 1000; // 5 minutes
let gameStartTime = null;
let gameEndTime = null;
let gameState = "waiting"; // "waiting", "running", "ended"
let totalCoins = 0;
let collectedCoins = 0;

function initMap(map) {
  currentMap = map;
  mapWidth = map[0].length;
  mapHeight = map.length;
}

function countTotalCoins() {
  let count = 0;
  // Count coins in map1
  for (let row of map1) {
    for (let char of row) {
      if (char === "P") count++;
    }
  }
  // Count coins in map2
  for (let row of map2) {
    for (let char of row) {
      if (char === "P") count++;
    }
  }
  return count;
}

function updateStatusDisplay() {
  if (userTime && userCoins) {
    if (gameState === "running" && gameStartTime) {
      const elapsed = Date.now() - gameStartTime;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      userTime.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      userTime.textContent = "Time: 5:00";
    }
    userCoins.textContent = `Coins: ${collectedCoins}/${totalCoins}`;
  }
}

function checkGameEnd() {
  if (gameState !== "running") return;
  
  const elapsed = Date.now() - gameStartTime;
  const timeUp = elapsed >= GAME_DURATION;
  const allCoinsCollected = collectedCoins >= totalCoins;
  
  if (timeUp || allCoinsCollected) {
    gameState = "ended";
    gameEndTime = Date.now();
    showSummaryWindow();
  }
}

function showSummaryWindow() {
  const elapsed = gameEndTime - gameStartTime;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const completionPercentage = Math.round((collectedCoins / totalCoins) * 100);
  
  const summaryWindow = document.createElement('div');
  summaryWindow.id = 'summaryWindow';
  summaryWindow.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    height: 350px;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 25px;
    border-radius: 15px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    z-index: 1000;
    font-family: monospace;
    text-align: center;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  `;
  
  const isComplete = collectedCoins >= totalCoins;
  const reason = isComplete ? "Great! You did it!" : "Time's up!";
  const reasonColor = isComplete ? "#00ff00" : "#ff6b6b";
  
  summaryWindow.innerHTML = `
    <h2 style="margin-top: 0; color: #ffd700; font-size: 24px;">Game Summary</h2>
    <p style="font-size: 20px; color: ${reasonColor}; font-weight: bold; margin: 15px 0;">${reason}</p>
    <div style="margin: 20px 0; font-size: 16px;">
      <p><strong>Time Used:</strong> ${minutes}:${seconds.toString().padStart(2, '0')}</p>
      <p><strong>Coins Collected:</strong> ${collectedCoins}/${totalCoins}</p>
      <p><strong>Completion:</strong> ${completionPercentage}%</p>
      ${isComplete ? '<p style="color: #00ff00; font-weight: bold;">Perfect Score!</p>' : ''}
    </div>
    <div style="margin-top: 25px;">
      <button onclick="restartGame()" style="
        background: #4CAF50;
        color: white;
        border: none;
        padding: 12px 25px;
        font-size: 16px;
        border-radius: 8px;
        cursor: pointer;
        margin: 8px;
        font-family: monospace;
      ">Play Again</button>
    </div>
  `;
  
  document.body.appendChild(summaryWindow);
}

function restartGame() {
  // Stop current game loop to prevent multiple loops
  stopGameLoop();
  
  // Reset game state
  gameState = "waiting";
  gameStartTime = null;
  gameEndTime = null;
  collectedCoins = 0;
  
  // Remove summary window
  const summaryWindow = document.getElementById('summaryWindow');
  if (summaryWindow) summaryWindow.remove();
  
  // Reset rendering cache
  staticObjects = [];
  coinObjects = [];
  lastRenderedMap = null;
  scene.o = [];
  
  // Reset player position
  player.x = 6;
  player.y = 5;
  player.vy = 0;
  player.onGround = false;
  
  // Restart the game
  init();
}

// Make functions globally available
window.restartGame = restartGame;

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
  stopGameLoop();
});

// Collision detection
function isSolid(tileX, tileY) {
  if (tileX < 0 || tileX >= mapWidth) return false;
  if (tileY < 0 || tileY >= mapHeight) return false;
  const tile = currentMap[mapHeight - 1 - tileY][tileX];
  return tile !== "." && tile !== "P"; // P tiles are not solid (collectible coins)
}

function collectCoin() {
  // Check multiple tiles around the player for coins
  const playerLeft = Math.floor(player.x);
  const playerRight = Math.floor(player.x + player.w * 2);
  const playerTop = Math.floor(player.y + player.h * 2);
  const playerBottom = Math.floor(player.y);
  
  // Check all tiles the player occupies
  for (let tx = playerLeft; tx <= playerRight; tx++) {
    for (let ty = playerBottom; ty <= playerTop; ty++) {
      const mapY = mapHeight - 1 - ty;
      
      if (
        tx >= 0 &&
        tx < mapWidth &&
        mapY >= 0 &&
        mapY < mapHeight &&
        currentMap[mapY][tx] === "P"
      ) {
        // Remove the coin by replacing "P" with "."
        currentMap[mapY] = currentMap[mapY].substring(0, tx) + "." + currentMap[mapY].substring(tx + 1);
        
        // Remove coin from cached coin objects - check both active and inactive maps
        const coinIndex = coinObjects.findIndex(coin => 
          coin.originalX === tx && coin.originalY === mapHeight - 1 - ty
        );
        if (coinIndex !== -1) {
          coinObjects.splice(coinIndex, 1);
        }
        
        // Force scene rebuild to reflect coin removal
        lastRenderedMap = null;
        
        // Play coin sound
        zzfx(2,.05,331,.02,.06,.26,0,2.5,0,0,482,.09,.02,0,0,0,.04,.55,.03,0,0);
        
        // Update collected coins count
        collectedCoins++;
        updateStatusDisplay();
        
        return true; // Coin collected
      }
    }
  }
  return false; // No coin collected
}

function moveAndCollide(x, y, w, h, dx, dy) {
  let newX = x + dx;
  let newY = y + dy;
  let collidedX = false;
  let collidedY = false;
  
  // X collision
  const leftX = Math.floor((newX - w) / TILE_SIZE);
  const rightX = Math.floor((newX + w * 2) / TILE_SIZE);
  const startY = Math.floor(y / TILE_SIZE);
  const endY = Math.floor((y + h - EPS) / TILE_SIZE);
  
  for (let tileY = startY; tileY <= endY; tileY++) {
    if (dx > 0 && isSolid(rightX, tileY)) {
      collidedX = true;
      newX = (rightX - w * 2) * TILE_SIZE;
      break;
    }
    if (dx < 0 && isSolid(leftX, tileY)) {
      collidedX = true;
      newX = (leftX + w * 2) * TILE_SIZE;
      break;
    }
  }
  
  // Y collision
  const leftY = Math.floor(newX / TILE_SIZE);
  const rightY = Math.floor((newX + w - EPS) / TILE_SIZE);
  
  for (let tileX = leftY; tileX <= rightY; tileX++) {
    if (dy > 0 && isSolid(tileX, Math.floor((newY + h - EPS) / TILE_SIZE))) {
      collidedY = true;
      newY = Math.floor((newY + h - EPS) / TILE_SIZE) * TILE_SIZE - h;
      break;
    }
    if (dy < 0 && isSolid(tileX, Math.floor(newY / TILE_SIZE))) {
      collidedY = true;
      newY = (Math.floor(newY / TILE_SIZE) + 1) * TILE_SIZE;
      break;
    }
  }

  return { x: newX, y: newY, collidedX, collidedY };
}

// Input handling
const handleKeyDown = (e) => {
  const key = e.code === "Space" ? "Space" : e.key.toLowerCase();
  keys[key] = true;
};

const handleKeyUp = (e) => {
  const key = e.code === "Space" ? "Space" : e.key.toLowerCase();
  keys[key] = false;
};

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

// Game loop state
let lastTime = 0;
let animationId = null;

function gameLoop() {
  if (gameState === "running") {
  update();
  draw();
    checkGameEnd();
    updateStatusDisplay();
  }
  
  animationId = requestAnimationFrame(gameLoop);
  W.render(scene, gl, 1.5); // Fixed aspect ratio
}

function stopGameLoop() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function checkTileBelowPlayer(tileType) {
  const playerBottomY = Math.floor(player.y - 0.1);
  const playerCenterX = Math.floor(player.x + player.w / 2);
  const mapY = mapHeight - 1 - playerBottomY;
  
  if (
    playerCenterX >= 0 &&
    playerCenterX < mapWidth &&
    mapY >= 0 &&
    mapY < mapHeight
  ) {
    return currentMap[mapY][playerCenterX] === tileType;
  }
  return false;
}

function update() {
  let dx = 0;
  let isMoving = false;

  // Handle horizontal movement
  if (keys["a"] && !keys["d"]) {
    dx = -player.speed;
    isMoving = true;
    direction = -1;
  } else if (keys["d"] && !keys["a"]) {
    dx = player.speed;
    isMoving = true;
    direction = 1;
  }
  if (checkTileBelowPlayer("A")) {
    // Let's add some extra for jump force when entering jump platform
    if (player.onGround) {
      player.vy = JUMP_FORCE + 0.15;
      player.onGround = false;
    }
  }

  // Teleporting functionality
  const isUserOnTeleport = checkTileBelowPlayer("^");
  if (isUserOnTeleport && !wasOnTeleport && player.onGround) {
      if (currentMap === map1) {
        currentMap = map2;
      } else if (currentMap === map2) {
        currentMap = map1;
      }
    // Teleport sound
    zzfx(1,.05,882,0,.09,.01,2,1.2,-27,-30,0,0,0,.1,0,0,0,.84,.47,0,0);
  }
  wasOnTeleport = isUserOnTeleport;

  // Collect coins
  collectCoin();

  if ((keys[" "] || keys["Space"]) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    // Jump sound
    zzfx(.8,.05,320,.01,.03,.06,1,.2,0,145,0,0,0,0,0,0,0,.98,.01,0,-1117);
  }
  player.vy += GRAVITY;
  if (player.vy < MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

  const res = moveAndCollide(
    player.x,
    player.y,
    player.w,
    player.h,
    dx,
    player.vy,
  );

  player.x = res.x;
  player.y = res.y;

  if (res.collidedY && player.vy <= 0) {
    if (!player.onGround) {
      // Land sound
      zzfx(2,.05,249,.03,0,.04,4,2.8,0,-10,0,0,0,1.8,0,.2,.14,.97,.01,0,0);
    }
    player.onGround = true;
    player.vy = 0;
  } else if (res.collidedY && player.vy > 0) {
    player.vy = 0;
  } else {
    player.onGround = false;
  } // Animation logic

  if (!player.onGround) {
    if (player.vy > 0.1) {
      // Jumping up
      currentFrame = JUMP_UP_FRAME;
    } else if (player.vy <= 0.1 && player.vy >= -0.1) {
      // Jump peak
      currentFrame = JUMP_PEAK_FRAME;
    } else {
      // Falling down
      currentFrame = JUMP_DOWN_FRAME;
    }
  } else {
    // On the ground
    if (isMoving) {
      frameTimer++;
      if (frameTimer >= animationSpeed) {
        currentFrame++;
        if (currentFrame > WALK_FRAMES_END) {
          currentFrame = WALK_FRAMES_START;
        }
        frameTimer = 0;
      }
    } else {
      currentFrame = IDLE_FRAME;
    }
  }
}

function draw() {
  const frameWithDirection = (direction === -1 ? 20 : 0) + currentFrame;

  // Only rebuild static objects if map changed
  if (lastRenderedMap !== currentMap) {
    staticObjects = [];
    coinObjects = [];
    
    // Build static objects for both maps
    if (currentMap === map1) {
      staticObjects.push(...buildStaticObjects(map1, 0, false)); // Active map
      staticObjects.push(...buildStaticObjects(map2, -2, true)); // Inactive map
      coinObjects.push(...buildCoinObjects(map1, 0, false)); // Active coins
      coinObjects.push(...buildCoinObjects(map2, -2, true)); // Inactive coins
    } else {
      staticObjects.push(...buildStaticObjects(map2, -2, false)); // Active map
      staticObjects.push(...buildStaticObjects(map1, 0, true)); // Inactive map
      coinObjects.push(...buildCoinObjects(map2, -2, false)); // Active coins
      coinObjects.push(...buildCoinObjects(map1, 0, true)); // Inactive coins
    }
    
    lastRenderedMap = currentMap;
  }
  
  // Update only what changes each frame
  updateCoinRotations(); // Update coin rotations
  
  // Update player
  player.cat.p[0] = player.x;
  player.cat.p[1] = player.y;
  player.cat.p[2] = 0;
  player.cat.t = sprites[frameWithDirection];
  
  // Update camera
  scene.c.p[0] = -player.x;
  scene.c.p[1] = -player.y;
  
  // Build final scene (static objects + animated objects + player)
  scene.o = [...staticObjects, ...coinObjects, player.cat];
}

let sprites = []; // Global sprites array

function parseImagesFromSheet() {
  const img = new Image();
  img.src = spritesheet;

  img.onload = () => {
    const spriteWidth = 32;
    const spriteHeight = 32;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = spriteWidth;
    canvas.height = spriteHeight;

    let totalSprites = 0;
    let loadedSprites = 0;

    // Alustetaan taulukko oikean kokoisena
    const numSprites = img.width / spriteWidth;
    totalSprites = numSprites * 3; // Original, mirrored, and 50% transparent versions

    const allSpritesLoaded = () => {
      loadedSprites++;
      if (loadedSprites === totalSprites) {
        console.log("All sprites loaded");
        showStartMenu();
      }
    };

    // Sprites from original direction
    for (let i = 0; i < numSprites; i++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        i * spriteWidth,
        0,
        spriteWidth,
        spriteHeight,
        0,
        0,
        spriteWidth,
        spriteHeight,
      );

      const splitImage = new Image();
      splitImage.src = canvas.toDataURL();
      splitImage.id = `sprite_${i}`;
      splitImage.onload = allSpritesLoaded;
      sprites.push(splitImage);
    }

    // Reversed sprites
    for (let i = 0; i < numSprites; i++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(
        img,
        i * spriteWidth,
        0,
        spriteWidth,
        spriteHeight,
        -spriteWidth / 2,
        -spriteHeight / 2,
        spriteWidth,
        spriteHeight,
      );
      ctx.restore();

      const splitImage = new Image();
      splitImage.src = canvas.toDataURL();
      splitImage.id = `sprite_${i + numSprites}`;
      splitImage.onload = allSpritesLoaded;
      sprites.push(splitImage);
    }

    // 50% transparent sprites
    for (let i = 0; i < numSprites; i++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.5;
      ctx.drawImage(
        img,
        i * spriteWidth,
        0,
        spriteWidth,
        spriteHeight,
        0,
        0,
        spriteWidth,
        spriteHeight,
      );
      ctx.globalAlpha = 1.0;

      const splitImage = new Image();
      splitImage.src = canvas.toDataURL();
      splitImage.id = `sprite_${i + numSprites * 2}`;
      splitImage.onload = allSpritesLoaded;
      sprites.push(splitImage);
    }
  };
}

// Build static objects for a map (cubes, platforms, etc.)
function buildStaticObjects(map, zValue, useTransparent = false) {
  const objects = [];
  const numSprites = sprites.length / 3;
  const spriteOffset = useTransparent ? numSprites * 2 : 0;
  const cubeSize = [0.5, 0.5, 0.5];
  
  for (let row = 0; row < mapHeight; row++) {
    const mapRow = map[row];
    const worldY = mapHeight - 1 - row;
    
    for (let x = 0; x < mapWidth; x++) {
      const char = mapRow[x];
      const position = [x, worldY, zValue];
      
      switch (char) {
        case "#":
          objects.push({ m: "cube", s: cubeSize, p: position, t: sprites[18 + spriteOffset] });
          break;
        case "^":
          objects.push({ m: "cube", s: cubeSize, p: position, t: sprites[19 + spriteOffset] });
          break;
        case "A":
          objects.push({ m: "cube", s: cubeSize, p: position, t: sprites[17 + spriteOffset] });
          break;
      }
    }
  }
  
  return objects;
}

// Build coin objects for a map
function buildCoinObjects(map, zValue, useTransparent = false) {
  const objects = [];
  const numSprites = sprites.length / 3;
  const spriteOffset = useTransparent ? numSprites * 2 : 0;
  const planeSize = [0.5, 0.5, 0];
  
  for (let row = 0; row < mapHeight; row++) {
    const mapRow = map[row];
    const worldY = mapHeight - 1 - row;
    
    for (let x = 0; x < mapWidth; x++) {
      const char = mapRow[x];
      if (char === "P") {
        objects.push({
          m: "plane",
          s: planeSize,
          p: [x, worldY, zValue],
          r: [0, 0, 0], // Will be updated each frame
          t: sprites[16 + spriteOffset],
          originalX: x,
          originalY: worldY,
          originalZ: zValue
        });
      }
    }
  }
  
  return objects;
}

// Update coin rotations (only thing that changes for coins)
function updateCoinRotations() {
  const rotationY = (Date.now() * 0.1) % 360;
  for (const coin of coinObjects) {
    coin.r[1] = rotationY;
  }
}

// Original renderMap function (for compatibility with init)
function renderMap(map, zValue, mapName, useTransparent = false) {
  const numSprites = sprites.length / 3;
  const spriteOffset = useTransparent ? numSprites * 2 : 0;
  const cubeSize = [0.5, 0.5, 0.5];
  const planeSize = [0.5, 0.5, 0];
  
  for (let row = 0; row < mapHeight; row++) {
    const mapRow = map[row];
    const worldY = mapHeight - 1 - row;
    
    for (let x = 0; x < mapWidth; x++) {
      const char = mapRow[x];
      const position = [x, worldY, zValue];
      
      switch (char) {
        case "#":
          scene.o.push({ m: "cube", s: cubeSize, p: position, t: sprites[18 + spriteOffset] });
          break;
        case "^":
          scene.o.push({ m: "cube", s: cubeSize, p: position, t: sprites[19 + spriteOffset] });
          break;
        case "A":
          scene.o.push({ m: "cube", s: cubeSize, p: position, t: sprites[17 + spriteOffset] });
          break;
        case "P":
          const rotationY = (Date.now() * 0.1) % 360;
          scene.o.push({ 
            m: "plane", 
            s: planeSize, 
            p: position, 
            r: [0, rotationY, 0], 
            t: sprites[16 + spriteOffset] 
          });
          break;
      }
    }
  }
}

function showStartMenu() {
  const overlay = document.createElement("div");
  overlay.id = "startOverlay";
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.8)",
    color: "#ffffff",
    fontFamily: "monospace, sans-serif",
    fontSize: "20px",
    textAlign: "center",
    cursor: "pointer",
    zIndex: "9999",
  });
  overlay.textContent = "Black Cat in 2.5D world, click to start";

  const parent = canvas.parentElement || document.body;
  if (parent === document.body) {
    document.body.style.position = document.body.style.position || "relative";
  } else if (!parent.style.position) {
    parent.style.position = "relative";
  }
  parent.appendChild(overlay);

  overlay.addEventListener(
    "click",
    () => {
      overlay.remove();
      init();
    },
    { once: true },
  );
}

// Some init stuff, only two maps. Focus was more on smooth graphics than big maps.
function init() {
  // Stop any existing game loop to prevent multiple loops
  stopGameLoop();
  
  initMap(map1);
  
  // Initialize player object
  scene.o.push({
    m: "plane",
    n: "cat",
    s: [player.w, player.h],
    p: [0, 0, -4],
    r: [0, 0, 0],
    t: sprites[8],
  });
  player.cat = scene.o.find((item, index) => item.n === 'cat');
  
  // Reset rendering cache to force rebuild
  staticObjects = [];
  coinObjects = [];
  lastRenderedMap = null;
  
  // Initialize game state and start timer
  if (gameState === "waiting") {
    totalCoins = countTotalCoins();
    collectedCoins = 0;
    gameState = "running";
    gameStartTime = Date.now();
    updateStatusDisplay();
  }
  
  // Start new game loop
  requestAnimationFrame(gameLoop);
}

// Not probably best function name, but it's the first one that gets called :)
parseImagesFromSheet();

