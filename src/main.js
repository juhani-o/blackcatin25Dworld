import "./w.min.full.js";
import { map1, map2 } from "./maps/maps.js";
import spritesheet from './assets/spritesheet.png';

const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2");

// ----- Basic Settings -----
const TILE_SIZE = 1;
const EPS = 0.001;
const GRAVITY = -0.015;
const JUMP_FORCE = 0.5;
const MAX_FALL_SPEED = -0.25;
const NORMAL_FPS = 60;

const MAP_H = map1.length;
const MAP_W = map1[0].length;

// Camera
let z = 10;
let rot = 0;

// Player
let player = {
  x: 6,
  y: 5,
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
const JUMP_FRAMES_START = 0;
const JUMP_FRAMES_END = 4;

let currentFrame = IDLE_FRAME;
let animationSpeed = 3;
let frameTimer = 0;
let direction = 1;

let keys = {};

// ----- Collision Helpers -----
function isSolid(tx, ty) {
  if (tx < 0 || tx >= MAP_W) return false;
  if (ty < 0 || ty >= MAP_H) return false;
  return map1[MAP_H - 1 - ty][tx] === "#";
}

function moveAndCollide(x, y, w, h, dx, dy) {
  let newX = x + dx;
  let newY = y + dy;
  let collidedX = false;
  let collidedY = false;

  // X-axis collision check
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
  }

  // Y-axis collision check
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

function gameLoop(ts) {
  update();
  draw();
  lastTime = ts;
  requestAnimationFrame(gameLoop);
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
    player.vy
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
  }

  // Animation logic
  if (!player.onGround) {
    frameTimer++;
    if (frameTimer >= animationSpeed) {
      if (player.vy > 0) {
        if (currentFrame < JUMP_FRAMES_START || currentFrame >= JUMP_FRAMES_END) {
          currentFrame = JUMP_FRAMES_START;
        } else {
          currentFrame++;
        }
      } else {
        currentFrame = JUMP_FRAMES_END;
      }
      frameTimer = 0;
    }
  } else {
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
  console.log("Sprite ", frameWithDirection)
  W.camera({
    ry: rot,
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    z: z,
  });

  W.plane({
    n: "player",
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    w: 2,
    h: 2,
    z: 0.5,
    t: sprites[frameWithDirection], //(direction === -1 ? 20 : 0)],
  });
}

const sprites = [];

function parseImagesFromSheet() {
  const img = new Image();
  img.src = spritesheet;
  img.onload = () => {
    const kuvanLeveys = 32;
    const kuvanKorkeus = 32;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = kuvanLeveys;
    canvas.height = kuvanKorkeus;

    for (let j = 0; j * kuvanLeveys < img.width; j++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        j * kuvanLeveys,
        0 * kuvanKorkeus,
        kuvanLeveys,
        kuvanKorkeus,
        0,
        0,
        kuvanLeveys,
        kuvanKorkeus
      );

      const splittedImage = new Image();
      splittedImage.src = canvas.toDataURL();
      splittedImage.id = "sprite_" + j;

      sprites.push(splittedImage);
    }
      for (let j = 0; j * kuvanLeveys < img.width; j++) {
      
      // Pystysuunnassa flipattu sprite (ylösalaisin)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(
        img,
        j * kuvanLeveys,
        0 * kuvanKorkeus,
        kuvanLeveys,
        kuvanKorkeus,
        -kuvanLeveys / 2,
        -kuvanKorkeus / 2,
        kuvanLeveys,
        kuvanKorkeus
      );
      ctx.restore();
      const splittedImage = new Image();
      splittedImage.src = canvas.toDataURL();
      splittedImage.id = "sprite_" + j + 20;

      sprites.push(splittedImage);
    }
    console.log("Spritesheet processed, image count:", sprites.length);
    init();
  };
}

function init() {
  W.reset(canvas);
  W.ambient(0.7);
  W.clearColor("8Af");
  W.camera({ ry: rot });
  W.light({ x: 0.5, y: -0.3, z: -0.5 });

  for (let row = 0; row < MAP_H; row++) {
    const mapRow = map1[row];
    const worldY = MAP_H - 1 - row;
    for (let x = 0; x < MAP_W; x++) {
      const ch = mapRow[x];
      if (ch === "A") {
        W.cube({
          n: `arrow_${row}_${x}`,
          x: x + 0.5,
          y: worldY + 0.5,
          z: 0,
          w: 1,
          h: 1,
          d: 1,
          ns: 1,
          t: sprites[17],
        });
      }
      if (ch === "#") {
        W.cube({
          n: `cube_${row}_${x}`,
          x: x + 0.5,
          y: worldY + 0.5,
          z: 0,
          w: 1,
          h: 1,
          d: 1,
          t: sprites[18],
        });
      }
      if (ch === "^") {
        W.cube({
          n: `tele_${row}_${x}`,
          x: x + 0.5,
          y: worldY + 0.5,
          z: 0,
          w: 1,
          h: 1,
          d: 1,
          t: sprites[19],
        });
      }
    }
  }
  requestAnimationFrame(gameLoop);
}

parseImagesFromSheet();
