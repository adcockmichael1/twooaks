/* Flying Dust — GetLayers scene (id: flying-dust), adapted for Two Oaks Technologies.
   Source of truth: getlayers_materialize('flying-dust'). Only host chrome changed:
   canvas target, the tuning panel + localStorage removed, a ready event after the
   first drawn frame, the entrance (appearIn) held until the loader gate opens, the
   loop paused while the hero is off-screen, and CONFIG tinted emerald + gold.
   Motion, composition and shaders are untouched (contract: preserve motion, composition). */
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js'
import { CopyShader } from 'three/addons/shaders/CopyShader.js'

/* ============================================================
   CONFIG — the whole tint surface. Two Oaks: forest ground,
   gold + emerald corner flames, gold and sage motes.
============================================================ */
const CONFIG = {
  bgColor: '#04120b',
  flameColor: '#c9a55a',
  flameColor2: '#1f6b47',
  flameAmt: 0.42,
  dustCool: '#7f9a68',
  dustWarm: '#f2d58e',
  dustAlpha: 0.86,
  pointCount: 940,
  depth: 3.7,
  speed: 0.4
}

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- LAYERS / HELPERS / FINAL PASS ---------- */
const LAYERS = { NONE: 0, TORUS_SCENE: 1, BLOOM_SCENE: 2, ENTIRE_SCENE: 3 }

