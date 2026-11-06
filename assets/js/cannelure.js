/* Cannelure — GetLayers gradient (id: cannelure), adapted for Two Oaks Technologies.
   Source of truth: getlayers_materialize('cannelure'). Only host chrome was changed:
   canvas target + sizing, pointer mapped to the canvas box, the tuning panel and
   localStorage removed, and CONFIG colours tinted emerald + gold. Motion and the
   shader are untouched (contract: preserve motion, composition). */
;(() => {
/* ====== CONFIG ====== */
const CONFIG = {
  bgColor:  '#030b07',
  colorA:   '#071a11',
  colorB:   '#0d2e1f',
  colorC:   '#17503a',
  colorD:   '#2f7a55',
  colorE:   '#d9b66a',
  colorF:   '#1d5c41',

  scale:            2.15,
  speed:            0.33,      // the house value — the SAME in every gradient. Do not re-tune
                               // it per file; if it reads busy, thin the field, not the clock.
                               // see Architecture/Slow and Slick
  flow:             0.15,
  warp:             0.80,
  warpScale:        0.62,
  roughness:        0.45,
  lacunarity:       2.03,
  sharp:            1.70,      // how tightly each pigment holds its own territory
  spread:           0.70,      // anchors the colour masses to regions of the frame

  angle:            0.05,      // direction ACROSS the ruling, radians
  curve:            0.55,      // 0 = straight reeds, 1 = pure arcs about the centre below
  arcX:             1.90,
  arcY:            -0.35,
  pitch:            44.0,      // ribs per unit of the rib coordinate
  thick:            0.115,     // how far each lenslet throws the paint behind it
  ior:              1.46,
  edge:             14.0,       // eases each lenslet's throw to zero at the seam (see shader)
  wave:             0.014,     // slow organic wander in the ruling itself
  waveScale:        1.30,
  aa:               60.0,      // how hard sub-pixel ribs are faded out

  lightAim:         0.55,
  polish:           38.0,
  gleam:            0.26,
  seam:             0.30,      // shadow in the groove between two ribs

  contrast:         1.06,
  midpoint:         0.45,
  glow:             0.05,

  grain:            0,        // off by default — house grain, turn it up to taste

  grainAnim:        0,        // 0 static · 1 re-seeds the grain like film
  dither:           1.15,
  vignette:         0.17,

  cursor:           1,         // 1 follows the hand · 0 ignores it (fully ambient)

  pointerRadius:    0.52,
  pointerStrength:  0.20,      // the paint itself is pushed aside
  pointerBow:       0.075,     // the ribs bow around the finger — the main event
  wakeDrag:         0.085,     // and the trail drags the paint along behind it
  swell:            0.028,     // a ring of squeezed ribs travelling out of the trail
  swellFreq:        13.0,
  swellDamp:        2.30,
  pointerSheen:     0.055,
  parallax:         0.0023,

  maxDpr:           1.0       // 1× by default. raise it only if the look demands it
}

/* ====== COLOR PRESETS — 20 per gradient, grouped. Colours only, never effect knobs. ====== */
/* Role of each key: bgColor is the shadow down in the groove, A→D run deepest→lightest
   (D also tints the sheen), E and F are the two accents that hold the small hot masses. */
const PRESETS = {
  dark: {
    'Forest Glass':    { bgColor: '#08110d', colorA: '#0c1611', colorB: '#24503a', colorC: '#9db99a', colorD: '#eaf0dd', colorE: '#cf6535', colorF: '#c99640' },
    'Obsidian Flute':  { bgColor: '#050506', colorA: '#0b0c0f', colorB: '#23262e', colorC: '#6f7480', colorD: '#e9ecf2', colorE: '#8a94a8', colorF: '#c3c8d2' },
    'Nightshade':      { bgColor: '#070510', colorA: '#100a20', colorB: '#2b1a4d', colorC: '#6f5aa0', colorD: '#e6dcff', colorE: '#b06ad0', colorF: '#d8a0e8' },
    'Deep Cellar':     { bgColor: '#0a0705', colorA: '#140d08', colorB: '#37241a', colorC: '#8a6a52', colorD: '#f0e3d2', colorE: '#c2703a', colorF: '#d8a35c' }
  },
  cool: {
    'Sea Glass':       { bgColor: '#04100e', colorA: '#07201c', colorB: '#12574c', colorC: '#6fb0a4', colorD: '#e4f5ef', colorE: '#3fa8c8', colorF: '#9fd8cf' },
    'Cold Iris':       { bgColor: '#03060e', colorA: '#0a1226', colorB: '#1e3a7a', colorC: '#6f8fd0', colorD: '#e8f0ff', colorE: '#4f9fe8', colorF: '#a8c0f0' },
    'Glacier Flute':   { bgColor: '#060d12', colorA: '#0c1c26', colorB: '#1f5064', colorC: '#79b6c6', colorD: '#eefaff', colorE: '#4fc0d8', colorF: '#b0dfe8' },
    'Steel Rain':      { bgColor: '#070a0c', colorA: '#12181f', colorB: '#2e4250', colorC: '#7d95a6', colorD: '#eaf1f6', colorE: '#5f8ca8', colorF: '#a9c0ce' }
  },
  warm: {
    'Ember Reed':      { bgColor: '#0b0402', colorA: '#170804', colorB: '#4d1a0a', colorC: '#b05a2a', colorD: '#ffe3c2', colorE: '#e8451c', colorF: '#f0a038' },
    'Amber Flute':     { bgColor: '#0d0703', colorA: '#1c0f06', colorB: '#5a3312', colorC: '#b8813a', colorD: '#ffeed2', colorE: '#e07a20', colorF: '#f2c04e' },
    'Rosewood Glass':  { bgColor: '#0a0406', colorA: '#18080d', colorB: '#4f1622', colorC: '#b05a6a', colorD: '#ffe0dc', colorE: '#d84058', colorF: '#eb90a0' },
    'Terracotta':      { bgColor: '#0c0705', colorA: '#1d0f0a', colorB: '#5c2c1c', colorC: '#b87a5a', colorD: '#f8e6d4', colorE: '#d86038', colorF: '#e8a070' }
  },
  muted: {
    'Sage Clay':       { bgColor: '#0a0b09', colorA: '#161a14', colorB: '#3c4a36', colorC: '#93a888', colorD: '#eef1e2', colorE: '#b08a5a', colorF: '#c9b585' },
    'Ash Rose':        { bgColor: '#0a0709', colorA: '#171218', colorB: '#45303e', colorC: '#a5808f', colorD: '#f5e6e6', colorE: '#c07a86', colorF: '#d8a8ad' },
    'Dune':            { bgColor: '#0c0906', colorA: '#1a140e', colorB: '#4a3c2c', colorC: '#a8927a', colorD: '#f5ecdd', colorE: '#c09068', colorF: '#d4b894' },
    'Slate Plum':      { bgColor: '#08080b', colorA: '#14131a', colorB: '#383247', colorC: '#8b83a0', colorD: '#ece9f4', colorE: '#9a80b8', colorF: '#beb2d0' }
  },
  light: {
    'Porcelain':       { bgColor: '#d8d3c8', colorA: '#3a3630', colorB: '#9c9488', colorC: '#ded9cf', colorD: '#fbf8f2', colorE: '#b09878', colorF: '#cbb99a' },
    'Meadow Light':    { bgColor: '#ccd6c2', colorA: '#2c3f24', colorB: '#7f9a70', colorC: '#d4e0c8', colorD: '#f7fbf0', colorE: '#a8b878', colorF: '#c8d49a' },
    'Blush Paper':     { bgColor: '#e0cec4', colorA: '#4a2a22', colorB: '#b08a7a', colorC: '#edd9cd', colorD: '#fdf6f0', colorE: '#d09a80', colorF: '#e2bba4' },
    'Powder Light':    { bgColor: '#ccd8e4', colorA: '#1d3c5e', colorB: '#7f9db8', colorC: '#d8e4ee', colorD: '#f6fbff', colorE: '#9ab8d0', colorF: '#bed2e2' }
  }
}


/* ====== DEFAULTS + PERSISTENCE (loaded BEFORE anything is built) ====== */
const DEFAULTS = JSON.parse(JSON.stringify(CONFIG))
const STORAGE_KEY = 'getlayers:cannelure'
/* Opened on its own, this file remembers what you rolled: ⟳ reload comes back to it and
   ↺ reset throws it away. Embedded in the gallery it must NOT — there the file is what is
   being looked at, and a look remembered in this browser would beat the file itself: the
   card's still would be the saved defaults while its live preview showed something else
   entirely. Only ⤓ preview changes what this gradient is, and it changes the file. */
const OWN_WINDOW = false  /* Two Oaks: never persist tuned looks in production */
try { const s = OWN_WINDOW && JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (s) for (const k in s) if (k in CONFIG) CONFIG[k] = s[k] } catch (e) {}
function saveConfig() { if (!OWN_WINDOW) return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(CONFIG)) } catch (e) {} }

