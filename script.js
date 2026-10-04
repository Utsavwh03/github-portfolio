// Theme toggle -------------------------------------------------------
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  const label = toggle ? toggle.querySelector(".theme-toggle-label") : null;
  const storageKey = "utsav-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const currentTheme = () => root.getAttribute("data-theme") || (media.matches ? "dark" : "light");

  const updateLabel = () => {
    if (!label) return;
    // The button names the theme it switches to.
    label.textContent = currentTheme() === "dark" ? "Light" : "Dark";
  };

  const setTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {
      /* storage unavailable; the theme still applies for this visit */
    }
    updateLabel();
    document.dispatchEvent(new CustomEvent("themechange"));
  };

  if (toggle) {
    toggle.addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));
  }
  media.addEventListener("change", () => {
    updateLabel();
    document.dispatchEvent(new CustomEvent("themechange"));
  });
  updateLabel();
})();

// Footer year --------------------------------------------------------
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

// Hero experiment: launch, observe, bisect, commit --------------------
(function () {
  const canvas = document.getElementById("experimentCanvas");
  const replayBtn = document.getElementById("replayBtn");
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Each attempt lands at this multiple of the distance to the target.
  const attempts = [1.42, 0.62, 1.14, 0.9, 1.01];
  const HIT_TOLERANCE = 0.05;
  const FLIGHT_MS = 950;
  const PAUSE_MS = 280;

  let W = 0;
  let H = 0;
  let state = { index: 0, progress: 0, done: false };
  let rafId = null;
  let phaseStart = 0;

  const colors = () => {
    const s = getComputedStyle(document.documentElement);
    return {
      ink: s.getPropertyValue("--ink").trim(),
      graphite: s.getPropertyValue("--graphite").trim(),
      rule: s.getPropertyValue("--rule").trim(),
      cobalt: s.getPropertyValue("--cobalt").trim(),
      amber: s.getPropertyValue("--amber").trim(),
      panel: s.getPropertyValue("--panel").trim(),
    };
  };

  const geometry = () => {
    const ground = H * 0.8;
    const x0 = W * 0.1;
    const xT = W * 0.7;
    const unit = xT - x0;
    const tan = Math.tan((52 * Math.PI) / 180);
    return { ground, x0, xT, unit, tan, targetHalf: unit * HIT_TOLERANCE };
  };

  const pointAt = (g, mult, s) => {
    const range = g.unit * mult;
    const peak = (range * g.tan) / 4;
    return { x: g.x0 + s * range, y: g.ground - 4 * peak * s * (1 - s) };
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };

  const drawScene = (c, g, hit) => {
    // Ground
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.04, g.ground);
    ctx.lineTo(W * 0.96, g.ground);
    ctx.stroke();

    // Launcher
    ctx.fillStyle = c.ink;
    ctx.fillRect(g.x0 - 9, g.ground - 10, 18, 10);
    ctx.save();
    ctx.translate(g.x0, g.ground - 10);
    ctx.rotate((-52 * Math.PI) / 180);
    ctx.fillRect(0, -2.5, 22, 5);
    ctx.restore();

    // Target zone
    const tw = g.targetHalf * 2;
    ctx.fillStyle = hit ? c.amber : "transparent";
    ctx.globalAlpha = hit ? 0.25 : 1;
    ctx.fillRect(g.xT - g.targetHalf, g.ground - 26, tw, 26);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.amber;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.xT - g.targetHalf, g.ground - 26);
    ctx.lineTo(g.xT - g.targetHalf, g.ground);
    ctx.lineTo(g.xT + g.targetHalf, g.ground);
    ctx.lineTo(g.xT + g.targetHalf, g.ground - 26);
    ctx.stroke();

    ctx.fillStyle = c.amber;
    ctx.font = "600 12px Archivo, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(hit ? "solved" : "target", g.xT, g.ground - 34);
  };

  const drawTrace = (c, g, mult, upTo, style) => {
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.globalAlpha = style.alpha;
    ctx.lineWidth = style.width;
    ctx.setLineDash(style.dash || []);
    ctx.beginPath();
    const steps = 60;
    for (let i = 0; i <= steps * upTo; i++) {
      const p = pointAt(g, mult, i / steps);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    const end = pointAt(g, mult, upTo);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
    return end;
  };

  const drawLanding = (c, g, mult, n) => {
    const x = g.x0 + g.unit * mult;
    ctx.strokeStyle = c.graphite;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, g.ground + 4);
    ctx.lineTo(x, g.ground + 11);
    ctx.stroke();
    ctx.fillStyle = c.graphite;
    ctx.font = "500 11px Archivo, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(n), x, g.ground + 24);
  };

  const isHit = (mult) => Math.abs(mult - 1) <= HIT_TOLERANCE;

  const draw = () => {
    if (!W || !H) return;
    const c = colors();
    const g = geometry();
    ctx.clearRect(0, 0, W, H);

    const finished = state.done;
    const solved = finished && isHit(attempts[attempts.length - 1]);
    drawScene(c, g, solved);

    // Completed attempts
    const completed = finished ? attempts.length : state.index;
    for (let i = 0; i < completed; i++) {
      const last = i === attempts.length - 1;
      drawTrace(c, g, attempts[i], 1, {
        color: last && solved ? c.cobalt : c.graphite,
        alpha: last && solved ? 1 : 0.45,
        width: last && solved ? 2.25 : 1.25,
        dash: last && solved ? [] : [4, 4],
      });
      drawLanding(c, g, attempts[i], i + 1);
    }

    // Attempt in flight
    if (!finished && state.index < attempts.length) {
      const mult = attempts[state.index];
      const end = drawTrace(c, g, mult, state.progress, { color: c.cobalt, alpha: 1, width: 2.25 });
      ctx.fillStyle = c.cobalt;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Caption in the chamber
    ctx.fillStyle = c.graphite;
    ctx.font = "500 12px Archivo, Arial, sans-serif";
    ctx.textAlign = "left";
    const shown = finished ? attempts.length : state.index + 1;
    ctx.fillText(`attempt ${Math.min(shown, attempts.length)} of ${attempts.length}`, W * 0.04, H * 0.1);
  };

  const tick = (now) => {
    const elapsed = now - phaseStart;
    if (elapsed < FLIGHT_MS) {
      state.progress = elapsed / FLIGHT_MS;
    } else if (elapsed < FLIGHT_MS + PAUSE_MS) {
      state.progress = 1;
    } else {
      state.index += 1;
      state.progress = 0;
      phaseStart = now;
      if (state.index >= attempts.length) {
        state.done = true;
        draw();
        rafId = null;
        return;
      }
    }
    draw();
    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (reduceMotion) {
      state = { index: attempts.length, progress: 1, done: true };
      draw();
      return;
    }
    state = { index: 0, progress: 0, done: false };
    phaseStart = performance.now();
    rafId = requestAnimationFrame(tick);
  };

  if (replayBtn) {
    if (reduceMotion) replayBtn.hidden = true;
    else replayBtn.addEventListener("click", start);
  }
  document.addEventListener("themechange", draw);

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener("resize", resize);
  }

  resize();
  // Wait for fonts so canvas labels render in Archivo.
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
    resize();
    // Draw the opening scene, then play once the figure scrolls into view.
    state = { index: 0, progress: 0, done: false };
    draw();
    if (reduceMotion || !("IntersectionObserver" in window)) {
      start();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(canvas);
  });
})();