# Two Oaks Technologies — Landing Page

A premium, animated landing page for **Two Oaks Technologies**, in forest emerald and antique gold.
*Faith. Family. Innovation. Founded on Proverbs 3:5–6.*

It's a static site with no build step: plain HTML, CSS and JavaScript, plus two vendored libraries (three.js and Lenis). You can host it anywhere: GitHub Pages, Netlify, Vercel, Cloudflare Pages or any web server.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. A local server is needed because the hero scene loads as an ES module. Opening `index.html` directly from disk won't run it.

## What's on the page

| Section | What happens |
| --- | --- |
| **Loader** | The shield emblem draws itself in gold. The curtain then splits and the page animates in as it lifts. |
| **Hero** | A WebGL field of gold and sage motes drifts behind the headline (GetLayers *Flying Dust* scene). The headline appears one letter at a time from a blur. There's also a rotating "Faith · Family · Innovation" seal and a vertical grid overlay. |
| **Foundation** | Proverbs 3:5–6, set large. Each word lights up as you scroll, and the key words glow gold. |
| **Craft** | Three service cards that tilt with the cursor and have a gold sheen. Each card's artwork draws itself: oak growth rings, a blueprint and a sapling. |
| **Our Name** | Two generative oaks, one young and one mature, with a cross between them. They grow branch by branch as you scroll, then come into leaf. |
| **Process** | Root → Grow → Branch → Bear Fruit. A gold timeline draws across as you scroll, and the figures count up. |
| **Values** | Faith / Family / Innovation in oversized gold type, alternating left and right. |
| **Contact** | An enquiry form over a fluted-glass shader that bends around your cursor (GetLayers *Cannelure* gradient). |
| **Footer** | A giant outlined "TWO OAKS" wordmark that rises into place. |

Other details: smooth scrolling (Lenis), a custom gold cursor, buttons that pull toward the cursor, link text that rolls on hover, film grain, and full `prefers-reduced-motion` support (animation is reduced to fades and the WebGL scenes stop).

## Customising

- **Logo.** The emblem is an SVG `<symbol id="emblem">` near the top of `index.html`. The loader has its own copy so it can animate the draw. `assets/brand/emblem.svg` is the favicon. To use your final shield logo, replace the paths in those three places. `assets/brand/two-oaks-logo-reference.png` is the reference image the emblem was drawn from.
- **Colours and fonts.** Every design token is in `:root` at the top of `assets/css/styles.css` (`--gl-*`).
- **Copy.** Everything is in `index.html`.
- **Contact form.** Without a form backend, the form opens the visitor's email app with the details filled in, addressed to `hello@twooakstechnologies.com`. Change that address in `assets/js/main.js` and in the footer link. To send submissions straight to your inbox, add an endpoint from a form service such as Formspree, Basin or Netlify Forms:
  ```html
  <form class="capsule" id="enquiry" data-endpoint="https://formspree.io/f/your-id" …>
  ```
- **Scene colours.** Both WebGL pieces are tinted through their `CONFIG` blocks: `assets/js/dust-scene.js` for the hero and `assets/js/cannelure.js` for the contact section. Change colours there, not in the shaders.

## Project structure

```
index.html                 page markup + emblem symbol
assets/css/styles.css      tokens, layout, animation, responsive, reduced-motion
assets/js/main.js          loader/gate, text splitting, scroll choreography, generative SVG, cursor, form
assets/js/dust-scene.js    hero WebGL scene (GetLayers "Flying Dust", tinted)
assets/js/cannelure.js     contact-section shader (GetLayers "Cannelure", tinted)
assets/vendor/             three.js 0.143.0 (MIT) and Lenis 1.1.13 (MIT), self-hosted
assets/brand/              favicon emblem + logo reference
getlayers.json             the GetLayers build record: style, compositions, assets
```

## Credits

The design was built with the [GetLayers](https://www.getlayers.ai) MCP. It uses the Laocoön style (type system), layout compositions from the GetLayers library, the *Flying Dust* scene and the *Cannelure* gradient. The choices are recorded in `getlayers.json`. three.js and Lenis are MIT-licensed, and their licence files are in `assets/vendor/`.