function hexToVec3(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/* ====== GL BOILERPLATE (frozen chrome — do not edit per gradient) ====== */
const canvas = document.getElementById('cannelure')
if (!canvas) throw new Error('no cannelure canvas')
const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
if (!gl) {
  canvas.classList.add('is-fallback')
  throw new Error('no webgl2')
}

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

/* ====== THE SHADER — ⭐ the only part that changes between gradients ====== */
/* Cannelure: a painting behind fluted glass.
 *
 * Two ideas stacked. Underneath, a wet painterly field — six pigments blended by a
 * partition of unity, so the canvas has TERRITORIES (a green mass, a cream diagonal,
 * a small hot one) instead of a single ramp coordinate, and no boundary anywhere is
 * hard. Over it, a ruling of half-cylinder lenslets whose axis is CURVED: each rib
 * refracts the paint behind it, so the image is sliced into fine striations that
 * squeeze and offset per rib, and every rib carries its own specular line and its own
 * shadow in the groove.
 *
 * The cursor is not a light and not a blob: it BOWS THE RULING. The gaussian bump is
 * added to the rib coordinate and its exact analytic gradient is added to the
 * displacement direction, so the ribs bend around the finger and the paint they carry
 * bends with them. Everything else the pointer does — pushing the pigment aside,
 * dragging a wake, sending a swell out of the tail — rides on a three-link follower
 * chain, which is where the inertia and the trails come from.
 */
const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2  iResolution;
uniform float iTime;
uniform vec2  iMouse;          // head of the trail — smoothed pointer, same space as uv
uniform vec2  iLag;            // one follower behind it
uniform vec2  iTail;           // and one behind that: about a second of history, no arrays
uniform float iEnergy;         // how disturbed the surface is — charges fast, calms over ~2 s
uniform float iIntro;          // 0→1 once the pointer is first seen, so nothing pops in

uniform vec3  uBg, uColorA, uColorB, uColorC, uColorD, uColorE, uColorF;
uniform float uScale, uSpeed, uFlow, uWarp, uWarpScale, uRoughness, uLacunarity, uSharp, uSpread;
uniform float uAngle, uCurve, uArcX, uArcY, uPitch, uThick, uIor, uEdge, uWave, uWaveScale, uAA;
uniform float uLightAim, uPolish, uGleam, uSeam;
uniform float uContrast, uMidpoint, uGlow;
uniform float uGrain, uDither, uVignette;
uniform float uPointerRadius, uPointerStrength, uPointerBow, uWakeDrag;
uniform float uSwell, uSwellFreq, uSwellDamp, uPointerSheen, uParallax;

#define OCTAVES 4

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float snoise(vec2 p) {
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
  return dot(n, vec3(70.0));
}

float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    v += amp * snoise(p);
    p *= uLacunarity;
    amp *= uRoughness;
  }
  return v;
}

