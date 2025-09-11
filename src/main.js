import "./w.js";
import { map1, map2 } from "./maps/maps.js";
import spritesheet from "./assets/spritesheet.png";

const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true });

// ----- Basic Settings -----
const TILE_SIZE = 1;
const EPS = 0.001;
const GRAVITY = -0.015;
const JUMP_FORCE = 0.35;
const MAX_FALL_SPEED = -0.25;
const NORMAL_FPS = 60;

let mapWidth,
  mapHeight = 0;
let currentMap = null;

const scene = {

  // Background color (rgb)
  b: { c: [0,0,.2] },
  
  // Camera position and rotation
  c: {p: [6, 5, -10], r: [0, 0, 0]},
  
  // Diffuse light position and color
  d: {p: [.5, -.3, -.7], c: [1, 1, 1]},
  
  // Ambient light color
  a: {c: [0.3, 0.3, 0.2]},
  
  // Objects to render (model, size, position, rotation, color)
  o: [
    
  ]
};

// Initial camera position camera
let z = 10;
let rot = 0;

// Player
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

function initMap(map) {
  currentMap = map;
  mapWidth = map[0].length;
  mapHeight = map.length;
}

// ----- Collision Helpers -----
function isSolid(tx, ty) {
  if (tx < 0 || tx >= mapWidth) return false;
  if (ty < 0 || ty >= mapHeight) return false;
  const tile = currentMap[mapHeight - 1 - ty][tx];
  return tile !== "." && tile !== "P"; // P tiles are not solid (collectible coins)
}

function collectCoin() {
  const playerBottomY = Math.floor(player.y - 0.1);
  const playerCenterX = player.x + player.w / 2;
  const playerBottomTileX = Math.floor(playerCenterX);
  const mapY = mapHeight - 1 - playerBottomY;

  if (
    playerBottomTileX >= 0 &&
    playerBottomTileX < mapWidth &&
    mapY >= 0 &&
    mapY < mapHeight &&
    currentMap[mapY][playerBottomTileX] === "P"
  ) {
    // Remove the coin by replacing "P" with "."
    currentMap[mapY] = currentMap[mapY].substring(0, playerBottomTileX) + "." + currentMap[mapY].substring(playerBottomTileX + 1);
    console.log("Coin collected");
    return true; // Coin collected
  }
  return false; // No coin collected
}

function moveAndCollide(x, y, w, h, dx, dy) {
  let newX = x + dx, newY = y + dy, collidedX = false, collidedY = false;
  
  // X collision
  let leftX = Math.floor((newX - (w)) / TILE_SIZE)
  let rightX = Math.floor((newX + (w * 2)) / TILE_SIZE);
  for (let ty = Math.floor(y / TILE_SIZE); ty <= Math.floor((y + h - EPS) / TILE_SIZE); ty++) {
    if (dx > 0 && isSolid(rightX, ty)) { collidedX = true; newX = (rightX - (w * 2)) * TILE_SIZE; break; }
    if (dx < 0 && isSolid(leftX, ty)) { collidedX = true; newX = (leftX + (w * 2)) * TILE_SIZE; break; }
  }
  
  // Y collision
  let leftY = Math.floor(newX / TILE_SIZE), rightY = Math.floor((newX + w - EPS) / TILE_SIZE);
  for (let tx = leftY; tx <= rightY; tx++) {
    if (dy > 0 && isSolid(tx, Math.floor((newY + h - EPS) / TILE_SIZE))) { collidedY = true; newY = Math.floor((newY + h - EPS) / TILE_SIZE) * TILE_SIZE - h; break; }
    if (dy < 0 && isSolid(tx, Math.floor(newY / TILE_SIZE))) { collidedY = true; newY = (Math.floor(newY / TILE_SIZE) + 1) * TILE_SIZE; break; }
  }
  
  return { x: newX, y: newY, collidedX, collidedY };
}

// ----- Input -----
document.addEventListener("keydown", (e) => {
  const k = e.code === "Space" ? "Space" : e.key.toLowerCase();
  keys[k] = true;
});

document.addEventListener("keyup", (e) => {
  const k = e.code === "Space" ? "Space" : e.key.toLowerCase();
  keys[k] = false;
});

