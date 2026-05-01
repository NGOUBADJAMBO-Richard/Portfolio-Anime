const revealSections = document.querySelectorAll("[data-reveal]");
const progressLine = document.querySelector(".progress-line");
const noiseLayer = document.querySelector(".noise");
const parallaxItems = Array.from(document.querySelectorAll("[data-parallax]"));
const panImages = Array.from(document.querySelectorAll("[data-pan]"));
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (value, min, max) => Math.max(Math.min(value, max), min);

const getSectionMotion = (element) => {
  const section = element.closest("section[data-reveal]");
  const ease = Number(section?.dataset.ease || "0.14");
  const panEase = Number(
    section?.dataset.panEase || section?.dataset.ease || "0.14",
  );

  return {
    ease: clamp(Number.isFinite(ease) ? ease : 0.14, 0.04, 0.35),
    panEase: clamp(Number.isFinite(panEase) ? panEase : 0.14, 0.04, 0.35),
  };
};

const parallaxDescriptors = parallaxItems.map((element) => {
  const motion = getSectionMotion(element);
  return {
    element,
    speed: Number(element.dataset.speed || "0.2"),
    ease: motion.ease,
    current: 0,
  };
});

const panDescriptors = panImages.map((element) => {
  const motion = getSectionMotion(element);
  return {
    element,
    speed: Number(element.dataset.panSpeed || "6"),
    ease: motion.panEase,
    current: 50,
  };
});

const motionState = {
  ticking: false,
  lastScrollTop: window.scrollY || document.documentElement.scrollTop,
};

const motionTuning = {
  parallaxMultiplier: 1,
  panMultiplier: 1,
  grainMultiplier: 1,
};

const sectionObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.22,
    rootMargin: "0px 0px -8% 0px",
  },
);

revealSections.forEach((section) => {
  sectionObserver.observe(section);
});

const applyGrain = (scrollTop, velocity) => {
  if (!noiseLayer) {
    return;
  }

  const x = (scrollTop * 0.37) % 9;
  const y = (scrollTop * -0.58) % 11;
  const speedBoost = clamp(Math.abs(velocity) * 0.0009, 0, 0.05);
  const opacity = clamp(
    0.028 + speedBoost * motionTuning.grainMultiplier,
    0.018,
    0.11,
  );

  document.documentElement.style.setProperty("--grain-x", `${x.toFixed(2)}px`);
  document.documentElement.style.setProperty("--grain-y", `${y.toFixed(2)}px`);
  document.documentElement.style.setProperty(
    "--grain-opacity",
    opacity.toFixed(3),
  );
};

const updateMotion = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const velocity = scrollTop - motionState.lastScrollTop;
  motionState.lastScrollTop = scrollTop;

  if (reduceMotionQuery.matches) {
    parallaxDescriptors.forEach((item) => {
      item.current = 0;
      item.element.style.setProperty("--parallax-shift", "0px");
    });

    panDescriptors.forEach((item) => {
      item.current = 50;
      item.element.style.setProperty("--img-pan-x", "50%");
    });

    document.documentElement.style.setProperty("--grain-x", "0px");
    document.documentElement.style.setProperty("--grain-y", "0px");
    document.documentElement.style.setProperty("--grain-opacity", "0.025");
    motionState.ticking = false;
    return;
  }

  const viewportCenter = window.innerHeight * 0.5;

  parallaxDescriptors.forEach((item) => {
    const rect = item.element.getBoundingClientRect();

    if (rect.bottom < -220 || rect.top > window.innerHeight + 220) {
      return;
    }

    const itemCenter = rect.top + rect.height * 0.5;
    const distance = itemCenter - viewportCenter;
    const target =
      distance * -item.speed * 0.2 * motionTuning.parallaxMultiplier;
    item.current += (target - item.current) * item.ease;
    item.element.style.setProperty(
      "--parallax-shift",
      `${item.current.toFixed(2)}px`,
    );
  });

  panDescriptors.forEach((item) => {
    const rect = item.element.getBoundingClientRect();

    if (rect.bottom < -220 || rect.top > window.innerHeight + 220) {
      return;
    }

    const itemCenter = rect.top + rect.height * 0.5;
    const distance = itemCenter - viewportCenter;
    const normalized = clamp(distance / viewportCenter, -1, 1);
    const target = 50 + normalized * item.speed * motionTuning.panMultiplier;
    item.current += (target - item.current) * item.ease;
    item.element.style.setProperty(
      "--img-pan-x",
      `${item.current.toFixed(2)}%`,
    );
  });

  applyGrain(scrollTop, velocity);
  motionState.ticking = false;
};