/* ---- the paint behind the glass -------------------------------------------------
   Six pigments live at fixed anchors in a 2-D mixing plane; two domain-warped noise
   fields say where in that plane this pixel sits. Each pigment's weight is a gaussian
   around its anchor and the six are normalised, so every point on screen is a blend of
   ALL six — a partition of unity cannot produce a hard edge, only a region where one
   pigment happens to dominate. That is what gives painterly masses rather than a ramp.
   The per-pigment mass term is what keeps the two accents small and the greens broad. */
vec3 paint(vec2 q, float t) {
  vec2 w = vec2(fbm(q * uWarpScale + vec2(0.0, t * uFlow)),
                fbm(q * uWarpScale + vec2(4.7, 2.1) - t * uFlow * 0.83));
  vec2 pp = q + uWarp * w;

  // opposite time signs, so the mixing plane churns in place instead of panning
  vec2 c = vec2(fbm(pp + vec2(0.0, t * 0.11)),
                fbm(pp * 1.27 + vec2(3.1, -1.7) - t * 0.09)) * 2.2;
  c += q * uSpread;

  vec3 acc = vec3(0.0);
  float wsum = 1e-5;
  #define PIG(COL, AX, AY, M) { vec2 dd = c - vec2(AX, AY); float wq = (M) * exp(-dot(dd, dd) * uSharp); acc += (COL) * wq; wsum += wq; }
  PIG(uColorA, -0.80, -0.50, 1.00)
  PIG(uColorB, -0.10, -0.88, 1.00)
  PIG(uColorC,  0.62, -0.20, 0.94)
  PIG(uColorD,  0.86,  0.62, 1.00)
  PIG(uColorE, -0.64,  0.72, 0.52)
  PIG(uColorF,  0.06,  1.02, 0.46)
  #undef PIG
  return acc / wsum;
}

