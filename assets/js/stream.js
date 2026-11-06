/* Page-long particle stream — GetLayers template "Relay" (stream-scene.ts,
   stream-path.ts, particle-stream.tsx), adapted for Two Oaks Technologies.
   Source of truth: getlayers_materialize('relay') portable master. Changed:
   the waypoints (anchored to this page's sections), a small shim for the
   template's page runtime, and — at the client's request, a deliberate
   composition change beyond Relay's contract — a second spine (BRANCH): a
   left arm: both arms rise out of the two oaks in the banner painting and
   meet just below the hill crest under the banner logo. Hero waypoints are anchored to
   the banner image and the hero's gutter column (resolvePath's `xAt`) so the
   stream never crosses a word in the hero. CONFIG, shaders, tiering and the entrance are Relay's own.
   Colours come from the --stream-* tokens in styles.css (gold + emerald). */
/* ═══════════════════════════════════════════════════════════════════════
   THE PAGE-LONG PARTICLE STREAM — views/home/stream/stream-scene.ts,
   stream-path.ts and particle-stream.tsx. An original GetLayers Scene Lab
   scene: a ribbon of glowing filaments sweeping in S-curves down the whole
   page, wrapped in sparks and out-of-focus bokeh, lime instead of cyan.
   Additive soft billboards whose size and softness grow away from the focal
   plane, then an UnrealBloom pass. The canvas is viewport-sized and fixed;
   the stream lives in document coordinates — its spine is baked into a float
   texture when the layout changes and mapped through the current scroll by
   the shaders every frame. House contract: every look knob lives in CONFIG,
   tint through the colour roles (--stream-*), never the shader.
   ═══════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  /** Particle budget of the full tier; the low tier draws `lowShare` of it. */
  particles: 36000,
  lowShare: 0.45,
  strands: 44,
  /** Flow speed along the curve, design px per second (±35% per particle). */
  flowPx: 90,
  /** Scrolling pushes the flow on: px along the curve per px scrolled
      (either way), so the stream keeps running down while the page moves up. */
  scrollFlow: 1.25,
  /** Stream radius where it pinches and elsewhere, design px. On a tight
      turn it is also held under `turnHold` × the turn's radius, so the
      strands never fold over each other. */
  spread: 8,
  spreadEnds: 190,
  turnHold: 0.5,
  /** Reach of a waypoint's pinch along the curve, design px. */
  pinchReach: 300,
  /** A swell that travels down the stream: ± share of the radius,
      wavelength (design px) and speed (rad/s). */
  breath: 0.35,
  breathWavelength: 900,
  breathSpeed: 0.6,
  spraySpread: 2.4,
  /** Free-riding bokeh and dust: how far off the spine, × the local spread. */
  bokehSpread: 3.2,
  dustSpread: 5.5,
  /** Per-particle wander, design px. */
  wobble: 4,
  size: 2.1,
  focal: 0.15,
  dof: 0.55,
  dofSize: 2.2,
  twinkle: 2.4,
  brightness: 0.79,
  heat: 1.2,
  /** Share of particles, and of filaments, woven in the second (blue) hue. */
  altShare: 0.45,
  altStrands: 0.32,
  lineBase: 0.16,
  lineSpread: 0.9,
  /** Filament waves: wavelength and amplitude (× spread), design px. */
  lineWavelength: 1560,
  lineWaveAmp: 0.22,
  lineWaveSpeed: 0.25,
  /** Light pulses running down the filaments: spacing and speed, design px. */
  pulseSpacing: 1130,
  pulseSpeed: 205,
  pulseGain: 1.4,
  /** Pulse shape: higher = shorter, sharper glow (a gaussian, not a saw). */
  pulseSharp: 9,
  parallax: 0.22,
  /** Entrance: the head draws this far down the curve (design px) over revealMs. */
  revealPx: 2600,
  revealMs: 2200,
  bloomStr: 0.68,
  bloomRadius: 0.57,
  bloomThresh: 0.07,
}

/** Spine samples — ~6 CSS px apart on a 1440 page. */
const SAMPLES = 2048
/** Filament vertices per strand — ~9 CSS px segments, so turns stay round. */
const SEGMENTS = 1400
const CAM_Z = 6
const FOV = 35
/** Damp for the pointer parallax, 1/s. */
const DAMP = 3.2
/** Turn radius: samples either side it is measured over, held over and
    smoothed over, and the radius past which a stretch counts as straight. */
const TURN_BASE = 12
const TURN_HOLD = 28
const TURN_SMOOTH = 48
const TURN_OPEN = 1e4
/** Far enough that the reveal head no longer hides anything. */
const REVEALED = 1e7

const DPR = { full: 1.35, low: 1.2 }
/** The bloom's mip chain starts at this share of the frame on each tier. */
const BLOOM_SCALE = { full: 1, low: 0.5 }
const HALF_H = CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180)

/** mulberry32 — seeded so the stream is the same on every load. */
const rng = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/* Shared GLSL. The spine texture: row 0 = document px x / y, depth z,
   pinch; row 1 = the unit in-page normal. `toScreen` maps a document point
   through the scroll into aspect-space NDC; `toWorld` places it at its depth
   so it still lands on that screen spot. */