const requestMotionUpdate = () => {
  if (motionState.ticking) {
    return;
  }

  motionState.ticking = true;
  window.requestAnimationFrame(updateMotion);
};

const createDebugPanel = () => {
  const panel = document.createElement("aside");
  panel.className = "debug-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Motion debug panel");

  panel.innerHTML = `
    <p class="debug-panel__title">Motion Debug</p>
    <div class="debug-panel__line">
      <label for="dbg-parallax">Parallax Speed</label>
      <span class="debug-panel__value" data-value="parallax">1.00x</span>
      <input id="dbg-parallax" type="range" min="0.40" max="2.00" step="0.05" value="1.00" data-control="parallax" />
    </div>
    <div class="debug-panel__line">
      <label for="dbg-pan">Pan Speed</label>
      <span class="debug-panel__value" data-value="pan">1.00x</span>
      <input id="dbg-pan" type="range" min="0.40" max="2.00" step="0.05" value="1.00" data-control="pan" />
    </div>
    <div class="debug-panel__line">
      <label for="dbg-grain">Grain Intensity</label>
      <span class="debug-panel__value" data-value="grain">1.00x</span>
      <input id="dbg-grain" type="range" min="0.20" max="2.20" step="0.05" value="1.00" data-control="grain" />
    </div>
    <p class="debug-panel__hint">Press D to toggle</p>
  `;

  const valueNodes = {
    parallax: panel.querySelector('[data-value="parallax"]'),
    pan: panel.querySelector('[data-value="pan"]'),
    grain: panel.querySelector('[data-value="grain"]'),
  };

  const controls = panel.querySelectorAll("input[data-control]");
  controls.forEach((input) => {
    input.addEventListener("input", () => {
      const value = Number(input.value);
      if (input.dataset.control === "parallax") {
        motionTuning.parallaxMultiplier = value;
        valueNodes.parallax.textContent = `${value.toFixed(2)}x`;
      }

      if (input.dataset.control === "pan") {
        motionTuning.panMultiplier = value;
        valueNodes.pan.textContent = `${value.toFixed(2)}x`;
      }

      if (input.dataset.control === "grain") {
        motionTuning.grainMultiplier = value;
        valueNodes.grain.textContent = `${value.toFixed(2)}x`;
      }

      requestMotionUpdate();
    });
  });

  return panel;
};

let debugPanel = null;
const debugState = {
  enabled: false,
};

const toggleDebugPanel = () => {
  debugState.enabled = !debugState.enabled;

  if (debugState.enabled && !debugPanel) {
    debugPanel = createDebugPanel();
    document.body.append(debugPanel);
  }

  if (!debugState.enabled && debugPanel) {
    debugPanel.remove();
    debugPanel = null;
  }
};

if (new URLSearchParams(window.location.search).has("debug")) {
  toggleDebugPanel();
}

window.addEventListener("keydown", (event) => {
  const tagName =
    event.target instanceof HTMLElement ? event.target.tagName : "";
  if (tagName === "INPUT" || tagName === "TEXTAREA") {
    return;
  }

  if (event.key.toLowerCase() === "d") {
    toggleDebugPanel();
  }
});

requestMotionUpdate();
window.addEventListener("scroll", requestMotionUpdate, { passive: true });
window.addEventListener("resize", requestMotionUpdate);
reduceMotionQuery.addEventListener("change", requestMotionUpdate);

const supportsScrollTimeline =
  CSS.supports("animation-timeline: view()") ||
  CSS.supports("scroll-timeline-name: --timeline");

if (!supportsScrollTimeline && progressLine) {
  const updateProgress = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight =
      document.documentElement.scrollHeight - window.innerHeight;

    if (scrollHeight <= 0) {
      progressLine.style.height = "0";
      return;
    }

    const ratio = Math.min(Math.max(scrollTop / scrollHeight, 0), 1);
    progressLine.style.height = `${ratio * 100}vh`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}