// triangular-PDF dither — the only reliable cure for 8-bit gradient banding
float triDither(vec2 fc) {
  float a = hash1(fc);
  float b = hash1(fc + 17.0);
  return (a + b - 1.0) / 255.0;
}


// ---- house grain. ONE look across the collection: an integer hash (no sin() streaks),
// triangular so it reads as film rather than static, weighted into the midtones so it
// never crusts a black or a white. Static by default; uGrainAnim re-seeds it 24×/s.
uniform float uGrainAnim;
float houseGrain(vec2 fc) {
  uvec2 q = uvec2(fc) * uvec2(1597334677u, 3812015801u)
          + uint(floor(iTime * 24.0 * uGrainAnim)) * 2654435769u;
  uint n = q.x ^ q.y; n = n * 1664525u + 1013904223u; n ^= n >> 16u; n *= 2246822519u; n ^= n >> 13u;
  float a = float(n & 0xffffu) / 65535.0;
  n *= 3266489917u; n ^= n >> 16u;
  float b = float(n & 0xffffu) / 65535.0;
  return a + b - 1.0;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution) / iResolution.y;
  float t = iTime * uSpeed;

  /* ---- the pointer as a finger laid on the glass ---------------------------------
     Three lagged followers stand in for a history buffer: the head is where the finger
     is, the tail is about a second behind it. Summing a gaussian at each gives a trail
     that is tight at the front and broad at the back, and that collapses to one soft
     disc when everything catches up. Nothing reads the pointer's instantaneous
     velocity, which is the usual source of jitter — a dropped frame or a 1000 px flick
     only changes how far apart the links are, and they are all exponential, so the
     shape can never step. */
  float rr = max(1e-4, uPointerRadius * uPointerRadius);
  vec2  dh = uv - iMouse;
  vec2  dm = uv - iLag;
  vec2  dt2 = uv - iTail;

  float head = exp(-dot(dh, dh) / rr);
  float wake = (head
              + exp(-dot(dm, dm) / (rr * 1.9)) * 0.70
              + exp(-dot(dt2, dt2) / (rr * 3.4)) * 0.45) * iIntro;

  vec2  stroke = iMouse - iTail;
  float sl = length(stroke);
  vec2  sdir = sl > 1e-4 ? stroke / sl : vec2(0.0);     // guarded: no normalize() at the origin

  /* ---- the ruling ----------------------------------------------------------------
     phi is the rib coordinate. Blending a linear ruling with the radius about a centre
     parked off-frame is what makes the reeds ARC across the picture instead of running
     dead straight — and because both terms have a closed-form gradient, the direction
     to refract along stays exact. */
  vec2  lax = vec2(cos(uAngle), sin(uAngle));
  vec2  cen = vec2(uArcX, uArcY);
  vec2  rel = uv - cen;
  float arc = max(1e-4, length(rel));

  /* The radius has to be counted in the same direction the linear ruling runs, or the two
     gradients subtract instead of blending: with the centre off to the right, the radial
     gradient points LEFT everywhere while the linear one points right, and at curve ≈ 0.5
     they cancel to nothing down one side of the frame — a band with no ribs in it at all.
     The sign is taken from the centre, not from the pixel, so it is one constant per frame
     and can never flip across the picture and crease it. */
  float sgn = dot(cen, lax) > 0.0 ? -1.0 : 1.0;
  float phi = mix(dot(uv, lax), sgn * arc, uCurve);
  vec2  gdir = mix(lax, sgn * rel / arc, uCurve);

  // a slow wander in the ruling itself, so the glass is hand-made rather than extruded
  phi += fbm(uv * uWaveScale + vec2(0.0, t * 0.35)) * uWave;

  /* The finger BOWS the ruling. Adding the gaussian to phi bends the ribs around the
     cursor; adding its exact analytic gradient to gdir means the paint is thrown along
     the bent rib rather than the straight one it would otherwise follow. That second
     half is the whole reason this reads as pressing on glass instead of as a spotlight. */
  float bow = uPointerBow * head * iIntro;
  phi  += bow;
  gdir += dh * (-2.0 * bow / rr);

  /* A swell travelling out of the tail — a ring of ribs squeezed together, born where
     the finger WAS and released over about two seconds, so the glass keeps moving after
     the hand stops. */
  float rl = length(dt2);
  float ring = sin(rl * uSwellFreq - iTime * 2.1) * exp(-rl * uSwellDamp)
             * smoothstep(0.0, 0.10, rl) * iEnergy * iIntro;
  phi  += ring * uSwell;
  gdir += dt2 * (ring * uSwell * uSwellFreq / (rl + 0.10));

  float g2 = dot(gdir, gdir);
  gdir = g2 > 1e-12 ? gdir * inversesqrt(g2) : lax;     // exactly guarded, never a NaN

  float ribs = phi * uPitch;
  float cell = fract(ribs) - 0.5;

  /* Ribs that outrun the pixel grid have to stop being drawn or they alias into moire.
     fwidth is ribs-per-pixel, and crisp fades the displacement, the specular and the
     groove shadow at exactly the rate the ruling becomes unresolvable — so cranking
     pitch dissolves the glass into a smooth sheet instead of into interference. */
  float aa = fwidth(ribs);
  float crisp = 1.0 / (1.0 + aa * aa * uAA);

  /* Each rib is a half-cylinder lenslet. sin(theta) of the surface normal is just the
     lateral position across the rib, so the refracted bend is Snell in closed form and
     the throw is thickness * tan(bend) — largest toward the rib edges, zero at its crown,
     which is what squeezes a whole slice of the painting into every rib.

     The taper is not decoration. Raw tan(bend) peaks at the rib EDGE and flips sign
     across it, so consecutive ribs throw the paint in opposite directions and the seam
     between them draws a hard black line right across the picture — the one thing a
     gradient must never have. Easing the throw back to zero at the seam makes the
     displacement continuous across the whole ruling while leaving the crown of each rib
     at full strength, so the slicing survives and the line does not. */
  float sn = clamp(cell * 2.0, -0.999, 0.999);
  float th = asin(sn);
  float bend = th - asin(clamp(sn / max(1.02, uIor), -0.999, 0.999));
  float taper = 1.0 - pow(abs(sn), max(1.0, uEdge));
  float disp = uThick * tan(bend) * taper * crisp;

  /* ---- sample the painting through the glass ---- */
  vec2 ruv = uv + gdir * disp;
  vec2 q = (ruv - iMouse * uParallax) * uScale;
  q += dh * (uPointerStrength * head * iIntro);                 // d * falloff, never normalize(d)
  q -= sdir * (wake * uWakeDrag * min(sl * 2.6, 1.0));          // and the stroke drags it along

  vec3 col = paint(q, t);

  /* ---- the glass's own light ----
     One specular line down the crown of every rib, and a shadow where two ribs meet.
     The groove shadow is where bgColor actually lives, which is why it reads as a
     colour rather than as black. */
  vec3 N = normalize(vec3(gdir * sn * crisp, sqrt(max(0.0, 1.0 - sn * sn))));
  vec3 L = normalize(vec3(cos(uLightAim), sin(uLightAim), 0.62));
  float spec = pow(max(dot(N, L), 0.0), max(1.0, uPolish));

  float groove = abs(sn) * crisp;
  float shade = 1.0 - uSeam * groove * groove;
  col = mix(uBg, col, 0.10 + 0.90 * shade);

  // the sheen is gated by energy: a resting finger leaves a whisper, a moving one a trail
  col += uColorD * (spec * uGleam * crisp);
  col += uColorD * (wake * uPointerSheen * (0.30 + 0.70 * iEnergy));

  /* Contrast is taken in COLOUR, not on a ramp coordinate — there is no single scalar
     here to push, and pushing the blend weights instead would harden the territory
     edges, which is the one thing this must not do. */
  col = (col - uMidpoint) * uContrast + uMidpoint;
  col += uColorD * uGlow * pow(max(dot(col, vec3(0.299, 0.587, 0.114)), 0.0), 5.0);

  col *= 1.0 - uVignette * dot(uv, uv);
  /* grain is STATIC per pixel. Reseeding it on a clock puts a full-frame change into
     every idle frame — a 1/255 shimmer that is the only thing moving when the page is
     at rest, and it reads as flicker. A fixed texture breaks up flatness for free. */
  { float hgL = clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    col += houseGrain(gl_FragCoord.xy) * uGrain * mix(1.0, 4.0 * hgL * (1.0 - hgL), 0.6); }
  col += triDither(gl_FragCoord.xy) * uDither;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

