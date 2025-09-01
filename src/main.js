import "./w.min.full.js";
import { map1 } from "./maps/maps.js";
import noppa from "./assets/noppa2.png";
const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2");

let z = 20;
let rot = 0;

let image = new Image();
image.src = noppa;

function animate() {
  W.camera({ ry: rot, z: z });
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
      let x = -25 + i;
      let y = 10 + -index;
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