const CURVE_GLSL = /* glsl */ `
  uniform sampler2D uCurve;
  uniform float uHalfH, uCamZ, uPx, uLen;
  uniform vec3 uView; // half viewport width, half height (CSS px), scrollY
  vec4 curveRow(float u, float row) {
    float x = clamp(u, 0.0, 1.0) * ${SAMPLES - 1}.0;
    float i = floor(x);
    float v = (row + 0.5) / 2.0;
    vec4 a = texture2D(uCurve, vec2((i + 0.5) / ${SAMPLES}.0, v));
    vec4 b = texture2D(uCurve, vec2((min(i + 1.0, ${SAMPLES - 1}.0) + 0.5) / ${SAMPLES}.0, v));
    return mix(a, b, x - i);
  }
  // a point offset from the spine: o.x across it (design px), o.y in depth
  vec3 onSpine(float u, vec2 o) {
    vec4 p = curveRow(u, 0.0);
    vec2 n = curveRow(u, 1.0).xy;
    vec2 page = p.xy + n * o.x * uPx * uView.y;
    return vec3(
      (page.x - uView.x) / uView.y,
      (uView.y - (page.y - uView.z)) / uView.y,
      p.z + o.y * uPx
    );
  }
  uniform float uTurnHold, uBreath, uBreathWave, uBreathSpeed, uTimeS;
  // stream radius at u (design px): pinched, breathing, held under the turn
  float widthAt(float u, float pinch, float narrow, float wide) {
    float a = u * uLen;
    float swell = 1.0 + uBreath * sin(a / uBreathWave * 6.2831 - uTimeS * uBreathSpeed);
    float w = mix(wide, narrow, pinch) * swell;
    // a soft min: a hard one kinks the outer strands where it takes over
    float r = max(curveRow(u, 1.0).z * uTurnHold, 1.0);
    return w * r / pow(pow(w, 4.0) + pow(r, 4.0), 0.25);
  }
  vec3 toWorld(vec3 s) {
    float k = (uCamZ - s.z) / uCamZ;
    return vec3(s.x * uHalfH * k, s.y * uHalfH * k, s.z);
  }
`

const POINTS_VERT = /* glsl */ `
  ${CURVE_GLSL}
  attribute float aU;
  attribute float aSeed;
  attribute float aSize;
  attribute float aKind;
  attribute vec2 aOff;
  uniform float uTime, uFlow, uScrollU, uRevealPx, uFadeIn, uFadeOut, uSpread,
    uSpreadEnds, uSpray, uBokeh, uDust, uWobble, uSize, uScale, uFocal, uDof,
    uDofSize, uTwinkle, uHeat, uAltShare;
  uniform vec3 uColMain, uColAlt, uColCore, uColDeep, uColSpark;
  varying vec3 vColor;
  varying float vBlur;
  void main() {
    float ph = aSeed * 6.2831;
    // stream (0) and spray (1) ride at speed; bokeh (2) and dust (3) drift
    float speed = (aKind < 1.5 ? 1.0 : 0.3) * (0.65 + 0.7 * fract(aSeed * 7.13));
    float u = fract(aU + uTime * uFlow * speed + uScrollU);
    float pinch = curveRow(u, 0.0).w;
    float spread = widthAt(u, pinch, uSpread, uSpreadEnds);
    if (aKind > 2.5) spread *= uDust;
    else if (aKind > 1.5) spread *= uBokeh;
    else if (aKind > 0.5) spread *= uSpray;
    vec2 o = aOff * spread
      + vec2(sin(uTime * 0.7 + ph), cos(uTime * 0.6 + ph * 1.3)) * uWobble;
    vec3 s = onSpine(u, o);
    s.z += position.z; // bokeh sits toward the camera, dust away from it
    float a = u * uLen;
    float fade = smoothstep(0.0, uFadeIn, a) * smoothstep(uLen, uLen - uFadeOut, a)
      * smoothstep(uRevealPx, uRevealPx - 220.0, a);
    float heat = pinch * (aKind < 1.5 ? 1.0 : 0.3);
    // a share of the motes carry the second hue
    vec3 hue = fract(aSeed * 3.77) < uAltShare ? uColAlt : uColMain;
    vec3 base = mix(uColDeep, hue, 0.55 + 0.45 * fract(aSeed * 5.31));
    vec4 mv = modelViewMatrix * vec4(toWorld(s), 1.0);
    float depth = -mv.z;
    float blur = clamp(abs(depth - (uCamZ - uFocal)) * uDof, 0.0, 1.0);
    if (aKind > 1.5 && aKind < 2.5) blur = max(blur, 0.8);
    vBlur = blur;
    float tw = 0.55 + 0.45 * sin(uTime * uTwinkle + ph);
    vec3 c = mix(base, uColCore, clamp(heat * 0.85, 0.0, 1.0)) * (1.0 + heat * uHeat);
    if (fract(aSeed * 13.7) < 0.05) c = uColSpark * 1.3;
    // a blurred mote spreads the same light over a bigger disc
    float spreadOut = 1.0 + blur * uDofSize;
    vColor = c * fade * tw / (spreadOut * spreadOut);
    gl_PointSize = uSize * aSize * uScale * (uCamZ / depth) * spreadOut;
    gl_Position = projectionMatrix * mv;
  }
`

const POINTS_FRAG = /* glsl */ `
  uniform float uBright;
  varying vec3 vColor;
  varying float vBlur;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    // sharp glint in focus, soft rimmed disc out of it
    float glint = exp(-r * r * 6.0);
    float disc = smoothstep(1.0, 0.6, r) * 0.5
      + smoothstep(0.5, 0.92, r) * (1.0 - smoothstep(0.9, 1.0, r)) * 0.55;
    gl_FragColor = vec4(vColor * mix(glint, disc, vBlur) * uBright, 1.0);
  }
`

const LINES_VERT = /* glsl */ `
  ${CURVE_GLSL}
  attribute float aU;
  attribute vec4 aStrand; // x normal offset, y depth offset, z phase, w end
  uniform float uTime, uRevealPx, uFadeIn, uFadeOut, uSpread, uSpreadEnds,
    uLineSpread, uLineWavelength, uLineWaveAmp, uLineWaveSpeed, uPulseGain,
    uLineBase, uHeat, uAltStrands;
  uniform vec3 uColMain, uColAlt, uColCore, uColDeep;
  varying vec3 vColor;
  varying vec3 vPulse;
  varying float vA;
  varying float vPhase;
  void main() {
    float u = aU;
    float a = u * uLen;
    float pinch = curveRow(u, 0.0).w;
    float spread = widthAt(u, pinch, uSpread, uSpreadEnds) * uLineSpread;
    float wave = sin(a / uLineWavelength * 6.2831 + aStrand.z + uTime * uLineWaveSpeed) * uLineWaveAmp;
    vec3 s = onSpine(u, vec2(aStrand.x + wave, aStrand.y) * spread);
    float fade = smoothstep(0.0, uFadeIn, a) * smoothstep(uLen * aStrand.w, uLen * aStrand.w - uFadeOut, a)
      * smoothstep(uRevealPx, uRevealPx - 260.0, a);
    // a share of the strands run in the second hue
    vec3 hue = fract(aStrand.z * 1.618) < uAltStrands ? uColAlt : uColMain;
    vec3 c = mix(mix(uColDeep, hue, 0.75), uColCore, pinch * 0.6);
    vColor = c * fade * uLineBase * (1.0 + pinch * uHeat);
    vPulse = c * fade * uPulseGain;
    // the pulse is placed per fragment from the arc length — per vertex it
    // hopped from vertex to vertex
    vA = a;
    vPhase = aStrand.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(toWorld(s), 1.0);
  }
`

