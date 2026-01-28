console.log("Particles engine FINAL loaded");

/* =========================
   Smooth ambient noise
========================= */
function noise(x, y) {
  return (
    Math.sin(x) * 0.6 +
    Math.sin(y) * 0.4 +
    Math.sin(x + y) * 0.2
  );
}

(() => {
  /* =========================
     PARTICLE LAYER
  ========================= */
  let layer = document.getElementById("particle-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "particle-layer";
    document.body.prepend(layer);
  }

  /* =========================
     COLOR PALETTES
  ========================= */
  const darkPalette = ["#9fb6ff", "#b8c7ff", "#d6deff", "#a3bffa"];
  const lightPalette = ["#4b5563", "#6b7280", "#374151", "#52525b"];

  let isDark = matchMedia("(prefers-color-scheme: dark)").matches;
  let palette = isDark ? darkPalette : lightPalette;

  /* =========================
     VIEWPORT
  ========================= */
  let W = innerWidth;
  let H = innerHeight;
  let lastScrollY = scrollY;

  /* =========================
     MOUSE
  ========================= */
  const mouse = { x: null, y: null };

  /* =========================
     AUDIO STATE
  ========================= */
  let audioCtx, analyser, audioEl, gainNode;
  let audioStarted = false;
  let audioEnabled = true;
  let beatEnergy = 0;
  let beatStrength = 1;

  function initAudio() {
    if (audioStarted || !audioEnabled) return;

    audioEl = document.querySelector("audio");
    if (!audioEl) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = volumeSlider.value;

    const src = audioCtx.createMediaElementSource(audioEl);
    src.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    audioEl.play().catch(() => {});
    audioStarted = true;

    const data = new Uint8Array(analyser.frequencyBinCount);

    function update() {
      if (!audioEnabled) return;

      analyser.getByteFrequencyData(data);
      let bass = 0;
      for (let i = 0; i < 20; i++) bass += data[i];
      bass /= 20;

      beatEnergy += (bass / 255 - beatEnergy) * 0.08;
      requestAnimationFrame(update);
    }
    update();
  }

  /* =========================
     UI CONTROLS
  ========================= */
  const ui = document.createElement("div");
  ui.style.position = "fixed";
  ui.style.right = "14px";
  ui.style.bottom = "90px"; // above WhatsApp
  ui.style.zIndex = "10000";
  ui.style.display = "flex";
  ui.style.flexDirection = "column";
  ui.style.gap = "8px";
  ui.style.fontFamily = "system-ui";
  ui.style.opacity = "0";
  ui.style.transform = "translateY(10px)";
  ui.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  ui.style.pointerEvents = "none";

  /* 🎚 Beat sensitivity */
  const beatSlider = document.createElement("input");
  beatSlider.type = "range";
  beatSlider.min = "0";
  beatSlider.max = "2";
  beatSlider.step = "0.01";
  beatSlider.value = "1";
  beatSlider.oninput = e => (beatStrength = parseFloat(e.target.value));

  /* 🔊 Volume slider (REAL) */
  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = "0";
  volumeSlider.max = "1";
  volumeSlider.step = "0.01";
  volumeSlider.value = "0.6";
  volumeSlider.oninput = e => {
    if (gainNode) gainNode.gain.value = parseFloat(e.target.value);
  };

  /* 🎧 Audio toggle (icon only) */
  const toggle = document.createElement("button");
  toggle.textContent = "🎧";
  toggle.style.all = "unset";
  toggle.style.cursor = "pointer";
  toggle.style.fontSize = "16px";
  toggle.style.padding = "6px 10px";
  toggle.style.borderRadius = "6px";
  toggle.style.background = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.06)";

  toggle.onclick = () => {
    audioEnabled = !audioEnabled;

    if (audioEnabled) {
      toggle.textContent = "🎧";
      beatSlider.style.display = "block";
      volumeSlider.style.display = "block";
      initAudio();
      if (gainNode) gainNode.gain.value = volumeSlider.value;
    } else {
      toggle.textContent = "🔇";
      beatEnergy = 0;
      beatSlider.style.display = "none";
      volumeSlider.style.display = "none";
      if (audioEl) audioEl.pause();
      if (gainNode) gainNode.gain.value = 0;
    }
  };

  ui.appendChild(toggle);
  ui.appendChild(beatSlider);
  ui.appendChild(volumeSlider);
  document.body.appendChild(ui);

  /* 🫥 Auto-hide UI */
  let hideTimer;
  function showUI() {
    ui.style.opacity = "0.9";
    ui.style.transform = "translateY(0)";
    ui.style.pointerEvents = "auto";

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      ui.style.opacity = "0";
      ui.style.transform = "translateY(10px)";
      ui.style.pointerEvents = "none";
    }, 3000);
  }

  window.addEventListener("mousemove", showUI);
  window.addEventListener("click", showUI);
  setTimeout(showUI, 600);

  /* =========================
     PARTICLES
  ========================= */
  const COUNT = 55;
  const SYMBOLS = ["λ", "Δ", "∇", "μ", "⚛"];
  const particles = [];

  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement("div");
    el.className = "particle";
    el.textContent = SYMBOLS[i % SYMBOLS.length];
    el.style.position = "absolute";
    el.style.left = "0";
    el.style.top = "0";
    el.style.fontSize = 13 + Math.random() * 18 + "px";
    el.style.opacity = "0.6";
    el.style.color = palette[Math.floor(Math.random() * palette.length)];
    el.style.willChange = "transform, opacity";

    layer.appendChild(el);

    particles.push({
      el,
      x: Math.random() * W,
      y: Math.random() * H,
      nx: Math.random() * 10,
      ny: Math.random() * 10,
      depth: Math.random()
    });
  }

  /* =========================
     ANIMATION LOOP
  ========================= */
  function animate() {
    const t = performance.now() * 0.0002;
    const scrollDelta = scrollY - lastScrollY;
    lastScrollY = scrollY;

    particles.forEach(p => {
      const n = noise(p.nx + t, p.ny);
      const energy = 1 + beatEnergy * beatStrength;

      p.x += n * 1.2 * energy;
      p.y += n * 1.2 * energy;

      p.y -= scrollDelta * p.depth * 0.12;

      p.nx += 0.002;
      p.ny += 0.002;

      if (mouse.x !== null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < 140) {
          const force = (140 - dist) / 140;
          p.x += (dx / dist) * force * 3;
          p.y += (dy / dist) * force * 3;
          p.el.style.opacity = "0.85";
        } else {
          p.el.style.opacity = "0.6";
        }
      }

      if (p.x < -60) p.x = W + 60;
      if (p.x > W + 60) p.x = -60;
      if (p.y < -60) p.y = H + 60;
      if (p.y > H + 60) p.y = -60;

      p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    });

    requestAnimationFrame(animate);
  }

  animate();

  /* =========================
     EVENTS
  ========================= */
  window.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  window.addEventListener("resize", () => {
    W = innerWidth;
    H = innerHeight;
  });

  window.addEventListener("click", initAudio, { once: true });

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    isDark = e.matches;
    palette = isDark ? darkPalette : lightPalette;
    particles.forEach(p => {
      p.el.style.color =
        palette[Math.floor(Math.random() * palette.length)];
    });
  });
})();