function compile(type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
  return sh
}

const program = gl.createProgram()
gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
gl.linkProgram(program)
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
gl.useProgram(program)
gl.bindVertexArray(gl.createVertexArray())

const LOC = {}
const loc = n => (n in LOC ? LOC[n] : (LOC[n] = gl.getUniformLocation(program, n)))
const u1f = (n, v) => gl.uniform1f(loc(n), v)
const u2f = (n, x, y) => gl.uniform2f(loc(n), x, y)
const u3c = (n, hex) => { const c = hexToVec3(hex); gl.uniform3f(loc(n), c[0], c[1], c[2]) }

/* ====== CONFIG → UNIFORMS ====== */
function applyConfig() {
  gl.useProgram(program)
  u3c('uBg', CONFIG.bgColor)
  u3c('uColorA', CONFIG.colorA)
  u3c('uColorB', CONFIG.colorB)
  u3c('uColorC', CONFIG.colorC)
  u3c('uColorD', CONFIG.colorD)
  u3c('uColorE', CONFIG.colorE)
  u3c('uColorF', CONFIG.colorF)
  u1f('uScale', CONFIG.scale)
  u1f('uSpeed', CONFIG.speed)
  u1f('uFlow', CONFIG.flow)
  u1f('uWarp', CONFIG.warp)
  u1f('uWarpScale', CONFIG.warpScale)
  u1f('uRoughness', CONFIG.roughness)
  u1f('uLacunarity', CONFIG.lacunarity)
  u1f('uSharp', CONFIG.sharp)
  u1f('uSpread', CONFIG.spread)
  u1f('uAngle', CONFIG.angle)
  u1f('uCurve', CONFIG.curve)
  u1f('uArcX', CONFIG.arcX)
  u1f('uArcY', CONFIG.arcY)
  u1f('uPitch', CONFIG.pitch)
  u1f('uThick', CONFIG.thick)
  u1f('uIor', CONFIG.ior)
  u1f('uEdge', CONFIG.edge)
  u1f('uWave', CONFIG.wave)
  u1f('uWaveScale', CONFIG.waveScale)
  u1f('uAA', CONFIG.aa)
  u1f('uLightAim', CONFIG.lightAim)
  u1f('uPolish', CONFIG.polish)
  u1f('uGleam', CONFIG.gleam)
  u1f('uSeam', CONFIG.seam)
  u1f('uContrast', CONFIG.contrast)
  u1f('uMidpoint', CONFIG.midpoint)
  u1f('uGlow', CONFIG.glow)
  u1f('uGrain', CONFIG.grain)
  u1f('uGrainAnim', CONFIG.grainAnim)
  u1f('uDither', CONFIG.dither)
  u1f('uVignette', CONFIG.vignette)
  u1f('uPointerRadius', CONFIG.pointerRadius)
  u1f('uPointerStrength', CONFIG.pointerStrength)
  u1f('uPointerBow', CONFIG.pointerBow)
  u1f('uWakeDrag', CONFIG.wakeDrag)
  u1f('uSwell', CONFIG.swell)
  u1f('uSwellFreq', CONFIG.swellFreq)
  u1f('uSwellDamp', CONFIG.swellDamp)
  u1f('uPointerSheen', CONFIG.pointerSheen)
  u1f('uParallax', CONFIG.parallax)
  resize()
}