const LINES_FRAG = /* glsl */ `
  uniform float uBright, uPulseSpacing, uPulseShift, uPulseSharp;
  varying vec3 vColor;
  varying vec3 vPulse;
  varying float vA;
  varying float vPhase;
  void main() {
    float p = fract((vA - uPulseShift) / uPulseSpacing + vPhase) - 0.5;
    float pulse = exp(-p * p * uPulseSharp * uPulseSharp);
    gl_FragColor = vec4((vColor + vPulse * pulse) * uBright, 1.0);
  }
`

/* ── host shims: Relay's page runtime (R.*) mapped onto this page ──────── */
const R = {
  isBot: () => /bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent),
  /** the loader curtain has fully closed (main.js dispatches gate:done) */
  onReleased: (fn) => {
    if (document.documentElement.classList.contains("is-done")) fn()
    else window.addEventListener("gate:done", () => fn(), { once: true })
  },
  frame: () => { const w = window.innerWidth; return w > 1080 ? 1440 : w > 720 ? 1024 : w > 480 ? 768 : 390 },  /* matches the CSS layout breakpoints */
  onFrame: (fn) => { let f = R.frame(); window.addEventListener("resize", () => { const n = R.frame(); if (n !== f) { f = n; fn() } }, { passive: true }) },
  ticker: { subscribe: (fn) => { let id = 0, on = true; const loop = (t) => { if (!on) return; fn(t); id = requestAnimationFrame(loop) }; id = requestAnimationFrame(loop); return () => { on = false; cancelAnimationFrame(id) } } },
  scrollY: () => window.scrollY,
  seen: (el, fn) => fn(),
}
const banner = (msg) => { if (window.console) console.warn("[stream]", msg) }

const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/* ── the path (stream-path.ts): waypoints anchored to the page's blocks ── */
/** Two Oaks path. The two arms are born inside the oak canopies of the banner
    painting and draw their light out of the leaves: hero waypoints use
    at/xAt "hero-art" — painting coordinates (the canopies sit near x 0.13 /
    0.87, y 0.36; the lettering spans x 0.39–0.61 down to y 0.60; the crest is
    at y ≈ 0.675). The main stream is the RIGHT arm: out of the right-hand oak,
    along its lower branches, across the grass to the meeting point just below
    the crest (the hot pinch), then — on desktop — down the empty gutter column
    between the headline and the side copy, so it never crosses a word. The
    LEFT arm (BRANCH) mirrors it out of the left-hand oak and melts in. */
const A = { at: "hero-art", xAt: "hero-art" }
const DESKTOP_ARMS = [
  { ...A, x: 0.88, y: 0.24, z: -1.6 },
  { ...A, x: 0.84, y: 0.44, z: -1.1 },
  { ...A, x: 0.76, y: 0.6, z: -0.7, pinch: 0.45 },
  { ...A, x: 0.62, y: 0.74, z: -0.3, pinch: 0.8 },
  { ...A, x: 0.5, y: 0.79, z: 0, pinch: 1 },
]
const PHONE_HERO = [
  { ...A, x: 0.86, y: 0.3, z: -2.0 },
  { ...A, x: 0.74, y: 0.7, z: -1.4, pinch: 0.5 },
  { ...A, x: 0.69, y: 0.78, z: -1.0, pinch: 0.6 },
  { ...A, x: 0.587, y: 0.8, z: -0.6, pinch: 0.9 },
  { ...A, x: 0.5, y: 0.81, z: 0, pinch: 1 },
  { ...A, x: 0.717, y: 0.98, z: -0.4, pinch: 0.7 },
  { at: "hero", x: 1.5, y: 0.9, z: -0.4 },
]
const HERO = {
  1440: [
    ...DESKTOP_ARMS,
    { at: "hero-copy", xAt: "hero-gutter", x: 0.5, y: -0.06, z: -0.1, pinch: 1 },
    { at: "hero-copy", xAt: "hero-gutter", x: 0.5, y: 1.02, z: -0.2, pinch: 1 },
  ],
  1024: [
    ...DESKTOP_ARMS,
    { at: "hero-media", x: 1.2, y: 1.15, z: -0.4 },
    { at: "hero", x: 1.4, y: 0.95, z: -0.4 },
  ],
  768: PHONE_HERO,
  390: PHONE_HERO,
}
/** The left arm, per frame: a mirror of the right arm out of the left-hand oak,
    ending at the meeting point plus one short step along the main stream's
    heading, so it dissolves into the main stream instead of stopping. */
const DESKTOP_BRANCH = [
  { ...A, x: 0.12, y: 0.24, z: -1.6 },
  { ...A, x: 0.16, y: 0.44, z: -1.1 },
  { ...A, x: 0.24, y: 0.6, z: -0.7, pinch: 0.45 },
  { ...A, x: 0.38, y: 0.74, z: -0.3, pinch: 0.8 },
  { ...A, x: 0.5, y: 0.79, z: 0, pinch: 1 },
  { ...A, x: 0.56, y: 0.83, z: -0.1 },
]
const PHONE_BRANCH = [
  { ...A, x: 0.14, y: 0.3, z: -2.0 },
  { ...A, x: 0.26, y: 0.7, z: -1.4, pinch: 0.5 },
  { ...A, x: 0.31, y: 0.78, z: -1.0, pinch: 0.6 },
  { ...A, x: 0.413, y: 0.8, z: -0.6, pinch: 0.9 },
  { ...A, x: 0.5, y: 0.81, z: 0, pinch: 1 },
  { ...A, x: 0.535, y: 0.85, z: -0.1 },
]
const BRANCH = { 1440: DESKTOP_BRANCH, 1024: DESKTOP_BRANCH, 768: PHONE_BRANCH, 390: PHONE_BRANCH }
/** Below the hero, shared by every frame: wide bends down the page, through
    the cross between the two oaks, and out through the left edge above the
    contact section. Every waypoint sits lower than the one before. */
