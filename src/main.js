import './w.min.full.js';
// Haetaan canvas-elementti HTML-dokumentista
const canvas = document.getElementById('myCanvas');
const gl = canvas.getContext("webgl2");

// Animaatiosilmukan funktio
function animate() {
    requestAnimationFrame(animate);
}
// Start the framework
W.reset(canvas);
W.ambient(.7);
W.clearColor("8Af");
W.sphere({n:"ball",size:2,y:-.3,z:-10,s:1});
animate();