function hexToVec3(hex) {
  const n = parseInt(hex.slice(1), 16)
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const FinalPass = {
  uniforms: {
    iTime: { value: 0 },
    tDiffuse: { value: null }, torusTexture: { value: null }, bloomTexture: { value: null }, haloTexture: { value: null },
    uBg: { value: hexToVec3(CONFIG.bgColor) },
    uFlameA: { value: hexToVec3(CONFIG.flameColor) },
    uFlameB: { value: hexToVec3(CONFIG.flameColor2) },
    uFlameAmt: { value: CONFIG.flameAmt }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float iTime; uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; uniform sampler2D torusTexture; uniform sampler2D haloTexture;
    uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
    varying vec2 vUv;
    vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
      pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x);
      pos.y+=curv*sin(t+a*pos.z)+t*b; pos.z+=curv*cos(t+a*pos.y);
      pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
      return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
    void main(){
      vec2 uv = 2.*vUv - 1.;
      vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
      vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
      flame *= smoothstep(0.25, 1., abs(uv.y));
      float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
      vec3 bg = uBg * (1.0 - 0.4 * length(uv));
      vec3 halo = texture2D(haloTexture, vUv).xyz;
      gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(bloomTexture, vUv).xyz + texture2D(torusTexture, vUv).xyz + texture2D(tDiffuse, vUv).xyz + halo, 1.);
    }`
}

/* ---------- RENDERER / SCENE / CAMERA ---------- */
const canvas = document.getElementById('hero-scene')
let renderer
try {
  renderer = new THREE.WebGL1Renderer({ canvas, antialias: true })
} catch (e) {
  canvas.classList.add('is-fallback')
  window.dispatchEvent(new CustomEvent('scene:ready'))
  throw e
}
const DPR = Math.min(window.devicePixelRatio || 1, 2)
renderer.setPixelRatio(DPR)
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000); scene.fog = new THREE.Fog(0x000000, 0, 22)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 80)
camera.position.set(0, 0, 3)
camera.layers.enable(LAYERS.TORUS_SCENE); camera.layers.enable(LAYERS.BLOOM_SCENE); camera.layers.enable(LAYERS.ENTIRE_SCENE)
scene.add(camera)

/* ---------- COMPOSER ---------- */
const renderScene = new RenderPass(scene, camera)
const torusComposer = new EffectComposer(renderer); torusComposer.renderToScreen = false
torusComposer.addPass(renderScene)
torusComposer.addPass(new ShaderPass(GammaCorrectionShader))
torusComposer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.3, 0))
torusComposer.addPass(new ShaderPass(CopyShader))
const bloomComposer = new EffectComposer(renderer); bloomComposer.renderToScreen = false
bloomComposer.addPass(renderScene)
bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.7, 0))
bloomComposer.addPass(new ShaderPass(GammaCorrectionShader))
const finalPass = new ShaderPass(FinalPass)
finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget1.texture
finalPass.uniforms.torusTexture.value = torusComposer.renderTarget1.texture
const finalComposer = new EffectComposer(renderer)
finalComposer.addPass(renderScene); finalComposer.addPass(finalPass)

/* ============================================================
   SCENE: Fly-through dust points
============================================================ */
class FlyPoints {
  constructor(scene) {
    this.uniforms = {
      iTime:       { value: 0 },
      iShift:      { value: new THREE.Vector3() },
      iAlpha:      { value: 0 },
      iAnimation:  { value: new THREE.Vector3(0, 0, 0) },
      iResolution: { value: { x: window.innerWidth * DPR, y: window.innerHeight * DPR } },
      uDepth:      { value: CONFIG.depth },
      uCool:       { value: hexToVec3(CONFIG.dustCool) },
      uWarm:       { value: hexToVec3(CONFIG.dustWarm) }
    }
    this.rebuildGeometry(CONFIG.pointCount)

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        attribute float size;
        uniform float iTime;
        uniform vec3 iShift;
        uniform vec2 iResolution;
        uniform vec3 iAnimation;
        uniform float uDepth;
        varying float transparency;
        varying float warmness;
        vec3 warp3d(vec3 pos, float t) {
          float curv = 0.9, a = 1.9, b = 0.25, b2 = 0.03, c = 0.02;
          pos *= 2.;
          pos.x += curv * sin(c * t + a * pos.y) + t * b2;
          pos.y += curv * cos(c * t + a * pos.x);
          pos.z += curv * cos(c * t + a * pos.y);
          pos.z += curv * sin(c * t + a * pos.x) + t * b;
          pos.z = abs(pos.z);
          return pos.xyz;
        }
        void main() {
          vec3 v = warp3d(position, iTime);
          v = uDepth * (2. * fract(v + iShift) - 1.) + iAnimation;
          vec4 vpos = modelViewMatrix * vec4(v, 1.);
          transparency = step(length(v), uDepth);
          warmness = step(.75, fract(size * 7.13));
          gl_PointSize = size * iResolution.y / 1000. / -vpos.z;
          gl_Position = projectionMatrix * vpos;
        }`,
      fragmentShader: `
        varying float transparency; varying float warmness;
        uniform float iAlpha; uniform vec3 uCool; uniform vec3 uWarm;
        void main() {
          vec3 color = mix(uCool * .8, uWarm * .8, warmness);
          float tex = smoothstep(1., .3, length(2. * gl_PointCoord - 1.));
          gl_FragColor = vec4(tex * color, tex * transparency * iAlpha);
        }`,
      transparent: true
    })
    this.material.stencil = false
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.position.set(0, 0, -1)
    this.points.layers.enable(LAYERS.ENTIRE_SCENE)
    scene.add(this.points)
    this.scene = scene
  }

  rebuildGeometry(count) {
    if (this.geometry) this.geometry.dispose()
    this.geometry = new THREE.BufferGeometry()
    const positions = [], sizes = []
    for (let i = 0; i < count; i++) {
      positions.push(2 * Math.random() - 1, 2 * Math.random() - 1, 2 * Math.random() - 1)
      sizes.push(25 + 25 * Math.random())
    }
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    this.geometry.setAttribute('size',     new THREE.Float32BufferAttribute(sizes, 1))
    if (this.points) this.points.geometry = this.geometry
  }

  appearIn() {
    const start = performance.now(), dur = 2200
    const step = () => {
      const t = Math.max(0, Math.min(1, (performance.now() - start) / dur))
      const eased = t * t * t * (t * (t * 6 - 15) + 10)   // smootherstep
      this.uniforms.iAlpha.value = eased * CONFIG.dustAlpha
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  resize() {
    this.uniforms.iResolution.value.x = window.innerWidth * DPR
    this.uniforms.iResolution.value.y = window.innerHeight * DPR
  }

  render() {
    this.uniforms.iTime.value = performance.now() / 1000
    this.uniforms.iShift.value.add(camera.position.clone().multiplyScalar(0.0022 * CONFIG.speed))
  }
}

const flyPoints = new FlyPoints(scene)

/* ---------- CONFIG → uniforms ---------- */
function applyConfig() {
  finalPass.uniforms.uBg.value.copy(hexToVec3(CONFIG.bgColor))
  finalPass.uniforms.uFlameA.value.copy(hexToVec3(CONFIG.flameColor))
  finalPass.uniforms.uFlameB.value.copy(hexToVec3(CONFIG.flameColor2))
  finalPass.uniforms.uFlameAmt.value = CONFIG.flameAmt
  flyPoints.uniforms.uCool.value.copy(hexToVec3(CONFIG.dustCool))
  flyPoints.uniforms.uWarm.value.copy(hexToVec3(CONFIG.dustWarm))
  flyPoints.uniforms.uDepth.value = CONFIG.depth
}

/* ---------- RESIZE ---------- */
function resize() {
  const w = window.innerWidth, h = window.innerHeight
  renderer.setPixelRatio(DPR); renderer.setSize(w, h, false)
  camera.aspect = w / h; camera.updateProjectionMatrix()
  for (const c of [torusComposer, bloomComposer, finalComposer]) { c.setPixelRatio(DPR); c.setSize(w, h) }
  flyPoints.resize()
}
window.addEventListener('resize', resize); resize()

/* ---------- RENDER LOOP ---------- */
let active = true
function draw() {
  finalPass.uniforms.iTime.value = performance.now() / 1000
  flyPoints.render()
  camera.layers.set(LAYERS.TORUS_SCENE);  torusComposer.render()
  camera.layers.set(LAYERS.BLOOM_SCENE);  bloomComposer.render()
  camera.layers.set(LAYERS.ENTIRE_SCENE); finalComposer.render()
}
let announced = false
function render() {
  if (!REDUCED) requestAnimationFrame(render)
  if (!active || document.hidden) return
  draw()
  if (!announced) { announced = true; window.dispatchEvent(new CustomEvent('scene:ready')) }  // ready = ≥1 drawn frame
}
applyConfig()
render()

/* Host: pause while the hero is out of view (the canvas is fixed; the page tells us). */
window.addEventListener('scene:visibility', e => { active = !!e.detail })

/* Host: the scene's own entrance, started as the loader curtain begins to lift. */
function enter() {
  if (REDUCED) { flyPoints.uniforms.iAlpha.value = CONFIG.dustAlpha; draw(); return }
  flyPoints.appearIn()
}
if (document.documentElement.classList.contains('is-open')) enter()
else window.addEventListener('gate:open', enter, { once: true })
