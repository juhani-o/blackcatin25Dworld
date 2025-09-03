import "./w.min.full.js";
import { map1 } from "./maps/maps.js";
import noppa from "./assets/noppa2.png";
const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2");

let z = 10;
let rot = 0;
let playerX = 8;
let playerY = 15;
let playerXvelocity = 0.0;
let playerYvelocity = 0;

let image = new Image();
image.src = noppa;

function checkCollision() {
  let checkX = 0;
  let checkY = 0;

  // Check which direction to check collision
  if (playerXvelocity > 0) {
    checkX = 1;
  } else if (playerXvelocity < 0) {
    checkX = -1;
  }

  if (playerYvelocity > 0) {
    checkY = 1;
  } else if (playerYvelocity < 0) {
    checkY = -1;
  }

  // Let's test collision
  let mapSize = map1.length;
  let locationY = Math.round(mapSize - playerY);
  let locationX = Math.round(playerX);
  let test = Array(3);
  test[0] = map1[locationY + 1].slice(locationX - 1, locationX + 2);
  test[1] = map1[locationY].slice(locationX - 1, locationX + 2);
  test[2] = map1[locationY - 1].slice(locationX - 1, locationX + 2);
  console.log("test ", test);
}

document.addEventListener("keydown", (event) => {
  const keyName = event.key.toLowerCase();

  switch (keyName) {
    case "w":
      playerYvelocity = 0.01;
      break;
    case "a":
      playerXvelocity = -0.01;
      break;
    case "s":
      playerYvelocity = -0.01;
      break;
    case "d":
      playerXvelocity = 0.01;
      break;
    default:
      // Optional: You can handle other keys here if needed
      // console.log(`Key pressed: ${keyName}`);
      break;
  }
});

document.addEventListener("keyup", (event) => {
  playerYvelocity = 0;
  playerXvelocity = 0;
});

function animate() {
  playerY += playerYvelocity;
  playerX += playerXvelocity;
  W.camera({ ry: rot, x: playerX, y: playerY, z: z });
  checkCollision();
  W.sphere({
    n: "player",
    size: 1,
    x: playerX,
    y: playerY,
    z: 0,
  });

  requestAnimationFrame(animate);
}

W.reset(canvas);
W.ambient(0.7);
W.clearColor("8Af");
W.camera({ ry: rot });
W.light({ x: 0.5, y: -0.3, z: -0.5 });
image.onload = function () {
  map1.forEach((maprow, index) => {
    for (let i = 0; i < maprow.length; i++) {
      let merkki = maprow[i];
      let x = i;
      let y = map1.length - index;
      let z = 0;
      if (merkki === "#" || merkki === "=") {
        W.cube({
          n: "kuutio" + index + "_" + i,
          x: x,
          y: y,
          z: z,
          w: 1,
          h: 1,
          d: 1,
          t: image,
        });
      }
      if (merkki === "!") {
        W.sphere({
          n: "ball" + i + index,
          size: 1,
          x: x,
          y: y,
          z: z,
          t: image,
        });
      }
    }
  });
};
animate();
