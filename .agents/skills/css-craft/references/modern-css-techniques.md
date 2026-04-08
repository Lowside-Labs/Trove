# Modern CSS Techniques

CSS features that reduce JavaScript, simplify mobile, and solve problems that previously required workarounds. Each entry includes browser support and Tailwind v4 equivalents.

---

## 1. overflow: clip vs overflow: hidden

`overflow: clip` is almost always the better choice. The critical differences:

| Behavior                  | `overflow: hidden`                               | `overflow: clip` |
| ------------------------- | ------------------------------------------------ | ---------------- |
| Creates scroll container  | Yes                                              | **No**           |
| Breaks `position: sticky` | **Yes**                                          | No               |
| Programmable scrolling    | Yes (`scrollTo`)                                 | No               |
| Per-axis clipping         | No (setting one axis forces the other to `auto`) | **Yes**          |

```css
/* BAD: silently kills sticky children */
.container {
  overflow: hidden;
}

/* GOOD: clips without side effects */
.container {
  overflow: clip;
}

/* Clip horizontal only, leave vertical alone (impossible with hidden) */
.element {
  overflow-x: clip;
  overflow-y: visible;
}
```

**This is the #1 reason `position: sticky` "doesn't work."** `overflow: hidden` on any ancestor creates a new scroll context, making sticky calculate against that ancestor instead of the viewport. Switch to `overflow: clip`.

Tailwind: `overflow-clip`, `overflow-x-clip`. Support: Baseline 2022+.

---

## 2. isolation: isolate

Creates a new stacking context with zero side effects.

```css
/* These all create stacking contexts but have side effects */
.hack-1 {
  position: relative;
  z-index: 0;
} /* forces positioning */
.hack-2 {
  transform: translateZ(0);
} /* forces compositing layer */

/* Clean — no side effects */
.clean {
  isolation: isolate;
}
```

**Use on the app root** so z-index values inside the app never conflict with portals, third-party overlays, or browser extensions:

```css
#__next {
  isolation: isolate;
}
```

**Use on containers with `border-radius` + `overflow`** to fix Safari's long-standing bug where children with CSS transforms escape the rounded clip:

```css
.rounded-container {
  border-radius: 1rem;
  overflow: clip;
  isolation: isolate; /* prevents child transforms from escaping the clip */
}
```

Tailwind: `isolate`. Support: Baseline, all browsers.

---

## 3. interpolate-size: allow-keywords

Enables animating to/from `height: auto`, `width: max-content`, `width: fit-content` — previously impossible in CSS.

```css
:root {
  interpolate-size: allow-keywords;
}
```

Once set, transitions involving intrinsic size keywords just work:

```css
/* Accordion — animates to natural height */
.content {
  height: 0;
  overflow: clip;
  transition: height 0.35s ease;
}
details[open] > .content {
  height: auto;
}

/* Nav labels that expand on hover */
nav a {
  width: 48px;
  overflow-x: clip;
  transition: width 0.35s ease;
}
nav a:hover {
  width: max-content;
}
```

**Wrap in reduced-motion check:**

```css
@media (prefers-reduced-motion: no-preference) {
  :root {
    interpolate-size: allow-keywords;
  }
}
```

Support: Chrome 129+ (Sep 2024). Safari and Firefox tracking. Progressive enhancement — layout works without it, just no transition.

---

## 4. @starting-style

Entry animations without JavaScript. Defines the initial state for elements that are newly displayed (`display: none` → visible, added to DOM, entering top layer).

```css
dialog[open] {
  opacity: 1;
  translate: 0 0;
  transition:
    opacity 0.3s,
    translate 0.3s,
    display 0.3s allow-discrete;

  @starting-style {
    opacity: 0;
    translate: 0 20px;
  }
}
```

**With popover:**

```css
[popover]:popover-open {
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 0.3s,
    transform 0.3s,
    display 0.3s allow-discrete;
}

@starting-style {
  [popover]:popover-open {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* Exit state */
[popover]:not(:popover-open) {
  opacity: 0;
  transform: scale(0.95);
  transition:
    opacity 0.2s,
    transform 0.2s,
    display 0.2s allow-discrete;
}
```