/* ====== RESIZE ====== */
let dpr = 1
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr)
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  gl.viewport(0, 0, w, h)
  gl.useProgram(program)
  u2f('iResolution', w, h)
}
/* Coalesced to one resize per frame. A window drag or a phone rotation fires resize far
   faster than the display refreshes, and every raw call reallocates the drawing buffer and
   re-uploads iResolution — that burst is the hitch you feel while dragging an edge. */
let resizeQueued = false
addEventListener('resize', () => {
  if (resizeQueued) return
  resizeQueued = true
  requestAnimationFrame(() => { resizeQueued = false; resize() })
}, { passive: true })

/* ====== POINTER (a handful of scalars — the only per-frame CPU maths allowed) ====== */
/* Six position scalars plus an energy term. The gaps between the links ARE the wake; the
   energy is what the glass remembers after you stop. No history buffer, no array work. */
const P = { tx: 0, ty: 0, hx: 0, hy: 0, mx: 0, my: 0, sx: 0, sy: 0, e: 0 }
let seeded = false
/* One handler for both events, and it does exactly one job: write the target. Everything
   that moves is integrated in the render loop, so a flick that fires forty events inside a
   single frame costs the same as one that fires one — and a touch aims on contact instead
   of staying dead until the first drag. */
const aim = e => {
  const r = canvas.getBoundingClientRect()
  const a = r.width / Math.max(1, r.height)
  P.tx = ((e.clientX - r.left) / r.width - 0.5) * a
  P.ty = (0.5 - (e.clientY - r.top) / r.height)
  if (!seeded) {                                   // first sighting: start there, do not fly across
    seeded = true
    P.hx = P.mx = P.sx = P.tx
    P.hy = P.my = P.sy = P.ty
  }
}
addEventListener('pointermove', aim, { passive: true })
addEventListener('pointerdown', aim, { passive: true })

