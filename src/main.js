import "./w.min.full.js";
import { map1, map2 } from "./maps/maps.js";
import spritesheet from "./assets/spritesheet.png";

const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2");

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

// Initial camera position camera
let z = 10;
let rot = 0;

// Player
let player = {
  x: 6,
  y: 5,
  z: 0.5,
  w: 2,
  h: 1.5,
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
let animationSpeed = 3;
let frameTimer = 0;
let direction = 1;

let keys = {};

function initMap(map) {
  currentMap = map;
  mapWidth = map[0].length;
  mapHeight = map.length;
}

// ----- Collision Helpers -----
function isSolid(tx, ty) {
  if (tx < 0 || tx >= mapWidth) return false;
  if (ty < 0 || ty >= mapHeight) return false;
  return currentMap[mapHeight - 1 - ty][tx] !== ".";
}

function moveAndCollide(x, y, w, h, dx, dy) {
  let newX = x + dx;
  let newY = y + dy;
  let collidedX = false;
  let collidedY = false; // X-axis collision check

  let leftTileX = Math.floor(newX / TILE_SIZE);
  let rightTileX = Math.floor((newX + w - EPS) / TILE_SIZE);
  let bottomTileY = Math.floor(y / TILE_SIZE);
  let topTileY = Math.floor((y + h - EPS) / TILE_SIZE);

  for (let ty = bottomTileY; ty <= topTileY; ty++) {
    if (dx > 0 && isSolid(rightTileX, ty)) {
      collidedX = true;
      newX = rightTileX * TILE_SIZE - w;
      break;
    } else if (dx < 0 && isSolid(leftTileX, ty)) {
      collidedX = true;
      newX = (leftTileX + 1) * TILE_SIZE;
      break;
    }
  } // Y-axis collision check

  let leftTileY = Math.floor(newX / TILE_SIZE);
  let rightTileY = Math.floor((newX + w - EPS) / TILE_SIZE);
  bottomTileY = Math.floor(newY / TILE_SIZE);
  topTileY = Math.floor((newY + h - EPS) / TILE_SIZE);

  for (let tx = leftTileY; tx <= rightTileY; tx++) {
    if (dy > 0 && isSolid(tx, topTileY)) {
      collidedY = true;
      newY = topTileY * TILE_SIZE - h;
      break;
    } else if (dy < 0 && isSolid(tx, bottomTileY)) {
      collidedY = true;
      newY = (bottomTileY + 1) * TILE_SIZE;
      break;
    }
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
  requestAnimationFrame(gameLoop);
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

  // Teleporting removed for better performance

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
  W.camera({
    rx: 10,
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    z: z + player.z ,
  });
  W.plane({
    n: "player",
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    w: 2,
    h: 2,
    z: player.z,
    t: sprites[frameWithDirection],
  });
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
    totalSprites = numSprites * 2; // Oikea ja peilattu versio

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
  };
}

function renderMap(map, zValue, mapName) {
  W.group({n: mapName});
  for (let row = 0; row < mapHeight; row++) {
    const mapRow = map[row];
    const worldY = mapHeight - 1 - row;
    for (let x = 0; x < mapWidth; x++) {
      const ch = mapRow[x];
      if (ch === "#") {
        W.cube({
          g: mapName,
          n: `ground_${mapName}_${row}_${x}`,
          x: x + 0.5,
          y: worldY + 0.5,
          z: zValue,
          w: 1,
          h: 1,
          d: 1,
          t: sprites[18],
        });
      }
      if (ch === "A") {
        W.cube({
          g: mapName,
          n: `jump_${mapName}_${row}_${x}`,
          x: x + 0.5,
          y: worldY + 0.5,
          z: zValue,
          w: 1,
          h: 1,
          d: 1,
          t: sprites[17],
        });
      }
      // Teleport tiles (^) removed for performance
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
  W.reset(canvas);
  W.ambient(0.7);
  W.clearColor("#00000000");
  
  // Only render map1 for better performance
  renderMap(map1, 0, "map1");
  requestAnimationFrame(gameLoop);
}

parseImagesFromSheet();
