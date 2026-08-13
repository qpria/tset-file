// ===============================
// VEIL — single large 3D city field
// Pure canvas pseudo-3D perspective renderer (no external libs).
// ===============================
(() => {
  const canvas = document.getElementById('veilCityCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = canvas.closest('.veil-hero');

  const PALETTE = {
    sky: ['#050712', '#0b1020'],
    fog: '#0b1330',
    glow: ['rgba(107, 123, 255, 0.55)', 'rgba(83, 224, 196, 0.28)'],
    buildings: ['#0e1330', '#121a3a', '#171f44', '#0b1024'],
    windows: ['#6b7bff', '#9a7bff', '#53e0c4', '#ffd56b', '#ff9b71'],
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Deterministic PRNG so the field looks the same every load.
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(1337);

  // One large field: rows recede toward the horizon, lanes flank a central avenue.
  const ROWS = 24;
  const Z_NEAR = 0.15;
  const Z_FAR = 9;
  const FOCAL = 2.6;
  const LANE_SLOTS = [-6.4, -5.3, -4.2, -3.2, -2.3, 2.3, 3.2, 4.2, 5.3, 6.4];

  const buildings = [];
  for (let row = 0; row < ROWS; row++) {
    const t = row / (ROWS - 1);
    const z = Z_NEAR * Math.pow(Z_FAR / Z_NEAR, t);
    LANE_SLOTS.forEach((slotX) => {
      if (rand() < 0.16) return; // occasional empty lot
      const jitterX = slotX + (rand() - 0.5) * 0.5;
      const worldWidth = 0.75 + rand() * 0.45;
      const worldHeight = 1.6 + rand() * 6.4 * (0.6 + 0.4 * (1 - t));
      const colorIdx = Math.floor(rand() * PALETTE.buildings.length);
      const windowSeed = rand() * 1000;
      const windowColor = PALETTE.windows[Math.floor(rand() * PALETTE.windows.length)];
      buildings.push({ z, x: jitterX, worldWidth, worldHeight, colorIdx, windowSeed, windowColor });
    });
  }
  // Painter's algorithm: draw far (large z) first, near (small z) last.
  buildings.sort((a, b) => b.z - a.z);

  let width = 0;
  let height = 0;
  let dpr = 1;

  function resize() {
    const rect = container.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function scaleFor(z) {
    return FOCAL / (FOCAL + z);
  }

  function drawSky(time) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, PALETTE.sky[0]);
    g.addColorStop(1, PALETTE.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Soft veiled moon/glow near the horizon.
    const horizonY = height * 0.4;
    const drift = reduceMotion ? 0 : Math.sin(time * 0.00012) * width * 0.02;
    const glowX = width * 0.5 + drift;
    const glow = ctx.createRadialGradient(glowX, horizonY - 6, 4, glowX, horizonY - 6, width * 0.32);
    glow.addColorStop(0, PALETTE.glow[0]);
    glow.addColorStop(0.5, PALETTE.glow[1]);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, horizonY + height * 0.15);
  }

  function drawGround() {
    const horizonY = height * 0.4;
    const g = ctx.createLinearGradient(0, horizonY, 0, height);
    g.addColorStop(0, 'rgba(11, 19, 48, 0.9)');
    g.addColorStop(1, 'rgba(2, 3, 10, 0.98)');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY, width, height - horizonY);
  }

  function drawBuilding(b, time) {
    const horizonY = height * 0.4;
    const s = scaleFor(b.z);
    const groundY = horizonY + (height - horizonY) * s;
    const centerX = width * 0.5;
    const lateralSpread = width * 0.075;
    const heightSpread = height * 0.14;

    const screenW = Math.max(1, b.worldWidth * s * lateralSpread);
    const screenH = Math.max(1, b.worldHeight * s * heightSpread);
    const screenX = centerX + b.x * s * lateralSpread - screenW / 2;
    const screenY = groundY - screenH;

    if (screenY > height || groundY < horizonY - 1) return;

    const fade = Math.max(0.14, 1 - (b.z / Z_FAR) * 0.92);
    ctx.globalAlpha = fade;

    const shade = ctx.createLinearGradient(screenX, 0, screenX + screenW, 0);
    const base = PALETTE.buildings[b.colorIdx];
    shade.addColorStop(0, base);
    shade.addColorStop(1, '#02040c');
    ctx.fillStyle = shade;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // Windows — a light grid, some flickering.
    if (screenW > 4 && screenH > 6) {
      const cols = Math.max(1, Math.floor(screenW / 5));
      const rows = Math.max(1, Math.floor(screenH / 7));
      const cellW = screenW / cols;
      const cellH = screenH / rows;
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          const seed = b.windowSeed + cx * 13.7 + cy * 7.3;
          const lit = (Math.sin(seed) + 1) / 2 > 0.55;
          if (!lit) continue;
          const flicker = reduceMotion
            ? 1
            : 0.55 + 0.45 * Math.sin(time * 0.002 + seed * 3);
          ctx.globalAlpha = fade * flicker;
          ctx.fillStyle = b.windowColor;
          ctx.fillRect(
            screenX + cx * cellW + cellW * 0.25,
            screenY + cy * cellH + cellH * 0.3,
            cellW * 0.5,
            cellH * 0.4
          );
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawVeil() {
    const horizonY = height * 0.4;
    const g = ctx.createLinearGradient(0, horizonY - height * 0.05, 0, horizonY + height * 0.35);
    g.addColorStop(0, 'rgba(11, 19, 48, 0)');
    g.addColorStop(0.5, 'rgba(11, 19, 48, 0.35)');
    g.addColorStop(1, 'rgba(11, 19, 48, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function render(time) {
    drawSky(time);
    drawGround();
    for (const b of buildings) drawBuilding(b, time);
    drawVeil();
  }

  function loop(time) {
    render(time);
    if (!reduceMotion) requestAnimationFrame(loop);
  }

  resize();
  if (reduceMotion) {
    render(0);
  } else {
    requestAnimationFrame(loop);
  }

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (reduceMotion) render(0);
    }, 120);
  };
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) {
    new ResizeObserver(onResize).observe(container);
  }
})();
