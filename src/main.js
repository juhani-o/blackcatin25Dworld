import "./w.min.full.js";
import { map1 } from "./maps/maps.js";
import noppa from "./assets/noppa2.png";

const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2");

// ----- Perusasetukset -----
const TILE_SIZE = 1;
const EPS = 0.001;
const GRAVITY = -0.015;
const JUMP_FORCE = 0.25;
const MAX_FALL_SPEED = -0.25;
const NORMAL_FPS = 60;

const MAP_H = map1.length;
const MAP_W = map1[0].length;

// Kamera
let z = 10;
let rot = 0;

// Pelaaja
let player = {
  x: 8,
  y: 5,
  w: 1,
  h: 1,
  speed: 0.06,
  vy: 0,
  onGround: false,
};

let keys = {};
let image = new Image();
image.src = noppa;

// ----- Apurit: törmäys -----
function isSolid(tx, ty) {
  if (tx < 0 || tx >= MAP_W) return false;
  if (ty < 0 || ty >= MAP_H) return false;
  return map1[MAP_H - 1 - ty][tx] === "#";
}

function moveAndCollide(x, y, w, h, dx, dy) {
  let newX = x + dx;
  let newY = y + dy;
  let collidedX = false;
  let collidedY = false; // X-akselin törmäystarkistus

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
  } // Y-akselin törmäystarkistus

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

// ----- Syöte -----
document.addEventListener("keydown", (e) => {
  const k = e.code === "Space" ? "Space" : e.key.toLowerCase();
  keys[k] = true;
});

document.addEventListener("keyup", (e) => {
  const k = e.code === "Space" ? "Space" : e.key.toLowerCase();
  keys[k] = false;
});

// ----- Peli-silmukka -----
let lastTime = 0;

function gameLoop(ts) {
  const deltaTime = (ts - lastTime) / (1000 / NORMAL_FPS);
  update(deltaTime);
  draw();
  lastTime = ts;
  requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
  let dx = 0;
  if (keys["a"] && !keys["d"]) dx = -player.speed;
  if (keys["d"] && !keys["a"]) dx = player.speed;

  if ((keys[" "] || keys["Space"]) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  if (player.vy < MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED; // Liikenopeuksien skaalaus deltaTime:lla

  const res = moveAndCollide(
    player.x,
    player.y,
    player.w,
    player.h,
    dx * deltaTime,
    player.vy * deltaTime,
  );

  player.x = res.x;
  player.y = res.y; // Päivitetään onGround vain, jos törmäys tapahtui alaspäin liikuttaessa

  if (res.collidedY && player.vy <= 0) {
    player.onGround = true;
    player.vy = 0;
  } else if (res.collidedY && player.vy > 0) {
    player.vy = 0;
  } else {
    player.onGround = false;
  }
}

function draw() {
  W.camera({
    ry: rot,
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    z: z,
  });

  W.sphere({
    n: "player",
    size: 1,
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    z: 0,
  });
}

// ----- Maailma -----
W.reset(canvas);
W.ambient(0.7);
W.clearColor("8Af");
W.camera({ ry: rot });
W.light({ x: 0.5, y: -0.3, z: -0.5 });

image.onload = function () {
  for (let row = 0; row < MAP_H; row++) {
    const mapRow = map1[row];
    const worldY = MAP_H - 1 - row;
    for (let x = 0; x < MAP_W; x++) {
      const ch = mapRow[x];
      if (ch === "#" || ch === "=") {
        W.cube({
          n: `kuutio_${row}_${x}`,
          x: x + 0.5,
          y: worldY + 0.5,
          z: 0,
          w: 1,
          h: 1,
          d: 1,
          t: image,
        });
      } else if (ch === "!") {
        W.sphere({
          n: `ball_${row}_${x}`,
          size: 1,
          x: x + 0.5,
          y: worldY + 0.5,
          z: 0,
          t: image,
        });
      }
    }
  }
};

requestAnimationFrame(gameLoop);
