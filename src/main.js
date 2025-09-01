import "./w.min.full.js";
import { map1 } from "./maps/maps.js";
import noppa from "./assets/noppa2.png";
const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl2");

let z = 40;

// Animaatiosilmukan funktio
function animate() {
  W.camera({ z: z });
  requestAnimationFrame(animate);
}
// Start the framework
W.reset(canvas);
W.ambient(0.7);
W.clearColor("8Af");
// W.sphere({ n: "ball", size: 2, y: -0.3, z: -10, s: 1 });
//W.cube({ n: "kuutio", x: 0, y: 0, z: -5, ry: 12, rx: 28, w: 1, h: 1, d: 1 });
W.camera({ z: z });
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
      });
    }
    if (merkki === "!") {
      W.sphere({ n: "ball" + i + index, size: 2, x: x, y: y, z: z });
    }
  }
});
animate();
