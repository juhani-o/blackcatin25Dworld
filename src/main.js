import './w.min.full.js';
// Haetaan canvas-elementti HTML-dokumentista
const canvas = document.getElementById('myCanvas');

// Haetaan 2D-konteksti piirtämistä varten
const ctx = canvas.getContext('2d');

// Alustetaan muuttujia animaatiota varten
let x = 50;
let y = 50;
let dx = 2; // Liikkumisnopeus X-suunnassa
let dy = 2; // Liikkumisnopeus Y-suunnassa
let radius = 20;

// Animaatiosilmukan funktio
function animate() {
    // 1. Tyhjennä canvas
    // Tämä on tärkeää, jotta edellinen "kuva" poistetaan
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Piirrä uusi muoto (esimerkiksi pallo)
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    // 3. Päivitä muodon sijainti
    x += dx;
    y += dy;

    // 4. Tarkista reunat ja käännä liikesuunta
    // X-suunta
    if (x + radius > canvas.width || x - radius < 0) {
        dx = -dx;
    }
    // Y-suunta
    if (y + radius > canvas.height || y - radius < 0) {
        dy = -dy;
    }

    // 5. Pyydä seuraavaa "animaatioruutua"
    // Tämä kutsuu 'animate'-funktion uudelleen selaimen seuraavalla päivitystaajuudella
    requestAnimationFrame(animate);
}

// Käynnistä animaatio
animate();

