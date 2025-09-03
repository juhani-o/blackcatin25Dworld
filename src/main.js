import "./w.min.full.js";
import { map1 } from "./maps/maps.js";
import noppa from "./assets/noppa2.png";
const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2");

let z = 20;
let rot = 0;
let playerX = 8;
let playerY = 15;
let playerXvelocity = 0.01;
let playerYvelocity = -0.05;

let image = new Image();
image.src = noppa;

function checkCollision() {
  let mapSize = map1.length;
  let character = map1[Math.floor(mapSize - playerY + 1)][Math.round(playerX)];
  console.log("Character ", character);
  if (character === "#") {
    playerYvelocity = 0;
  }
}

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