/* ====== RENDER LOOP ====== */
/* The loop does exactly four things: step the pointer followers by elapsed time, upload a
   handful of uniforms, draw one triangle, tick the fps readout. Everything else is the
   shader's job. */
const fadeEl = { style: {} }
const fpsEl = {}

let visible = true
new IntersectionObserver(es => { visible = es[0].isIntersecting }, { threshold: 0 }).observe(canvas)

const t0 = performance.now()
let prevT = t0, clock = 0, fpsT = t0, fpsN = 0, intro = 0
function frame(now) {
  requestAnimationFrame(frame)

  /* PACING — one clamped interval drives everything below it. The shader clock is
     accumulated from that SAME clamped interval rather than read off the wall: rAF stops
     in a background tab but wall time does not, and handing the shader that gap is exactly
     what makes a field lurch on the way back. Clamped, an alt-tab costs a pause, never a
     jump — and the same guard covers a long main-thread stall. */
  const raw = now - prevT
  prevT = now
  if (!visible || document.hidden) return
  const ms = raw > 50 ? 50 : raw < 4.167 ? 4.167 : raw
  const dt = ms * 0.001
  clock += dt

  /* Every smoothing term is 1 - e^(-rate·dt), not a fixed per-frame fraction. A constant
     fraction makes the trail half as long on a 120 Hz display and lurch whenever a frame
     runs long; this form gives the identical curve at any refresh rate. Three rates, so
     the chain swings through a direction change and coasts for a beat after the hand
     stops instead of hinging on the corner. */
  const kh = 1 - Math.exp(-6.0 * dt)               // head: still clearly behind the cursor
  const km = 1 - Math.exp(-2.6 * dt)               // middle of the trail
  const ks = 1 - Math.exp(-1.25 * dt)              // tail: about a second of memory
  P.hx += (P.tx - P.hx) * kh; P.hy += (P.ty - P.hy) * kh
  P.mx += (P.hx - P.mx) * km; P.my += (P.hy - P.my) * km
  P.sx += (P.mx - P.sx) * ks; P.sy += (P.my - P.sy) * ks

  /* How far the head runs ahead of the tail IS the stroke — already filtered, unlike a
     per-frame velocity. It charges the energy quickly and bleeds it slowly, so a flick
     sets the glass ringing and a still cursor lets it settle. */
  const ex = P.hx - P.sx, ey = P.hy - P.sy
  const want = Math.min(Math.sqrt(ex * ex + ey * ey) * 5.5, 1)
  P.e += (want - P.e) * (1 - Math.exp(-(want > P.e ? 5.0 : 0.40) * dt))
  intro += ((seeded ? 1 : 0) - intro) * (1 - Math.exp(-3.3 * dt))

  u1f('iTime', clock)
  u1f('iIntro', intro)
  u1f('iEnergy', P.e)
  /* cursor 0: the hand is ignored and the pointer eases back to where it rested — the
     gradient goes fully ambient. Nothing else changes, so it can be flipped live. */
  P.rest === undefined ? (P.rest = { x: P.tx, y: P.ty }) : 0
  if (!CONFIG.cursor) { P.tx = P.rest.x; P.ty = P.rest.y }
  u2f('iMouse', P.hx, P.hy)
  u2f('iLag', P.mx, P.my)
  u2f('iTail', P.sx, P.sy)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  fpsN++
  if (now - fpsT > 500) {
    fpsEl.textContent = Math.round(fpsN * 1000 / (now - fpsT)) + ' fps · ' + dpr.toFixed(1) + '×'
    fpsT = now; fpsN = 0
  }
}

applyConfig()
gl.drawArrays(gl.TRIANGLES, 0, 3)        // one draw before the reveal, so we never fade onto a blank canvas
fadeEl.style.opacity = 0
/* Two Oaks: reduced motion keeps the single still frame drawn above */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(frame)

})()