The `allow-discrete` keyword on `display` transition tells the browser to hold `display: block` during the exit animation, then toggle to `none` at the end.

Support: Baseline Aug 2024 (Chrome, Safari, Firefox).

---

## 5. field-sizing: content

Auto-sizes `<textarea>` and `<select>` to fit their content without JS resize observers:

```css
textarea {
  field-sizing: content;
  min-block-size: 3lh; /* at least 3 lines */
  max-block-size: 10lh; /* at most 10 lines */
}
```

The `lh` unit measures exactly one line of text — perfect for constraining.

**Caveat for `<input>`:** `field-sizing: content` technically works on inputs, but the input shrinks to zero width when empty, which is almost never desirable. Stick to `<textarea>` and `<select>`.

Support: Chrome 123+ (Mar 2024), Edge 123+. Not yet in Safari/Firefox. Use as progressive enhancement.

---

## 6. text-wrap: balance and text-wrap: pretty

### balance

Redistributes text so all lines are approximately equal length. Use on **headings only** — capped at 6 lines in Chromium, 10 in Firefox:

```css
h1,
h2,
h3,
h4,
h5,
h6 {
  text-wrap: balance;
}
```

### pretty

Prevents orphans (single words on last line). Use on **body text**:

```css
p {
  text-wrap: pretty;
}
```

| Value     | Use case                     | Performance                      |
| --------- | ---------------------------- | -------------------------------- |
| `balance` | Headings, short text, labels | Higher (limited to 6-10 lines)   |
| `pretty`  | Body paragraphs              | Moderate (affects last ~4 lines) |
| `stable`  | Editable content             | Minimal                          |

Tailwind: `text-balance`, `text-pretty`. Support: Baseline Mar 2024.

---

## 7. anchor() Positioning

Eliminates JS positioning libraries (Floating UI, Popper) for tooltips, dropdowns, and popovers.

```css
.trigger {
  anchor-name: --trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --trigger;
  inset-area: block-end; /* below the trigger */
  margin-block-start: 8px;
}
```

### Automatic fallback positioning

```css
.tooltip {
  position-try-fallbacks: flip-block, flip-inline;
}
```

`flip-block` flips from below to above if no room. `flip-inline` flips left/right.

### Size relative to anchor

```css
.dropdown {
  width: anchor-size(width);
}
```

Support: Chrome 125+, Edge 125+. Safari and Firefox support is evolving — verify current status before relying on this in production. For progressive enhancement, pair with the `popover` API:

```html
<button popovertarget="tip" style="anchor-name: --btn">Hover</button>
<div popover id="tip" style="position-anchor: --btn; inset-area: block-end;">
  Tooltip
</div>
```

---

## 8. scrollbar-gutter: stable

Reserves space for the scrollbar to prevent layout shift when it appears/disappears:

```css
body {
  overflow-y: auto;
  scrollbar-gutter: stable;
}

/* Symmetric padding on both sides */
.container {
  scrollbar-gutter: stable both-edges;
}
```

**Dialog library gotcha:** Libraries like Radix lock body scroll when dialogs open, removing the scrollbar and causing shift. Override:

```css
html body[data-scroll-locked] {
  overflow-y: scroll !important;
  --removed-body-scroll-bar-size: 0 !important;
  margin-right: 0 !important;
}
```

Support: Baseline 2024.

---

## 9. :has() Selector

Relational selector that works in any direction — parent, sibling, quantity-based.

### Parent styling based on child

```css
.card:has(img) {
  grid-template-rows: auto 1fr;
}
.input-group:has(input:invalid) {
  border-color: var(--color-error);
}
```

### Quantity queries

```css
/* 4+ items → switch to compact grid */
.grid:has(> :nth-child(4)) {
  grid-template-columns: repeat(4, 1fr);
}

/* Exactly 3 children → 3 columns */
.list:has(> :nth-child(3):last-child) {
  grid-template-columns: repeat(3, 1fr);
}
```

### Sibling-based styling

```css
label:has(+ input:focus-visible) {
  color: var(--color-primary);
}
```

Support: Baseline Dec 2023 (Chrome, Safari, Firefox 121+).

---

## 10. Modern CSS Reset

