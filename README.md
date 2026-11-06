# Two Oaks Technologies — Website

The upgraded site for **Two Oaks Technologies** in Huntsville, AL. It covers websites, Google Business Profile, social media, reviews and custom apps.
*Faith. Family. Innovation. Founded on Proverbs 3:5–6.*

It's a static site with no build step: plain HTML, CSS and JavaScript, plus self-hosted copies of three.js and Lenis. You can host it anywhere: GitHub Pages, Netlify, Vercel, Cloudflare Pages or any web server.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. A local server is needed because the particle stream loads as an ES module. Opening `index.html` directly from disk won't run it.

## What's on the page

| Section | What happens |
| --- | --- |
| **Loader** | The Two Oaks emblem rises out of the ground and a gold sheen passes over it. The curtain then splits, and the page animates in as it lifts. |
| **Hero** | The banner (the emblem over the hill at sunrise) fills the screen with a slow settle-in zoom, a pulsing sunrise glow and scroll parallax. Two softly glowing streams of gold and emerald particles pour in from the top-left and top-right corners, past the oaks, and meet on the grass just below the crest of the hill, never touching a word. |
| **Particle stream** | After the two arms meet, one stream runs the full length of the page as you scroll. It's made of glowing filaments, sparks and soft bokeh, and passes behind every section. It comes from the GetLayers *Relay* template. |
| **Foundation** | Proverbs 3:5–6, set large. The words light up as you scroll. |
| **Getting found** | Four cards: your site, Google listing, social and local SEO. Each tilts toward the cursor, and its line art draws itself. |
| **The work** | The client list on a frosted panel the stream glows through. |
| **The offer** | Websites / Social / Custom apps, then the Starter, Professional and Premium tiers. The "Most chosen" card has a gold light running around its border. |
| **Two Oaks. Two boys.** | Two oaks grow branch by branch as you scroll, with the cross between them and the stream pouring through it. |
| **Who you're hiring** | The family photo, Mike and Jacqueline's roles, and client quotes. |
| **Who it's for** | Industries scroll past in two rows moving in opposite directions. |
| **Values** | Faith / Family / Innovation in oversized gold type. |
| **Contact** | A fluted-glass shader (GetLayers *Cannelure*) behind the free-audit buttons, the text link and the contact details. |

Other details: smooth scrolling, a custom gold cursor, buttons that pull toward the cursor, film grain, and full `prefers-reduced-motion` support. With reduced motion on, the stream holds still and everything else fades in.

## Editing

- **Clients:** edit the `CLIENTS` list at the top of `assets/js/main.js`. Give a client a `url` and a "Visit the site" link appears.
- **Copy, phone and email:** these are in `index.html`. The contact links use `mike@two-oaks-technologies.com` and `256-529-0546`.
- **Colours and fonts:** every design token is in `:root` at the top of `assets/css/styles.css`. The particle stream's colours are the `--stream-*` tokens there.
- **Images:** `assets/img/`. `hero-banner.webp` is the banner, and `emblem.png`, `logo.png`, `mike-family.jpg` and `og-image.jpg` come from the current site.
- **The stream's path:** `HERO` (the right arm), `BRANCH` (the left arm) and `TAIL` near the top of `assets/js/stream.js` list waypoints tied to section ids, one set per screen size. The two arms share a meeting point with `pinch: 1`. Hero waypoints use `at: "hero-media"` (a share of the banner image's height), and the desktop stream runs down the empty `hero-gutter` column between the headline and the side copy (`xAt`), so it never crosses a word in the hero. If you rename or remove a section, update its waypoints. Every waypoint has to sit lower on the page than the one before it.

## Project structure

```
index.html                 page markup
assets/css/styles.css      tokens, layout, animation, responsive, reduced-motion
assets/js/main.js          loader/gate, text reveals, scroll choreography, oaks, clients, cursor
assets/js/stream.js        page-long particle stream (GetLayers "Relay")
assets/js/cannelure.js     contact-section shader (GetLayers "Cannelure")
assets/img/                banner, emblem, logo, family photo, social image
assets/vendor/             three.js 0.186.1 (MIT) and Lenis 1.1.13 (MIT), self-hosted
getlayers.json             the GetLayers build record: style, compositions, assets
```

## Credits

The design was built with the [GetLayers](https://www.getlayers.ai) MCP. It uses the Laocoön style (type system), layout compositions from the GetLayers library, the particle stream from the *Relay* template and the *Cannelure* gradient. The choices are recorded in `getlayers.json`. three.js and Lenis are MIT-licensed, and their licence files are in `assets/vendor/`.
