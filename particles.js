/* ============================================================
   PHYSICS UNLOCKED — Particle Engine v3.0
   Features: Noise flow, audio reactivity, physics symbols,
             mouse repulsion, color scheme adaptation, audio UI
   ============================================================ */

(() => {
  'use strict';

  /* ── Config ──────────────────────────────────────────────── */
  const CFG = {
    count:        48,
    symbols:      ['λ', 'Δ', '∇', 'μ', '⚛', 'ħ', 'Ω', 'φ', 'ψ', '∫', 'σ', 'π'],
    repelRadius:  120,
    repelForce:   2.8,
    baseSpeed:    0.9,
    beatMult:     1.6,
    depthLayers:  3,
    fadeEdge:     60,        // px from edge where particles fade
  };

  /* ── Noise function ──────────────────────────────────────── */
  function noise(x, y, t) {
    return (
      Math.sin(x * 0.8 + t)       * 0.55 +
      Math.sin(y * 0.6 + t * 1.3) * 0.35 +
      Math.sin((x + y) * 0.4 + t) * 0.1
    );
  }

  /* ── Particle Layer ──────────────────────────────────────── */
  let layer = document.getElementById('particle-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'particle-layer';
    document.body.prepend(layer);
  }

  /* ── Color palettes ──────────────────────────────────────── */
  const palettes = {
    dark:  ['rgba(96,165,250,', 'rgba(147,197,253,', 'rgba(186,213,255,', 'rgba(59,130,246,', 'rgba(245,158,11,'],
    light: ['rgba(30,58,138,',  'rgba(37,99,235,',   'rgba(67,56,202,',   'rgba(109,40,217,',  'rgba(180,83,9,'],
  };

  let isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  let palette = isDark ? palettes.dark : palettes.light;

  /* ── Viewport ────────────────────────────────────────────── */
  let W = innerWidth;
  let H = innerHeight;
  let lastScrollY = scrollY;

  /* ── Mouse ───────────────────────────────────────────────── */
  const mouse = { x: null, y: null, active: false };

  /* ── Audio State ─────────────────────────────────────────── */
  let audioCtx, analyser, gainNode, audioEl;
  let audioReady = false;
  let audioEnabled = false;
  let beatEnergy = 0;
  let beatStrength = 1;
  let volumeLevel = 0.55;

  function initAudio() {
    if (audioReady) {
      if (audioEnabled && audioEl) audioEl.play().catch(() => {});
      return;
    }

    audioEl = document.querySelector('audio');
    if (!audioEl) return;

    try {
      audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      analyser   = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;

      gainNode   = audioCtx.createGain();
      gainNode.gain.value = volumeLevel;

      const src  = audioCtx.createMediaElementSource(audioEl);
      src.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioCtx.destination);

      audioReady = true;

      if (audioEnabled) {
        audioEl.play().catch(() => {});
        startAnalysis();
      }
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  const freqData = new Uint8Array(256);

  function startAnalysis() {
    function tick() {
      if (!audioEnabled || !analyser) return;
      analyser.getByteFrequencyData(freqData);

      // Bass band (0–80Hz approx)
      let bass = 0;
      for (let i = 0; i < 12; i++) bass += freqData[i];
      bass /= (12 * 255);

      beatEnergy += (bass - beatEnergy) * 0.1;
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ── Audio UI ────────────────────────────────────────────── */
  const panel = document.createElement('div');
  panel.className = 'audio-panel';

  const audioToggle = document.createElement('button');
  audioToggle.className = 'audio-toggle';
  audioToggle.setAttribute('aria-label', 'Toggle audio');
  audioToggle.innerHTML = '🔇';
  audioToggle.title = 'Click to enable ambient music';

  const controls = document.createElement('div');
  controls.className = 'audio-controls';
  controls.innerHTML = `
    <div class="audio-slider-wrap">
      <div class="audio-slider-label">Volume</div>
      <input type="range" id="pu-volume" min="0" max="1" step="0.01" value="${volumeLevel}">
    </div>
    <div class="audio-slider-wrap">
      <div class="audio-slider-label">Beat Sensitivity</div>
      <input type="range" id="pu-beat" min="0" max="2" step="0.05" value="1">
    </div>
  `;

  panel.appendChild(controls);
  panel.appendChild(audioToggle);
  document.body.appendChild(panel);

  // Show/hide controls on toggle hover
  let controlsVisible = false;
  let hideControlsTimer;

  function showControls() {
    controls.classList.add('visible');
    controlsVisible = true;
    clearTimeout(hideControlsTimer);
    hideControlsTimer = setTimeout(hideControls, 4000);
  }

  function hideControls() {
    controls.classList.remove('visible');
    controlsVisible = false;
  }

  audioToggle.addEventListener('mouseenter', showControls);
  panel.addEventListener('mouseenter', () => { clearTimeout(hideControlsTimer); });
  panel.addEventListener('mouseleave', () => { hideControlsTimer = setTimeout(hideControls, 2000); });

  audioToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;

    if (audioEnabled) {
      audioToggle.innerHTML = '🎵';
      audioToggle.title = 'Music on — click to mute';
      initAudio();
      if (audioReady) {
        audioEl.play().catch(() => {});
        startAnalysis();
        if (gainNode) gainNode.gain.value = volumeLevel;
      }
    } else {
      audioToggle.innerHTML = '🔇';
      audioToggle.title = 'Music off — click to enable';
      beatEnergy = 0;
      if (audioEl) audioEl.pause();
    }
  });

  // Also init on any first click (for auto-play policy)
  document.addEventListener('click', () => {
    if (audioEnabled && !audioReady) initAudio();
  }, { once: true });

  // Slider events
  document.addEventListener('input', e => {
    if (e.target.id === 'pu-volume') {
      volumeLevel = parseFloat(e.target.value);
      if (gainNode) gainNode.gain.value = volumeLevel;
    }
    if (e.target.id === 'pu-beat') {
      beatStrength = parseFloat(e.target.value);
    }
  });

  /* ── Create Particles ────────────────────────────────────── */
  const particles = [];

  for (let i = 0; i < CFG.count; i++) {
    const depth   = (i % CFG.depthLayers) / CFG.depthLayers; // 0 = near, 1 = far
    const baseSize = 10 + (1 - depth) * 18 + Math.random() * 8;
    const alpha   = 0.12 + (1 - depth) * 0.45 + Math.random() * 0.2;
    const colorBase = palette[Math.floor(Math.random() * palette.length)];

    const el = document.createElement('span');
    el.className = 'particle';
    el.textContent = CFG.symbols[i % CFG.symbols.length];
    el.style.cssText = `
      font-size: ${baseSize}px;
      color: ${colorBase}${alpha});
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-weight: 400;
      letter-spacing: -0.02em;
      filter: blur(${depth * 0.8}px);
      transition: color 1.2s ease;
    `;

    layer.appendChild(el);

    particles.push({
      el,
      x:     Math.random() * W,
      y:     Math.random() * H,
      nx:    Math.random() * 12,
      ny:    Math.random() * 12,
      depth,
      alpha,
      colorBase,
      baseSize,
      vx:    0,
      vy:    0,
    });
  }

  /* ── Animation Loop ──────────────────────────────────────── */
  let frameId;
  let lastTime = 0;

  function animate(time) {
    frameId = requestAnimationFrame(animate);
    const t = time * 0.00018;
    const dt = Math.min((time - lastTime) / 16.67, 2.5); // normalize to 60fps
    lastTime = time;

    const scrollDelta = scrollY - lastScrollY;
    lastScrollY = scrollY;
    const energy = 1 + beatEnergy * beatStrength * CFG.beatMult;

    particles.forEach(p => {
      const n = noise(p.nx + t, p.ny + t * 0.7, t);
      const speed = CFG.baseSpeed * energy * (1 - p.depth * 0.4) * dt;

      // Flow
      p.x += Math.cos(n * Math.PI * 2) * speed * 1.4;
      p.y += Math.sin(n * Math.PI * 2) * speed;

      // Parallax scroll
      p.y -= scrollDelta * (1 - p.depth) * 0.08;

      // Noise walk
      p.nx += 0.0015 * dt;
      p.ny += 0.0012 * dt;

      // Mouse repulsion
      if (mouse.active && mouse.x !== null) {
        const dx   = p.x - mouse.x;
        const dy   = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < CFG.repelRadius) {
          const force  = ((CFG.repelRadius - dist) / CFG.repelRadius);
          const thrust = CFG.repelForce * force * force * dt;
          p.vx += (dx / dist) * thrust;
          p.vy += (dy / dist) * thrust;
        }
      }

      // Apply & dampen velocity
      p.x  += p.vx;
      p.y  += p.vy;
      p.vx *= 0.88;
      p.vy *= 0.88;

      // Wrap around edges
      if (p.x < -CFG.fadeEdge) p.x = W + CFG.fadeEdge;
      if (p.x > W + CFG.fadeEdge) p.x = -CFG.fadeEdge;
      if (p.y < -CFG.fadeEdge) p.y = H + CFG.fadeEdge;
      if (p.y > H + CFG.fadeEdge) p.y = -CFG.fadeEdge;

      // Edge fade
      const edgeDist = Math.min(p.x, W - p.x, p.y, H - p.y, CFG.fadeEdge);
      const edgeFade = Math.min(edgeDist / CFG.fadeEdge, 1);

      // Beat pulse
      const beatPulse = 1 + beatEnergy * beatStrength * 0.4 * (1 - p.depth * 0.5);
      const currentAlpha = p.alpha * edgeFade * beatPulse;

      p.el.style.color    = `${p.colorBase}${Math.min(currentAlpha, 0.9)})`;
      p.el.style.fontSize = `${p.baseSize * beatPulse}px`;
      p.el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`;
    });
  }

  requestAnimationFrame(animate);

  /* ── Events ──────────────────────────────────────────────── */
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });

  window.addEventListener('mouseleave', () => { mouse.active = false; });

  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.active = true;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    setTimeout(() => { mouse.active = false; }, 1000);
  });

  window.addEventListener('resize', () => {
    W = innerWidth;
    H = innerHeight;
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    isDark  = e.matches;
    palette = isDark ? palettes.dark : palettes.light;
    particles.forEach((p, i) => {
      p.colorBase = palette[i % palette.length];
    });
  });

})();