The synthesized best-of reset from Josh Comeau, Andy Bell, and community consensus (2025):

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
*:not(dialog) {
  margin: 0;
}

@media (prefers-reduced-motion: no-preference) {
  html {
    interpolate-size: allow-keywords;
  }
}

body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-block-size: 100%;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-inline-size: 100%;
  block-size: auto;
}

svg:not([fill]) {
  fill: currentColor;
}
input,
button,
textarea,
select {
  font: inherit;
}
p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}

p {
  text-wrap: pretty;
}
h1,
h2,
h3,
h4,
h5,
h6 {
  text-wrap: balance;
}

#__next,
#root {
  isolation: isolate;
}
```

Notable optional additions:

```css
html {
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
}
p,
blockquote,
figcaption,
li {
  hanging-punctuation: first allow-end last;
}
table,
time {
  font-variant-numeric: tabular-nums lining-nums;
}
```

---

## 11. Native <dialog> and popover

### `<dialog>`

Built-in modal with backdrop, focus trapping, Escape dismissal:

```html
<dialog id="confirm">
  <h2>Are you sure?</h2>
  <form method="dialog">
    <button value="cancel">Cancel</button>
    <button value="confirm">Confirm</button>
  </form>
</dialog>
```

```css
dialog::backdrop {
  background: oklch(0 0 0 / 0.5);
  backdrop-filter: blur(4px);
}
```

`method="dialog"` means buttons close the dialog and set its `returnValue` — no JS event listeners.

### `popover`

Lightweight, non-modal overlay with built-in "light dismiss":

```html
<button popovertarget="menu">Menu</button>
<nav popover id="menu">
  <a href="/home">Home</a>
</nav>
```

Zero JS. Browser handles showing, hiding, focus management, top-layer rendering. Combine with `anchor()` for positioned tooltips/dropdowns without libraries.

---

## 12. Color in Modern CSS

### Why oklch()

`oklch(lightness chroma hue)` is the default color space in Tailwind v4 and the correct choice for design systems. Unlike `hsl()`, oklch is **perceptually uniform** — two colors at the same lightness value actually look equally bright to human eyes.

```css
/* oklch(lightness chroma hue) */
--brand-500: oklch(0.65 0.2 250); /* vibrant blue */
--brand-400: oklch(0.75 0.2 250); /* lighter — same chroma & hue */
--brand-600: oklch(0.55 0.2 250); /* darker — same chroma & hue */
```

**Generating harmonious palettes:** Rotate hue at constant lightness and chroma:

```css
--blue: oklch(0.65 0.2 250);
--purple: oklch(0.65 0.2 300); /* +50 hue */
--red: oklch(0.65 0.2 25); /* +135 hue */
```

All three look equally vibrant and equally bright because L and C are held constant. This is impossible with `hsl()` — `hsl(60, 100%, 50%)` (yellow) looks far brighter than `hsl(240, 100%, 50%)` (blue) despite identical L values.

### color-mix()

Blend two colors in any color space. The universal tool for tints, shades, and transparency:

```css
/* 50% transparent version of a color */
background: color-mix(in oklch, var(--brand-500), transparent);

/* Tint — mix with white */
--brand-100: color-mix(in oklch, var(--brand-500) 20%, white);

/* Shade — mix with black */
--brand-900: color-mix(in oklch, var(--brand-500) 20%, black);

/* Blend two brand colors */
--accent: color-mix(in oklch, var(--blue) 60%, var(--purple));
```

**Use `in oklch`** (not `in srgb`) for perceptually smooth blending. sRGB mixing produces muddy midpoints, especially between complementary colors.

Tailwind: Tailwind v4 uses oklch natively. `bg-blue-500/50` produces alpha variants. For mixing, use arbitrary values: `bg-[color-mix(in_oklch,var(--brand)_80%,white)]`.

Support: Baseline Widely Available 2025. All browsers.

### Relative color syntax

Derive new colors from existing ones by adjusting individual channels:

```css
:root {
  --brand: oklch(0.65 0.2 250);
}

/* Lighten by increasing L */
--brand-light: oklch(from var(--brand) calc(l + 0.15) c h);

/* Desaturate by reducing chroma */
--brand-muted: oklch(from var(--brand) l calc(c - 0.1) h);