const TAIL = [
  { at: "studio", x: 0.88, y: 0.35, z: -0.3 },
  { at: "studio", x: 0.7, y: 0.92, z: 0 },
  { at: "services", x: 0.08, y: 0.3, z: 0.2, pinch: 1 },
  { at: "work", x: 0.5, y: 0.02, z: -0.4 },
  { at: "work", x: 0.95, y: 0.55, z: 0.1, pinch: 0.8 },
  { at: "offer", x: 0.9, y: 0.32, z: -0.4 },
  { at: "offer", x: 0.55, y: 0.7, z: -0.2 },
  { at: "offer", x: 0.03, y: 0.98, z: 0.2, pinch: 1 },
  { at: "name", x: 0.5, y: 0.3, z: -0.6 },
  { at: "name", x: 0.5, y: 0.78, z: -0.4, pinch: 0.7 },
  { at: "team", x: 0.418, y: 0.5, z: 0.2, pinch: 1 },
  { at: "industries", x: 0.4, y: 0.55, z: -0.3 },
  { at: "values", x: 0.92, y: 0.3, z: 0 },
  { at: "values", x: 0.5, y: 0.8, z: 0 },
  { at: "values", x: -0.49, y: 1.02, z: 0 },
]
const PATH = {
  1440: [...HERO[1440], ...TAIL],
  1024: [...HERO[1024], ...TAIL],
  768: [...HERO[768], ...TAIL],
  390: [...HERO[390], ...TAIL],
}
/** Relay offset its form 200/1440 right of the waypoints; this path is drawn
    for a full-width column, so no shift. */
const SHIFT = 0

/** The block a section flows in: itself, or the parent of a sticky layer. */
const blockOf = (el) => {
  let block = el
  for (let node = el; node && node.tagName !== "MAIN"; node = node.parentElement) {
    if (getComputedStyle(node).position === "sticky" && node.parentElement) block = node.parentElement
  }
  return block
}
/** Document top, from layout offsets — immune to scroll-driven transforms. */
const docTop = (el) => {
  let y = 0
  for (let node = el; node; node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null) y += node.offsetTop
  return y
}
/** Waypoints → document px against the live layout. Points whose section is
    missing are skipped, so the stream survives a section being removed. */
/** Document left, from layout offsets — immune to transforms (Two Oaks). */
const docLeft = (el) => {
  let x = 0
  for (let node = el; node; node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null) x += node.offsetLeft
  return x
}
const resolvePath = (waypoints, main) => {
  const column = main.getBoundingClientRect()
  const points = []
  for (const { at, x, y, z, pinch = 0, xAt } of waypoints) {
    const section = document.getElementById(at)
    if (!section) continue
    const block = blockOf(section)
    /* Two Oaks: `xAt` measures x against another element's box (e.g. the empty
       gutter column in the hero) instead of the page column */
    let px = column.left + (x + SHIFT) * column.width
    if (xAt) {
      const el = document.getElementById(xAt)
      if (!el || !el.offsetWidth) continue
      px = docLeft(el) + x * el.offsetWidth   // layout box: immune to the banner's zoom + parallax
    }
    points.push({ x: px, y: docTop(block) + y * block.offsetHeight, z, pinch })
  }
  return points
}

/* ── orchestration (particle-stream.tsx) ───────────────────────────────── */
const COARSE = "(hover: none) and (pointer: coarse)"
const FINE = "(hover: hover) and (pointer: fine)"
const REDUCE = "(prefers-reduced-motion: reduce)"
/** The frame reduced motion shows: the stream fully drawn, frozen mid-flow. */
const STILL_MS = 24000
/** Frame budget: none — the stream draws on every display frame everywhere
    (a phone cap read as a choppy stream while scrolling); the phone pays with
    the low tier's cheaper frame instead. */
const NO_GAP = () => 0
/** The particle stream starts drawing itself in, with the hero's first node (LOAD.stream). */
const LOAD_STREAM = 416
const readTier = () => (window.matchMedia(COARSE).matches || window.innerWidth <= 900 ? "low" : "full")
const yieldToMain = () => new Promise((resolve) => {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout: 800 })
  else window.setTimeout(resolve, 0)
})
/** The four colour roles come from the `--stream-*` tokens. */
const readColors = (el) => {
  const style = getComputedStyle(el)
  const token = (name) => style.getPropertyValue(name).trim()
  return { colMain: token("--stream-main"), colAlt: token("--stream-alt"), colCore: token("--stream-core"), colDeep: token("--stream-deep"), colSpark: token("--stream-spark") }
}

/* ── a viewport height that does not follow the mobile toolbar (utils/stable-viewport.ts):
   the canvas is the LARGE viewport tall, measured once in CSS px; on a touch
   device a resize that keeps the width is the toolbar and is ignored, a
   rotation re-measures at once and again 300 ms later. */
const isTouchViewport = () => window.matchMedia("(pointer: coarse)").matches ||
  (navigator.maxTouchPoints > 0 && /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent))
const largeViewportHeight = () => {
  const probe = document.createElement("div")
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none"
  document.body.appendChild(probe)
  const lvh = probe.getBoundingClientRect().height
  probe.remove()
  return Math.round(Math.max(lvh, window.innerHeight))
}
const ROTATION_SETTLE_MS = 300
const stableViewport = (() => {
  let width = window.innerWidth, height = 0, timer
  const listeners = new Set()
  const publish = (h) => { if (h === height) return; height = h; listeners.forEach((l) => l()) }
  window.addEventListener("resize", () => {
    const w = window.innerWidth
    if (isTouchViewport() && w === width) return
    width = w
    publish(largeViewportHeight())
    clearTimeout(timer)
    timer = setTimeout(() => publish(largeViewportHeight()), ROTATION_SETTLE_MS)
  }, { passive: true })
  return { get: () => height, subscribe: (l) => { listeners.add(l); return () => listeners.delete(l) }, init: () => publish(largeViewportHeight()) }
})()

