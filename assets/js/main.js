/* =====================================================================
   Two Oaks Technologies — page choreography
   loader → gate → staggered reveal → stream entrance, then one scroll clock.
   ===================================================================== */
;(() => {
  'use strict'

  const root = document.documentElement
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s))
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const SVGNS = 'http://www.w3.org/2000/svg'
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  const year = $('#year'); if (year) year.textContent = new Date().getFullYear()

  /* =====================================================================
     CLIENTS — add a client here after the build.
     { name, person?, does, services: [...], city, url } — leave url "" to
     show the name without a link; an http(s) URL adds a "Visit the site" link.
     ===================================================================== */
  const CLIENTS = [
    { name: 'Wholesale Jewelry & Loans', does: 'Family-owned local jewelry store with hundreds of unique pieces.', services: ['Website hosting', 'Local SEO', 'Google Business Profile', 'Social media'], city: 'Huntsville, AL', url: '' },
    { name: 'Rocket City Nutrition', does: 'Premium drink shop with hundreds of options.', services: ['Website + online menu', 'Square integration', 'Hosting', 'Social media'], city: 'Huntsville, AL', url: '' },
    { name: 'McCartha Law, LLC', does: 'Law firm — LLC formation, estate planning, and related services.', services: ['Website', 'Local SEO', 'Google Business Profile', 'Google Ads', 'Social media'], city: 'Huntsville, AL', url: '' },
    { name: 'Honey & Co', does: 'Premium drink shop with hundreds of options.', services: ['Website + online menu', 'Square integration', 'Hosting'], city: 'North Alabama', url: '' },
    { name: 'Irish Sentinel', person: 'Bradly Irish · CISSP · PMP · LCCA · CCP', does: 'Cybersecurity consulting — security assessments and fractional system security personnel.', services: ['Website design & build'], city: 'Huntsville, AL', url: 'https://irishsentinel.net/' },
    { name: 'Jess Nuckols', does: 'Realtor serving North Alabama.', services: ['Social media'], city: 'North Alabama', url: '' },
  ]
  const ledger = $('#ledger')
  if (ledger) {
    ledger.innerHTML = CLIENTS.map((c, i) => {
      const safe = /^https?:\/\//i.test(c.url || '') ? esc(c.url) : ''
      const link = safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">Visit the site →</a>` : ''
      return `<li data-reveal style="--d:${i * 70}ms">
        <span class="ledger__n">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="ledger__name">${esc(c.name)}${c.person ? `<span class="ledger__person">${esc(c.person)}</span>` : ''}</h3>
        <p class="ledger__does">${esc(c.does)}</p>
        <div class="ledger__chips">${c.services.map(s => `<span>${esc(s)}</span>`).join('')}</div>
        <p class="ledger__city">${esc(c.city)}${link}</p>
      </li>`
    }).join('')
  }

  // marquee: duplicate each row once so translateX(-50%) loops seamlessly
  $$('.marquee__row').forEach(row => {
    Array.from(row.children).forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); row.appendChild(c) })
  })

  /* =====================================================================
     TEXT SPLITTING — mounted at first paint, hidden in place
     ===================================================================== */
  const counters = new WeakMap()
  function splitInto(el, mode, startIndex) {
    let i = startIndex
    const walk = node => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/)
          const frag = document.createDocumentFragment()
          for (const part of parts) {
            if (!part) continue
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue }
            const w = document.createElement('span'); w.className = 'w'
            if (mode === 'chars') {
              for (const c of part) {
                const ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = c
                ch.style.setProperty('--i', i++)
                w.appendChild(ch)
              }
            } else {
              w.textContent = part; w.style.setProperty('--i', i++)
            }
            frag.appendChild(w)
          }
          child.replaceWith(frag)
        } else if (child.nodeType === 1) {
          walk(child)
          if (child.classList.contains('gold')) {
            // one gradient across the whole gold word, however it was split
            const units = $$(mode === 'chars' ? '.ch' : '.w', child)
            child.classList.add('is-split')
            child.style.setProperty('--n', units.length)
            units.forEach((u, k) => u.style.setProperty('--k', k))
          }
        }
      }
    }
    walk(el)
    return i
  }
  $$('[data-split]').forEach(el => {
    const mode = el.dataset.split
    // one engine per designed line; continue the count so it reads as one sweep
    const parent = el.parentElement
    const start = el.classList.contains('line') ? (counters.get(parent) || 0) : 0
    const end = splitInto(el, mode, start)
    if (el.classList.contains('line')) counters.set(parent, end)
  })
  const verse = $('[data-scrub-words]')
  const KEY = new Set(['trust', 'lord', 'heart', 'him', 'straight'])
  if (verse) {
    splitInto(verse, 'words', 0)
    $$('.w', verse).forEach(w => { if (KEY.has(w.textContent.toLowerCase().replace(/[^a-z]/g, ''))) w.classList.add('is-key') })
  }
  $$('[data-roll]').forEach(a => {
    const t = a.textContent
    a.innerHTML = `<span class="roll">${esc(t)}</span><span class="roll" aria-hidden="true">${esc(t)}</span>`
  })

  /* =====================================================================
     GENERATIVE ART
     ===================================================================== */
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag)
    for (const k in attrs) n.setAttribute(k, attrs[k])
    if (parent) parent.appendChild(n)
    return n
  }

  // card 01 — blueprint grid
  $$('.bp-grid').forEach(g => {
    for (let k = 0; k <= 200; k += 10) {
      el('line', { x1: k, y1: 0, x2: k, y2: 200 }, g)
      el('line', { x1: 0, y1: k, x2: 200, y2: k }, g)
    }
  })

  // card 04 — a sapling reaching for page one
  $$('[data-sprout]').forEach(svg => {
    const r = rng(23)
    const grow = (x, y, ang, len, depth, w) => {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len
      const cx = (x + x2) / 2 + (r() - 0.5) * len * 0.4, cy = (y + y2) / 2 + (r() - 0.5) * len * 0.3
      const p = el('path', { d: `M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, class: 'br', pathLength: 1, 'stroke-width': w }, svg)
      p.style.setProperty('--depth', depth)
      if (depth >= 4) {
        for (let k = 0; k < 3; k++) {
          const lf = el('ellipse', { cx: (x2 + (r() - .5) * 12).toFixed(1), cy: (y2 + (r() - .5) * 12).toFixed(1), rx: 3.2 + r() * 2.4, ry: 2 + r() * 1.4, class: 'lf', transform: `rotate(${(r() * 180).toFixed(0)} ${x2.toFixed(1)} ${y2.toFixed(1)})` }, svg)
          lf.style.setProperty('--depth', depth); lf.style.setProperty('--o', (0.45 + r() * 0.5).toFixed(2))
        }
        return
      }
      const n = depth === 0 ? 2 : 2 + (r() > 0.6 ? 1 : 0)
      for (let k = 0; k < n; k++) {
        const spread = 0.5 + r() * 0.35
        const a = ang + (k - (n - 1) / 2) * spread + (r() - 0.5) * 0.25
        grow(x2, y2, a, len * (0.68 + r() * 0.12), depth + 1, Math.max(0.6, w * 0.66))
      }
    }
    el('path', { d: 'M40 190 C80 182 120 182 160 190', class: 'br', pathLength: 1, 'stroke-width': 1, style: '--depth:0;opacity:.5' }, svg)
    grow(100, 188, -Math.PI / 2, 52, 0, 3.2)
  })

  // the two oaks — the two boys, grown side by side on scroll, the cross between them
  const oaks = $('#oaks')
  const oakGroups = []
  let leafGroups = []
  if (oaks) {
    const r = rng(1997)
    const GROUND = 868
    const defs = el('defs', {}, oaks)
    const lg = el('linearGradient', { id: 'g-bark', x1: 0, y1: 1, x2: 0, y2: 0 }, defs)
    el('stop', { offset: 0, 'stop-color': '#8d7044' }, lg); el('stop', { offset: 0.6, 'stop-color': '#C4A574' }, lg); el('stop', { offset: 1, 'stop-color': '#f1dcaa' }, lg)
    const glow = el('filter', { id: 'f-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs)
    el('feGaussianBlur', { stdDeviation: 6, result: 'b' }, glow)
    const m = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m)

    const base = el('g', { class: 'band' }, oaks)
    el('path', { d: `M80 ${GROUND} C500 ${GROUND - 26} 1100 ${GROUND - 26} 1520 ${GROUND}`, class: 'br ground', pathLength: 1 }, base)
    el('path', { d: `M800 ${GROUND - 14} V${GROUND - 330} M748 ${GROUND - 250} H852`, class: 'br cross', pathLength: 1, filter: 'url(#f-glow)', 'stroke-width': 3.2 }, base)
    oakGroups.push({ g: base, from: 0, to: 0.14 })

    const MAXD = 8
    const bands = Array.from({ length: MAXD + 1 }, (_, d) => {
      const g = el('g', { class: 'band' }, oaks)
      oakGroups.push({ g, from: 0.08 + d * 0.075, to: 0.08 + d * 0.075 + 0.14 })
      return g
    })
    const leafBands = Array.from({ length: 4 }, () => el('g', { class: 'leaves' }, oaks))
    leafGroups = leafBands.map((g, k) => ({ g, from: 0.62 + k * 0.06, to: 0.62 + k * 0.06 + 0.2 }))
    const leafCols = ['#C4A574', '#e6cf9f', '#2f7a55', '#f4e4bc', '#1f6b47', '#b8913f']

    const tree = (x0, trunkLen, trunkW, lean, dir) => {
      const branch = (x, y, ang, len, depth, w) => {
        const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len
        const bend = (r() - 0.5) * len * (depth === 0 ? 0.12 : 0.42)
        const nx = -Math.sin(ang), ny = Math.cos(ang)
        const cx = (x + x2) / 2 + nx * bend, cy = (y + y2) / 2 + ny * bend
        el('path', {
          d: `M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
          class: 'br', pathLength: 1, 'stroke-width': w.toFixed(2),
          stroke: depth < 3 ? 'url(#g-bark)' : '#d8b97c', 'stroke-opacity': (depth < 3 ? 1 : 0.92 - depth * 0.05).toFixed(2)
        }, bands[depth])
        if (depth >= MAXD) {
          const lb = leafBands[Math.floor(r() * leafBands.length)]
          const count = 3 + Math.floor(r() * 3)
          for (let k = 0; k < count; k++) {
            const lx = x2 + (r() - 0.5) * 34, ly = y2 + (r() - 0.5) * 26
            el('ellipse', {
              cx: lx.toFixed(1), cy: ly.toFixed(1), rx: (3 + r() * 5).toFixed(1), ry: (2 + r() * 3).toFixed(1),
              transform: `rotate(${(r() * 180).toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})`,
              fill: leafCols[Math.floor(r() * leafCols.length)], 'fill-opacity': (0.35 + r() * 0.55).toFixed(2), class: 'lf'
            }, lb)
          }
          return
        }
        const n = depth < 2 ? 2 + (r() > 0.5 ? 1 : 0) : 2
        for (let k = 0; k < n; k++) {
          const spread = (depth < 2 ? 0.62 : 0.5) + r() * 0.3
          let a = ang + (k - (n - 1) / 2) * spread + (r() - 0.5) * 0.3
          a = a + (-Math.PI / 2 - a) * -0.12   // bias outward → a wide oak crown
          // lean each crown away from the cross so the centre stays open
          if (depth < 2) a += dir * 0.06
          const shrink = depth === 0 ? 0.62 + r() * 0.08 : 0.7 + r() * 0.1
          branch(x2, y2, a, len * shrink, depth + 1, Math.max(0.5, w * 0.64))
        }
      }
      for (let k = 0; k < 4; k++) {
        const side = k < 2 ? -1 : 1
        const len = trunkW * (3 + r() * 3)
        el('path', { d: `M${x0} ${GROUND - 4} q${side * len * 0.4} ${4 + r() * 6} ${side * len} ${8 + r() * 10}`, class: 'br', pathLength: 1, 'stroke-width': (trunkW * 0.35).toFixed(1), stroke: 'url(#g-bark)', 'stroke-opacity': 0.6 }, bands[0])
      }
      branch(x0, GROUND - 4, -Math.PI / 2 + lean, trunkLen, 0, trunkW)
    }
    tree(500, 200, 17, -0.05, -1)   // first oak
    tree(1100, 200, 17, 0.05, 1)    // second oak
  }

  /* =====================================================================
     LOADER + GATE
     ===================================================================== */
  const MIN_VISIBLE = REDUCED ? 300 : 2400   // lets the emblem finish rising
  const HARD_CAP = 6000                       // a stalled asset can never trap the visitor
  const t0 = performance.now()
  let opened = false
  const heroImg = $('.hero__img')
  const imgReady = heroImg ? (heroImg.decode ? heroImg.decode().catch(() => {}) : new Promise(res => { heroImg.complete ? res() : heroImg.addEventListener('load', res, { once: true }) })) : Promise.resolve()
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve()
  Promise.all([imgReady, fontsReady]).then(() => {
    const wait = MIN_VISIBLE - (performance.now() - t0)
    wait > 0 ? setTimeout(open, wait) : open()
  })
  setTimeout(open, HARD_CAP)

  function open() {
    if (opened) return
    opened = true
    // the gate flips at the START of the exit: content animates in through the departing curtain
    root.classList.add('is-exiting', 'is-open')
    window.dispatchEvent(new CustomEvent('gate:open'))
    setTimeout(() => $$('.hero [data-split]').forEach(n => n.classList.add('is-in')), REDUCED ? 0 : 320)
    // scroll is released on the curtain's rest — later than the reveal, deliberately
    setTimeout(() => {
      root.classList.remove('is-loading'); root.classList.add('is-done')
      window.dispatchEvent(new CustomEvent('gate:done'))   // the particle stream starts here
      startScroll()
    }, REDUCED ? 320 : 1350)
    setTimeout(() => $('.hero') && $('.hero').classList.add('is-settled'), REDUCED ? 0 : 3400)
  }

  /* =====================================================================
     SCROLL — one clock (Lenis), everything reads from it
     ===================================================================== */
  let lenis = null
  let y = window.scrollY, lastY = y
  function startScroll() {
    if (!REDUCED && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true })
      lenis.on('scroll', e => { y = e.scroll; queue() })
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf) }
      requestAnimationFrame(raf)
    }
    window.addEventListener('scroll', () => { if (!lenis) { y = window.scrollY; queue() } }, { passive: true })
    queue()
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href')
    const target = id === '#top' ? null : $(id)
    if (id !== '#top' && !target) return
    e.preventDefault()
    if (lenis) lenis.scrollTo(target || 0, { offset: id === '#contact' ? 0 : -60, duration: 1.6 })
    else if (target) target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' })
    else window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' })
  }))

  let queued = false
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update) } }

  const nav = $('#nav')
  const hero = $('.hero')
  const name = $('.name')
  const verseWords = verse ? $$('.w', verse) : []
  let lastLit = -1
  const setVar = (node, k, v) => node.style.setProperty(k, v)

  function update() {
    queued = false
    const vh = window.innerHeight
    nav.classList.toggle('is-scrolled', y > 40)
    nav.classList.toggle('is-hidden', y > vh * 0.9 && y > lastY + 2)
    if (y < lastY - 2) nav.classList.remove('is-hidden')
    lastY = y

    // the banner sinks a little slower than the page
    if (hero && !REDUCED && y < hero.offsetHeight * 1.2) setVar(heroImg, '--py', (y * 0.28).toFixed(1) + 'px')

    if (verse) {
      const r = verse.getBoundingClientRect()
      const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.32))
      const lit = Math.round(p * verseWords.length)
      if (lit !== lastLit) { verseWords.forEach((w, i) => w.classList.toggle('is-lit', i < lit)); lastLit = lit }
    }

    if (name && oaks) {
      const r = name.getBoundingClientRect()
      const p = clamp(-r.top / (r.height - vh) * 1.15 + 0.05)
      for (const b of oakGroups) { const v = clamp((p - b.from) / (b.to - b.from)); if (b.v !== v) { b.v = v; setVar(b.g, '--g', v.toFixed(3)) } }
      for (const b of leafGroups) { const v = clamp((p - b.from) / (b.to - b.from)); if (b.v !== v) { b.v = v; setVar(b.g, '--l', v.toFixed(3)) } }
    }
  }

  /* =====================================================================
     VIEWPORT REVEALS — below the fold is plain viewport entry, once
     ===================================================================== */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('is-in')
      io.unobserve(e.target)
    }
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' })
  $$('[data-reveal], [data-split], .footer__mark').forEach(n => { if (!n.closest('.hero')) io.observe(n) })

  /* =====================================================================
     POINTER — cursor, magnetic buttons, tilting cards
     ===================================================================== */
  if (FINE && !REDUCED) {
    root.classList.add('has-cursor')
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring')
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, prev = performance.now()
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px)` }, { passive: true })
    addEventListener('pointerdown', () => cur.classList.add('is-down'))
    addEventListener('pointerup', () => cur.classList.remove('is-down'))
    const loop = now => {
      const dt = Math.min((now - prev) / 1000, 0.1); prev = now
      const k = 1 - Math.exp(-14 * dt)
      rx += (mx - rx) * k; ry += (my - ry) * k
      ring.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    const HOT = 'a, button, [data-tilt], .marquee__row li'
    document.addEventListener('pointerover', e => { if (e.target.closest(HOT)) cur.classList.add('is-hover') })
    document.addEventListener('pointerout', e => { if (e.target.closest(HOT)) cur.classList.remove('is-hover') })

    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect()
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px')
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px')
      })
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px') })
    })

    $$('[data-tilt]').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
        c.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg')
        c.style.setProperty('--rx', (-(py - 0.5) * 10).toFixed(2) + 'deg')
        c.style.setProperty('--px', (px * 100).toFixed(1) + '%')
        c.style.setProperty('--py', (py * 100).toFixed(1) + '%')
      })
      c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg') })
    })
  }

  addEventListener('resize', queue, { passive: true })
})()