/* Set specific alpha */
--brand-ghost: oklch(from var(--brand) l c h / 0.1);

/* Shift hue for a complementary color */
--complement: oklch(from var(--brand) l c calc(h + 180));
```

This replaces the need for Sass `lighten()`, `darken()`, `desaturate()` with native CSS.

Support: Chrome 119+, Safari 16.4+, Firefox 128+. Available across all major engines since mid-2024.

### light-dark()

One-line dark mode values without duplicating custom properties:

```css
:root {
  color-scheme: light dark; /* required — tells the browser both schemes are supported */

  --surface: light-dark(oklch(0.98 0 0), oklch(0.15 0 0));
  --text: light-dark(oklch(0.2 0 0), oklch(0.9 0 0));
  --border: light-dark(oklch(0.85 0 0), oklch(0.3 0 0));
}
```

No `@media (prefers-color-scheme)` or `.dark` class needed for the values — `light-dark()` resolves based on the computed `color-scheme`. Combine with a class toggle for manual switching:

```css
:root {
  color-scheme: light dark;
}
:root.light {
  color-scheme: light;
}
:root.dark {
  color-scheme: dark;
}
```

`color-scheme: light dark` also makes native form controls, scrollbars, and system colors adapt automatically.

Support: Baseline Jun 2024. All browsers.

### prefers-contrast

```css
@media (prefers-contrast: more) {
  :root {
    --border: oklch(0.5 0 0); /* stronger borders */
    --text: oklch(0.1 0 0); /* higher contrast text */
  }
}
```

### Key principles

1. **Use oklch for all color definitions.** Perceptually uniform = predictable palettes.
2. **Use color-mix for tints/shades/alpha.** One function replaces a dozen Sass utilities.
3. **Use relative color syntax for derived colors.** Lighten, darken, desaturate, shift hue — all in CSS.
4. **Use light-dark() for dark mode values.** One declaration instead of a media query per property.
5. **Set `color-scheme: light dark` on `:root`.** Native controls and scrollbars adapt for free.

---

## 13. Shadow, Outline & Ring Clipping

Decorative effects (box-shadow, outline, ring) getting clipped by parent overflow is one of the most common CSS frustrations. The cause: any `overflow` value other than `visible` clips all child rendering that bleeds outside the box.

### The core problem

Setting `overflow-x: visible` alongside `overflow-y: auto/scroll/hidden` does **not work**. Per spec, when one axis is `auto`/`scroll`/`hidden`, the browser forces the other axis to `auto`. You cannot have scrolling on one axis and visible overflow on the other.

`overflow-clip-margin` (which would allow controlled bleed) is **not supported in Safari** (as of Safari 26.4).

### Fix 1: Padding + negative margin (universal, use this 80% of the time)

```css
.scroll-parent {
  overflow-y: auto;
  padding-inline: 8px; /* room for shadow/ring to render */
  margin-inline: -8px; /* cancel layout impact */
}
```

The shadow renders inside the padding area. The negative margin restores the original bounding box so surrounding layout is unaffected.

Tailwind: `overflow-y-auto px-2 -mx-2` (adjust to match shadow/ring size).

**Size the padding to the effect:** A `shadow-md` (4px blur + 6px spread) needs ~10px of breathing room. A `ring-2` (2px) needs ~4px. Round up.

### Fix 2: clip-path with negative inset

If the parent can't take padding (e.g., has a background or border that would show in the padded area), and you don't need scrolling — use `clip-path` instead of `overflow`:

```css
.parent {
  clip-path: inset(-8px); /* clips content but allows 8px bleed on all sides */
}
```

For directional control: `clip-path: inset(-8px -8px 0 -8px)` allows bleed on top, left, right but clips bottom.

Works in all browsers including Safari.

### Fix 3: Inset shadow (avoids clipping entirely)

If the design allows it, use `box-shadow: inset` which renders inside the element and cannot be clipped:

```css
.card {
  box-shadow: inset 0 0 0 2px var(--ring-color);
}
```

### Fix 4: Wrapper inside the scroll container

When you can't modify the scroll parent:

```css
.scroll-parent {
  overflow-y: auto;
}
.breathing-wrapper {
  padding: 8px;
}
.card {
  box-shadow: var(--shadow);
}
```

### Decision tree

```
Is the parent scrollable (overflow-y: auto/scroll)?
├── Yes
│   ├── Can the parent take padding? → Fix 1: padding + negative margin
│   └── No → Fix 4: wrapper inside scroll container
└── No (overflow: hidden/clip for visual clipping only)
    ├── Need controlled bleed? → Fix 2: clip-path with negative inset
    └── Can use inset effect? → Fix 3: inset shadow