const canvas = document.getElementById("stream")
if (canvas && !R.isBot()) {
  /* the box: the CSS 100lvh until measured, then a locked px height */
  const lockBox = () => { const h = stableViewport.get(); if (h > 0) canvas.style.height = h + "px" }
  stableViewport.subscribe(lockBox)
  stableViewport.init()
  lockBox()
}
/* When the stream may start building: everywhere once the preloader has gone;
   on a desktop (full tier, fine pointer) already at `load`, under the
   preloader's last beat, so it is compiled and warm before the first scroll.
   It neither renders nor reveals before the preloader has gone. */
const whenBuildable = (start) => {
  let started = false
  const go = () => { if (started) return; started = true; start() }
  R.onReleased(go)
  if (readTier() === "full" && window.matchMedia(FINE).matches) {
    if (document.readyState === "complete") go()
    else window.addEventListener("load", go, { once: true })
  }
}
if (canvas && !R.isBot()) whenBuildable(() => {
  const THREE_URL = "assets/vendor/three/three.module.js"
  yieldToMain().then(() => Promise.all([
    import("three"),
    import("three/addons/postprocessing/EffectComposer.js"),
    import("three/addons/postprocessing/OutputPass.js"),
    import("three/addons/postprocessing/RenderPass.js"),
    import("three/addons/postprocessing/UnrealBloomPass.js"),
  ])).then(async ([T, { EffectComposer }, { OutputPass }, { RenderPass }, { UnrealBloomPass }]) => {
    const { AdditiveBlending, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DataTexture, FloatType, LineSegments, Mesh, NearestFilter, PerspectiveCamera, PlaneGeometry, Points, RGBAFormat, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } = T

    /** The scene: one renderer, one Points + one LineSegments draw, bloom,
        output pass. Sized for the full tier once; the low tier only narrows
        draw ranges and DPR (`retune`), so no program compiles after init. */
    class StreamScene {
      constructor(canvas, colors) {
        this.scene = new Scene()
        this.camera = new PerspectiveCamera(FOV, 1, 0.1, 60)
        this.curveData = new Float32Array(SAMPLES * 2 * 4)
        this.curve = new DataTexture(this.curveData, SAMPLES, 2, RGBAFormat, FloatType)
        this.shared = {
          uCurve: { value: this.curve },
          uHalfH: { value: HALF_H },
          uCamZ: { value: CAM_Z },
          uPx: { value: 1 },
          uLen: { value: 1 },
          uView: { value: new Vector3(1, 1, 0) },
          uTime: { value: 0 },
          uTimeS: { value: 0 },
          uTurnHold: { value: CONFIG.turnHold },
          uBreath: { value: CONFIG.breath },
          uBreathWave: { value: CONFIG.breathWavelength },
          uBreathSpeed: { value: CONFIG.breathSpeed },
          uRevealPx: { value: 0 },
          uFadeIn: { value: 120 },
          uFadeOut: { value: 400 },
          uSpread: { value: CONFIG.spread },
          uSpreadEnds: { value: CONFIG.spreadEnds },
          uHeat: { value: CONFIG.heat },
          uBright: { value: CONFIG.brightness },
          uColMain: { value: new Color() },
          uColAlt: { value: new Color() },
          uAltShare: { value: CONFIG.altShare },
          uColCore: { value: new Color() },
          uColDeep: { value: new Color() },
          uColSpark: { value: new Color() },
        }
        this.path = []
        this.tier = "full"
        this.width = 1
        this.height = 1
        this.unit = 1
        this.scrollY = 0
        this.lastScroll = Number.NaN
        this.scrollPx = 0
        this.revealStart = -1
        this.pointer = new Vector2()
        this.look = new Vector2()
        this.lastTime = -1

        this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" })
        this.renderer.setClearColor(0x000000, 1)
        this.camera.position.set(0, 0, CAM_Z)
        this.curve.magFilter = NearestFilter
        this.curve.minFilter = NearestFilter
        this.setColors(colors)

        this.pointsMat = new ShaderMaterial({
          uniforms: {
            ...this.shared,
            uFlow: { value: 0 },
            uScrollU: { value: 0 },
            uSpray: { value: CONFIG.spraySpread },
            uBokeh: { value: CONFIG.bokehSpread },
            uDust: { value: CONFIG.dustSpread },
            uWobble: { value: CONFIG.wobble },
            uSize: { value: CONFIG.size },
            uScale: { value: 1 },
            uFocal: { value: CONFIG.focal },
            uDof: { value: CONFIG.dof },
            uDofSize: { value: CONFIG.dofSize },
            uTwinkle: { value: CONFIG.twinkle },
          },
          vertexShader: POINTS_VERT,
          fragmentShader: POINTS_FRAG,
          blending: AdditiveBlending,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        })
        this.linesMat = new ShaderMaterial({
          uniforms: {
            ...this.shared,
            uPulseShift: { value: 0 },
            uPulseSharp: { value: CONFIG.pulseSharp },
            uAltStrands: { value: CONFIG.altStrands },
            uLineSpread: { value: CONFIG.lineSpread },
            uLineWavelength: { value: CONFIG.lineWavelength },
            uLineWaveAmp: { value: CONFIG.lineWaveAmp },
            uLineWaveSpeed: { value: CONFIG.lineWaveSpeed },
            uPulseSpacing: { value: CONFIG.pulseSpacing },
            uPulseGain: { value: CONFIG.pulseGain },
            uLineBase: { value: CONFIG.lineBase },
          },
          vertexShader: LINES_VERT,
          fragmentShader: LINES_FRAG,
          blending: AdditiveBlending,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        })

        this.points = new Points(this.buildPoints(), this.pointsMat)
        this.lines = new LineSegments(this.buildLines(), this.linesMat)
        this.points.frustumCulled = false
        this.lines.frustumCulled = false
        this.scene.add(this.lines, this.points)

        /* Two Oaks: the left arm. Its own spine texture and draws; every look
           uniform is the main stream's object by reference, so time, colour,
           size and parallax stay in step. Only the curve-bound values are its own. */
        this.branch = this.makeBranch()
        this.scene.add(this.branch.lines, this.branch.points)

        this.composer = new EffectComposer(this.renderer)
        this.composer.addPass(new RenderPass(this.scene, this.camera))
        this.bloom = new UnrealBloomPass(new Vector2(1, 1), CONFIG.bloomStr, CONFIG.bloomRadius, CONFIG.bloomThresh)
        this.composer.addPass(this.bloom)
        this.output = new OutputPass()
        this.composer.addPass(this.output)
      }

      /** The second spine (Two Oaks): same shaders, own curve, own draws. */
      makeBranch() {
        const data = new Float32Array(SAMPLES * 2 * 4)
        const tex = new DataTexture(data, SAMPLES, 2, RGBAFormat, FloatType)
        tex.magFilter = NearestFilter
        tex.minFilter = NearestFilter
        const own = { uCurve: { value: tex }, uLen: { value: 1 }, uFadeOut: { value: 260 }, uRevealPx: { value: 0 } }
        const opts = { blending: AdditiveBlending, transparent: true, depthTest: false, depthWrite: false }
        const pointsMat = new ShaderMaterial({
          ...opts,
          uniforms: { ...this.pointsMat.uniforms, ...own, uFlow: { value: 0 }, uScrollU: { value: 0 } },
          vertexShader: POINTS_VERT,
          fragmentShader: POINTS_FRAG,
        })
        const linesMat = new ShaderMaterial({
          ...opts,
          uniforms: { ...this.linesMat.uniforms, ...own },
          vertexShader: LINES_VERT,
          fragmentShader: LINES_FRAG,
        })
        const points = new Points(this.buildPoints(0x0a4c5e), pointsMat)
        const lines = new LineSegments(this.buildLines(0x7e0a), linesMat)
        points.frustumCulled = false
        lines.frustumCulled = false
        return { data, tex, own, pointsMat, linesMat, points, lines, path: [], length: 0 }
      }

      /** Particles: stream 79%, spray 14%, bokeh 3%, dust 4% — all ride the spine. */
      buildPoints(seedValue = 0x5eed1e) {
        const total = CONFIG.particles
        const rand = rng(seedValue)
        const gauss = () => rand() + rand() + rand() + rand() - 2
        const pos = new Float32Array(total * 3)
        const u = new Float32Array(total)
        const seed = new Float32Array(total)
        const size = new Float32Array(total)
        const kind = new Float32Array(total)
        const off = new Float32Array(total * 2)
        for (let i = 0; i < total; i++) {
          const pick = rand()
          const k = pick < 0.79 ? 0 : pick < 0.93 ? 1 : pick < 0.96 ? 2 : 3
          kind[i] = k
          u[i] = rand()
          seed[i] = rand()
          off[i * 2] = gauss() * 0.5
          off[i * 2 + 1] = gauss() * 0.5
          if (k === 0) size[i] = 0.35 + Math.pow(rand(), 4) * 2.4
          else if (k === 1) size[i] = 0.3 + rand() * 0.6
          else if (k === 2) {
            size[i] = 1.2 + rand() * 1.6
            pos[i * 3 + 2] = 1.0 + rand() * 1.4
          } else {
            size[i] = 0.25 + rand() * 0.4
            pos[i * 3 + 2] = -1.2 + rand() * 1.0
          }
        }
        const g = new BufferGeometry()
        g.setAttribute("position", new BufferAttribute(pos, 3))
        g.setAttribute("aU", new BufferAttribute(u, 1))
        g.setAttribute("aSeed", new BufferAttribute(seed, 1))
        g.setAttribute("aSize", new BufferAttribute(size, 1))
        g.setAttribute("aKind", new BufferAttribute(kind, 1))
        g.setAttribute("aOff", new BufferAttribute(off, 2))
        return g
      }

      /** Filaments: `strands` polylines along the spine, one draw as segments. */
      buildLines(seedValue = 0xf11a) {
        const n = CONFIG.strands
        const verts = n * (SEGMENTS + 1)
        const rand = rng(seedValue)
        const u = new Float32Array(verts)
        const strand = new Float32Array(verts * 4)
        const index = new Uint32Array(n * SEGMENTS * 2)
        let w = 0
        for (let s = 0; s < n; s++) {
          const nx = (rand() - 0.5) * 2
          const nz = (rand() - 0.5) * 1.2
          const phase = rand() * 6.2831
          const end = 0.93 + rand() * 0.07
          for (let i = 0; i <= SEGMENTS; i++) {
            const v = s * (SEGMENTS + 1) + i
            u[v] = i / SEGMENTS
            strand.set([nx, nz, phase, end], v * 4)
            if (i < SEGMENTS) { index[w++] = v; index[w++] = v + 1 }
          }
        }
        const g = new BufferGeometry()
        g.setAttribute("position", new BufferAttribute(new Float32Array(verts * 3), 3))
        g.setAttribute("aU", new BufferAttribute(u, 1))
        g.setAttribute("aStrand", new BufferAttribute(strand, 4))
        g.setIndex(new BufferAttribute(index, 1))
        return g
      }

      /** Bake the spine through the resolved waypoints: document px position,
          depth, the pinch profile and the in-page normal. */
      bakeCurve() {
        const length = this.bakeInto(this.path, this.curveData, this.curve)
        if (length) {
          this.shared.uLen.value = length
          this.shared.uFadeOut.value = Math.min(length / 4, 400 * this.unit)
          this.pointsMat.uniforms.uFlow.value = (CONFIG.flowPx * this.unit) / length
        }
        /* the left arm: a short fade at its end, so it melts into the knot */
        const b = this.branch
        b.length = this.bakeInto(b.path, b.data, b.tex)
        b.points.visible = b.lines.visible = b.length > 0
        if (b.length) {
          b.own.uLen.value = b.length
          b.own.uFadeOut.value = Math.min(b.length / 4, 260 * this.unit)
          b.pointsMat.uniforms.uFlow.value = (CONFIG.flowPx * this.unit) / b.length
        }
        this.rangeBranch()
      }
      /** The arm carries the same particle density per px as the main stream. */
      rangeBranch() {
        const b = this.branch
        const share = this.tier === "low" ? CONFIG.lowShare : 1
        const ratio = b.length && this.shared.uLen.value > 1 ? b.length / this.shared.uLen.value : 0.15
        b.points.geometry.setDrawRange(0, Math.floor(CONFIG.particles * share * Math.min(1, Math.max(0.08, ratio))))
        const strands = Math.ceil(CONFIG.strands * (this.tier === "low" ? 0.6 : 1))
        b.lines.geometry.setDrawRange(0, strands * SEGMENTS * 2)
      }
      /** One spine through its waypoints → its float texture; returns its length (0 if none). */
      bakeInto(path, data, tex) {
        if (path.length < 2) return 0
        const curve = new CatmullRomCurve3(path.map(({ x, y, z }) => new Vector3(x, y, z)), false, "centripetal")
        const length = Math.max(1, curve.getLength())
        const tangent = new Vector3()
        const samples = []
        const angles = []
        for (let i = 0; i < SAMPLES; i++) {
          const p = curve.getPointAt(i / (SAMPLES - 1))
          samples.push(p)
          curve.getTangentAt(i / (SAMPLES - 1), tangent)
          angles.push(Math.atan2(tangent.y, tangent.x))
        }
        const step = length / (SAMPLES - 1)
        const at = (i) => Math.min(SAMPLES - 1, Math.max(0, i))
        const radius = angles.map((_, i) => {
          let turn = Math.abs(angles[at(i + TURN_BASE)] - angles[at(i - TURN_BASE)])
          if (turn > Math.PI) turn = 2 * Math.PI - turn
          const r = (2 * TURN_BASE * step) / Math.max(1e-4, turn)
          return Math.min(TURN_OPEN, r / this.unit)
        })
        const slideMin = (values, reach) => values.map((_, i) => {
          let m = Infinity
          for (let j = i - reach; j <= i + reach; j++) { const v = values[at(j)]; if (v < m) m = v }
          return m
        })
        const slideMean = (values, reach) => values.map((_, i) => {
          let sum = 0
          for (let j = i - reach; j <= i + reach; j++) sum += values[at(j)]
          return sum / (2 * reach + 1)
        })
        const held = slideMean(slideMean(slideMin(radius, TURN_HOLD), TURN_SMOOTH), TURN_SMOOTH)
        angles.forEach((angle, i) => { data.set([-Math.sin(angle), Math.cos(angle), held[i], 0], (SAMPLES + i) * 4) })
        const peaks = path.filter(({ pinch }) => pinch > 0).map(({ x, y, pinch }) => {
          let best = 0, bestD = Infinity
          samples.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bestD) { bestD = d; best = i } })
          return { at: best / (SAMPLES - 1), pinch }
        })
        const reach = CONFIG.pinchReach * this.unit
        samples.forEach((p, i) => {
          const at = i / (SAMPLES - 1)
          let pinch = 0
          for (const peak of peaks) { const d = ((at - peak.at) * length) / reach; pinch = Math.max(pinch, peak.pinch * Math.exp(-d * d)) }
          data.set([p.x, p.y, p.z, pinch], i * 4)
        })
        tex.needsUpdate = true
        return length
      }

      /** Tint through the colour roles — never the shader. */
      setColors(colors) {
        this.shared.uColMain.value.set(colors.colMain)
        this.shared.uColAlt.value.set(colors.colAlt)
        this.shared.uColCore.value.set(colors.colCore)
        this.shared.uColDeep.value.set(colors.colDeep)
        this.shared.uColSpark.value.set(colors.colSpark)
      }
      setPath(path, branchPath = []) { this.path = path; this.branch.path = branchPath; this.bakeCurve() }
      /** Device tier: DPR and draw ranges only — never a define or a rebuild. */
      retune(tier) {
        this.tier = tier
        const share = tier === "low" ? CONFIG.lowShare : 1
        this.points.geometry.setDrawRange(0, Math.floor(CONFIG.particles * share))
        const strands = Math.ceil(CONFIG.strands * (tier === "low" ? 0.6 : 1))
        this.lines.geometry.setDrawRange(0, strands * SEGMENTS * 2)
        this.rangeBranch()
        this.resize(this.width, this.height)
      }
      /** Viewport size, CSS px. */
      resize(width, height) {
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        const dpr = Math.min(window.devicePixelRatio || 1, DPR[this.tier])
        this.renderer.setPixelRatio(dpr)
        this.renderer.setSize(this.width, this.height, false)
        this.composer.setPixelRatio(dpr)
        this.composer.setSize(this.width, this.height)
        const bloomScale = BLOOM_SCALE[this.tier]
        if (bloomScale !== 1) this.bloom.setSize(Math.ceil(this.width * dpr * bloomScale), Math.ceil(this.height * dpr * bloomScale))
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
        this.unit = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16
        this.pointsMat.uniforms.uScale.value = this.unit * dpr
        this.shared.uPx.value = this.unit / (this.height / 2)
        /* Two Oaks: a long fade-in (Relay: 120) so each arm materialises out of an oak canopy */
        this.shared.uFadeIn.value = 380 * this.unit
        const lines = this.linesMat.uniforms
        lines.uLineWavelength.value = CONFIG.lineWavelength * this.unit
        lines.uPulseSpacing.value = CONFIG.pulseSpacing * this.unit
        this.shared.uBreathWave.value = CONFIG.breathWavelength * this.unit
        this.bakeCurve()
      }
      /** Page scroll, CSS px: moves the view, and pushes the flow on either way. */
      setScroll(y) {
        if (!Number.isNaN(this.lastScroll)) this.scrollPx += Math.abs(y - this.lastScroll) * CONFIG.scrollFlow
        this.lastScroll = y
        this.scrollY = y
      }
      setPointer(x, y) { this.pointer.set(x, y) }
      /** Start the entrance: the stream draws itself in down the curve. */
      reveal(now, instant = false) { this.revealStart = instant ? now - CONFIG.revealMs : now }
      /** Compile every program and draw one (empty) frame before the reveal. */
      async prewarm() {
        /* compileAsync for every program, then the first draws in two tasks:
           the stream's own programs straight to the canvas (nothing revealed
           yet, so it draws black), then the composer's passes and targets */
        await this.renderer.compileAsync(this.scene, this.camera)
        const passes = new Scene()
        const quad = new PlaneGeometry(2, 2)
        const materials = [this.bloom.materialHighPassFilter, ...this.bloom.separableBlurMaterials, this.bloom.compositeMaterial, this.bloom.blendMaterial, this.output.material, this.composer.copyPass.material]
        for (const material of materials) passes.add(new Mesh(quad, material))
        await this.renderer.compileAsync(passes, this.camera)
        quad.dispose()
        await yieldToMain()
        this.renderer.render(this.scene, this.camera)
        await yieldToMain()
        this.render(performance.now())
      }
      render(now) {
        const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000))
        this.lastTime = now
        const k = 1 - Math.exp(-DAMP * dt)
        this.look.lerp(this.pointer, k)
        this.camera.position.set(-this.look.x * CONFIG.parallax, this.look.y * CONFIG.parallax, CAM_Z)
        this.camera.lookAt(0, 0, 0)
        const t = this.revealStart < 0 ? 0 : Math.min(1, (now - this.revealStart) / CONFIG.revealMs)
        this.shared.uRevealPx.value = t >= 1 ? REVEALED : easeOut(t) * CONFIG.revealPx * this.unit
        /* both arms draw in from their tops at once, so they meet on screen */
        this.branch.own.uRevealPx.value = this.shared.uRevealPx.value
        if (this.branch.length) this.branch.pointsMat.uniforms.uScrollU.value = (this.scrollPx / this.branch.length) % 1
        this.shared.uTime.value = now / 1000
        this.shared.uTimeS.value = (now / 1000) % 1000
        this.shared.uView.value.set(this.width / 2, this.height / 2, this.scrollY)
        const length = this.shared.uLen.value
        this.pointsMat.uniforms.uScrollU.value = (this.scrollPx / length) % 1
        const spacing = CONFIG.pulseSpacing * this.unit
        this.linesMat.uniforms.uPulseShift.value = ((now / 1000) * CONFIG.pulseSpeed * this.unit + this.scrollPx) % spacing
        this.composer.render(dt)
      }
      dispose() {
        this.points.geometry.dispose(); this.lines.geometry.dispose()
        this.pointsMat.dispose(); this.linesMat.dispose(); this.curve.dispose()
        const b = this.branch
        b.points.geometry.dispose(); b.lines.geometry.dispose()
        b.pointsMat.dispose(); b.linesMat.dispose(); b.tex.dispose()
        this.bloom.dispose(); this.composer.dispose(); this.renderer.dispose()
      }
    }

    /* build in steps, with the main thread handed back in between */
    await yieldToMain()
    let scene
    try { scene = new StreamScene(canvas, readColors(canvas)) } catch (e) { console.error("[relay] stream", e); return }
    await yieldToMain()
    scene.retune(readTier())
    scene.resize(canvas.clientWidth, canvas.clientHeight)
    scene.setScroll(window.scrollY)
    await scene.prewarm()

    const main = canvas.closest("main") || document.querySelector("main")  /* host: the canvas sits before <main> so it can pass under the hero banner */
    const reduce = window.matchMedia(REDUCE)
    const coarse = window.matchMedia(COARSE)
    const fine = window.matchMedia(FINE)

    /* the path follows the page: re-resolve on any layout size change */
    let placeRaf = 0
    const place = () => {
      cancelAnimationFrame(placeRaf)
      placeRaf = requestAnimationFrame(() => {
        const frame = R.frame()
        scene.setPath(resolvePath(PATH[frame], main), resolvePath(BRANCH[frame] || [], main))
        if (reduce.matches) scene.render(STILL_MS)
      })
    }
    place()
    new ResizeObserver(place).observe(main)
    R.onFrame(place)

    /* viewport size, device tier, pointer, and the loop */
    let tier = readTier()
    let stop = null
    let raf = 0
    let width = canvas.clientWidth
    let height = canvas.clientHeight
    let live = false
    const still = () => { scene.setScroll(window.scrollY); scene.reveal(STILL_MS, true); scene.render(STILL_MS) }
    const sync = () => {
      const run = live && !document.hidden && !reduce.matches
      if (run && !stop) {
        stop = R.ticker.subscribe((time) => { scene.setScroll(R.scrollY()); scene.render(time) }, NO_GAP)
      } else if (!run && stop) { stop(); stop = null }
      if (reduce.matches) still()
    }
    const onScroll = () => { if (!reduce.matches) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(still) }
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const next = readTier()
        const w = canvas.clientWidth, h = canvas.clientHeight
        if (next === tier && w === width && h === height) return
        width = w; height = h
        if (next !== tier) { tier = next; scene.retune(tier) }
        scene.resize(w, h)
        if (reduce.matches) still()
      })
    }
    const onPointer = (e) => {
      if (reduce.matches || e.pointerType !== "mouse") return
      scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    sync()
    window.addEventListener("resize", onResize)
    /* a rotation settles the locked height a beat after its resize event */
    stableViewport.subscribe(onResize)
    window.addEventListener("scroll", onScroll, { passive: true })
    if (fine.matches) window.addEventListener("pointermove", onPointer, { passive: true })
    coarse.addEventListener("change", onResize)
    reduce.addEventListener("change", sync)
    document.addEventListener("visibilitychange", sync)

    /* nothing renders, and the entrance waits, until the preloader has fully
       closed; then the stream draws itself in with the hero's load sequence */
    R.onReleased(() => {
      live = true
      sync()
      R.seen(canvas, () => {
        if (reduce.matches) return
        setTimeout(() => scene.reveal(performance.now()), LOAD_STREAM)
      })
    })
  }).catch((err) => {
    if (window.console) console.error("[relay]", err)
    banner("Scene assets failed to load — " + THREE_URL + " (" + err.message + "). The page stands without the stream.")
  })
})