// ----- Game Loop -----
let lastTime = 0;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS; // 16.67ms per frame

function gameLoop() {
  update();
  draw();
  let ratio = 600/400;
 
  requestAnimationFrame(gameLoop);
  W.render(scene, gl, ratio)
}

function checkTileBelowPlayer(tileType) {
  const playerBottomY = Math.floor(player.y - 0.1);
  const playerCenterX = player.x + player.w / 2;
  const playerBottomTileX = Math.floor(playerCenterX);
  const mapY = mapHeight - 1 - playerBottomY;
  if (
    playerBottomTileX >= 0 &&
    playerBottomTileX < mapWidth &&
    mapY >= 0 &&
    mapY < mapHeight
  ) {
    return currentMap[mapY][playerBottomTileX] === tileType;
  }
  return false;
}

function update() {
  let dx = 0;
  let isMoving = false;

  if (keys["a"] && !keys["d"]) {
    dx = -player.speed;
    isMoving = true;
    direction = -1;
  }
  if (keys["d"] && !keys["a"]) {
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
  }
  wasOnTeleport = isUserOnTeleport;

  // Collect coins
  collectCoin();

  if ((keys[" "] || keys["Space"]) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
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
  let frameWithDirection = (direction === -1 ? 20 : 0) + currentFrame;

  // Clear scene and rebuild
  scene.o = [];
  
  // Render both maps at their original z locations - active with normal sprites, inactive with transparent
  if (currentMap === map1) {
    renderMap(map1, 0, "map1", false); // Active map - normal sprites
    renderMap(map2, -2, "map2", true); // Inactive map - transparent sprites at original z
  } else {
    renderMap(map2, -2, "map2", false); // Active map - normal sprites at original z
    renderMap(map1, 0, "map1", true); // Inactive map - transparent sprites at original z
  }
  
  // Add player
  scene.c.p[0] = 0 - player.x
  scene.c.p[1] = 0 - player.y
  player.cat.p[0] = player.x
  player.cat.p[1] = player.y
  player.cat.p[2] = 0
  player.cat.t = sprites[frameWithDirection]
  scene.o.push(player.cat);
}

let sprites = []; // Varmista, että tämä taulukko on olemassa globaalisti

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

function renderMap(map, zValue, mapName, useTransparent = false) {
  const numSprites = sprites.length / 3; // Get original sprite count
  const spriteOffset = useTransparent ? numSprites * 2 : 0; // Use transparent sprites if requested
  
  for (let row = 0; row < mapHeight; row++) {
    const mapRow = map[row];
    const worldY = mapHeight - 1 - row;
    for (let x = 0; x < mapWidth; x++) {
      const ch = mapRow[x];
      if (ch === "#") {
        scene.o.push({ m: "cube", s: [0.5, 0.5, 0.5], p: [x, worldY, zValue], t: sprites[18 + spriteOffset]})
      }
      if (ch === "^") {
        scene.o.push({ m: "cube", s: [0.5, 0.5, 0.5], p: [x, worldY, zValue], t: sprites[19 + spriteOffset]})
      }
      if (ch === "A") {
        scene.o.push({ m: "cube", s: [0.5, 0.5, 0.5], p: [x, worldY, zValue], t: sprites[17 + spriteOffset]})
      }
      if (ch === "P") {
        const rotationY = (Date.now() * 0.1) % 360; // Animate rotation over time
        scene.o.push({ m: "plane", s: [0.5, 0.5,0], p: [x, worldY, zValue ], r: [0, rotationY, 0], t: sprites[16 + spriteOffset]})
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
    background: "rgba(0,0,0,0.6)",
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

function init() {
  initMap(map1);

  renderMap(map1, 0, "map1")
  renderMap(map2, -1, "map2")
  scene.o.push({
    m: "plane",
    n: "cat",
    s: [player.w, player.h],
    p: [0,0, -4],
    r: [0, 0, 0],
    t: sprites[8],
  });
  player.cat = scene.o.find((item, index) => item.n === 'cat')
  requestAnimationFrame(gameLoop);
}

parseImagesFromSheet();