```

---

## 14. Pseudo-Element Patterns

`::before` and `::after` are the most underused CSS tools. They create elements without adding DOM nodes — perfect for decorative effects, layout hacks, and interaction helpers.

**Fundamental rules:**

- Require `content: ""` (even if empty) to render
- Do not work on void/replaced elements (`<img>`, `<input>`, `<br>`)
- Inherit styles from their parent element
- Are affected by the parent's `overflow`
- Count as children for flexbox/grid layout

### Expanded tap target

Make small buttons/icons meet the 44px touch target without changing visual size:

```css
.icon-button {
  position: relative;
  width: 24px;
  height: 24px;
}

.icon-button::before {
  content: "";
  position: absolute;
  inset: -10px; /* expands hit area to 44x44 */
}
```

Tailwind (via arbitrary): `before:content-[''] before:absolute before:inset-[-10px]`

### Gradient fade / mask overlay

Fade content at edges (scroll containers, hero images, sticky input areas):

```css
.fade-bottom::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 80px;
  background: linear-gradient(to top, var(--bg), transparent);
  pointer-events: none; /* clicks pass through */
}
```

For scroll containers, this creates the "content fades out" effect without masking:

```css
.scroll-fade {
  position: relative;
}
.scroll-fade::after {
  content: "";
  position: sticky;
  bottom: 0;
  display: block;
  height: 48px;
  margin-top: -48px;
  background: linear-gradient(to top, var(--surface), transparent);
  pointer-events: none;
}
```

### Decorative separator / divider

Between sections without adding a `<hr>` or border that affects layout:

```css
.section + .section::before {
  content: "";
  display: block;
  width: 60%;
  height: 1px;
  margin-inline: auto;
  margin-block: 2rem;
  background: var(--border);
}
```

### Aspect-ratio placeholder (legacy fallback)

Before `aspect-ratio` existed, pseudo-elements were the only way. Still useful if you need to support very old browsers:

```css
.frame::before {
  content: "";
  display: block;
  padding-top: 56.25%; /* 16:9 */
}
```

Prefer `aspect-ratio: 16 / 9` in modern CSS.

### Background overlay on images

Darken or tint an image without a wrapper div:

```css
.hero {
  position: relative;
}

.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: oklch(0 0 0 / 0.4); /* dark overlay */
  pointer-events: none;
}
```

For gradient overlays (text readability over images):

```css
.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    oklch(0 0 0 / 0.7) 0%,
    oklch(0 0 0 / 0) 60%
  );
  pointer-events: none;
}
```

### Visual indicator / badge dot

```css
.has-notification::after {
  content: "";
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
  border: 2px solid var(--surface); /* "cutout" effect */
}
```

### Key rules

1. **Always add `pointer-events: none`** on decorative pseudo-elements so clicks pass through to the real content beneath.
2. **Use `inset: 0`** instead of `top: 0; right: 0; bottom: 0; left: 0`.
3. **Pseudo-elements are flex/grid children.** In a flex container, `::before` and `::after` participate in layout. Use `position: absolute` to take them out of flow when they're decorative.
4. **`content: ""` is required.** Without it, the pseudo-element doesn't render. For icon fonts or counters, `content` can hold text or `counter()` values.

---

Sources: Josh Comeau (CSS Reset, 2025), Andy Bell (CUBE CSS, Every Layout), Bramus/Chrome for Developers (interpolate-size, @starting-style), Adam Argyle (text-wrap, relative color syntax), Evil Martians (OKLCH guide), Ahmad Shadeed (relative colors), MDN (color-mix, light-dark, oklch), Polypane (overflow: clip), Una Kravets (min/max/clamp, color-mix), Steph Eckles (SmolCSS), DevToolbox (color-mix guide).
