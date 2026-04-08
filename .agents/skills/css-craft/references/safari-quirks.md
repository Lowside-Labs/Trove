# Safari & iOS Quirks

Safari-specific bugs and workarounds. Each entry follows: **Problem → Cause → Fix → Tailwind**.

---

## 1. SVG Sizing in Flex/Grid

**Problem:** SVG ignores `width: 100%` inside flex or grid containers, rendering at intrinsic size or 0.

**Cause:** Safari resolves SVG sizing differently when the element is a flex/grid item without explicit dimensions.

**Fix:** Always set explicit `width` and `height` attributes on SVGs, or use `min-width`:

```html
<svg width="24" height="24" viewBox="0 0 24 24">...</svg>
```

```css
svg {
  min-width: 0; /* or explicit size */
}
```

**Tailwind:** `size-6` (24px), `min-w-0`, `shrink-0` on SVGs in flex containers.

---

## 2. border-radius + overflow Clipping Failure

**Problem:** Children with CSS transforms (`transform`, `translate`, `scale`) visually escape the parent's `border-radius` clip.

**Cause:** Long-standing WebKit bug (since 2018, still present). Transformed elements create a new stacking context that bypasses the parent's rounded clip.

**Fix:** Force a stacking context on the parent:

```css
.rounded-container {
  border-radius: 1rem;
  overflow: clip; /* not hidden */
  isolation: isolate; /* cleanest fix */
}
```

Alternatives: `z-index: 0`, `transform: translateZ(0)`. `isolation: isolate` is preferred — no side effects.

**Tailwind:** `rounded-2xl overflow-clip isolate`

---

## 3. position: sticky Killed by overflow: hidden

**Problem:** `position: sticky` element doesn't stick — it scrolls with content.

**Cause:** Any ancestor with `overflow: hidden`, `auto`, or `scroll` creates a scroll context. Sticky elements calculate stickiness against the nearest scroll context, not the viewport.

**Fix:** Replace `overflow: hidden` with `overflow: clip` on ancestors:

```css
/* BAD */
.ancestor {
  overflow: hidden;
}

/* GOOD — clips without creating scroll context */
.ancestor {
  overflow: clip;
}
```

**Tailwind:** `overflow-clip` instead of `overflow-hidden`.

---

## 4. backdrop-filter Rendering

**Problem:** `backdrop-filter: blur()` doesn't render, or renders with artifacts (black flashing, sharp edges).

**Cause:** Safari requires the `-webkit-` prefix and can produce rendering bugs when combined with `mask` or when the element lacks a compositing layer.

**Fix:**

```css
.glass {
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  transform: translate3d(0, 0, 0); /* force compositing layer */
}
```

**Rules:**

- Always include `-webkit-backdrop-filter`
- Add `translate3d(0,0,0)` to prevent rendering artifacts
- Do not combine `backdrop-filter` and `mask` on the same element
- Blur above 20px is expensive on mobile Safari — consider reducing or limiting to desktop: `@media (hover: hover)`
- Respect `prefers-reduced-transparency` for accessibility

**Tailwind:** `backdrop-blur-sm` (includes both prefixed and unprefixed via autoprefixer).

---

## 5. Input Zoom on Focus

**Problem:** Tapping an input field causes Safari to zoom in. It never auto-zooms back out.

**Cause:** iOS Safari auto-zooms any input with `font-size` below 16px to make text readable.

**Fix:**

```css
input,
select,
textarea {
  font-size: max(16px, 1rem);
}
```

**Never use** `maximum-scale=1` or `user-scalable=no` in the viewport meta — this breaks accessibility (pinch-to-zoom).

**Tailwind:** `text-base` (16px) minimum on all form elements.

---

## 6. Font Rendering Differences

**Problem:** Text appears heavier/thicker in Safari compared to Chrome.

**Cause:** Safari defaults to `subpixel-antialiased` rendering. Since macOS Mojave disabled subpixel antialiasing system-wide, this produces inconsistent weight.

**Fix:**

```css
body {
  -webkit-font-smoothing: antialiased;
}
```

**Tailwind:** `antialiased` on the body or root element.

---

## 7. 100vh Problem

**Problem:** Elements set to `height: 100vh` overflow the visible area on mobile Safari. Content is hidden behind the address bar.

**Cause:** `100vh` equals the large viewport (toolbar fully retracted), not the visible viewport when the address bar is showing.

**Fix:**

```css
.full-height {
  height: 100svh; /* small viewport — toolbar visible */
}
```

| Unit  | Meaning                                | Use when                                                            |
| ----- | -------------------------------------- | ------------------------------------------------------------------- |
| `svh` | Small viewport (toolbars visible)      | Default choice (~90%). Modals, app shells, hero sections.           |
| `lvh` | Large viewport (toolbars retracted)    | Full-screen after scrolling.                                        |
| `dvh` | Dynamic (animates between svh and lvh) | Use sparingly — updates throttled, can cause visible layout shifts. |

**Caveats:**

- Virtual keyboard does NOT affect viewport units. Use the Visual Viewport API for that.
- `100vw` doesn't account for scrollbar width on desktop.

**Tailwind:** `h-dvh`, `min-h-svh`, `h-lvh`, or arbitrary: `h-[100svh]`.

Support: Safari 15.4+, Chrome 108+, Firefox 101+.

---

## 8. theme-color Meta Tag

**Problem:** `<meta name="theme-color">` doesn't reliably control Safari's tab/toolbar tinting.

**Cause:** Recent Safari versions derive tab tinting from the page's `background-color` rather than the meta tag. The color shifts when fixed-position elements appear.

**Fix:** Set `background-color` on the `<body>` to match your desired chrome color. The meta tag is secondary:

```html
<meta
  name="theme-color"
  content="#000000"
  media="(prefers-color-scheme: dark)"
/>
<meta
  name="theme-color"
  content="#ffffff"
  media="(prefers-color-scheme: light)"
/>
```

```css
body {
  background-color: #000;
}
```

For pages with a hero image that should extend into the status bar area:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

```css
body {
  background-color: /* match top of hero image */;
}
```

---

## 9. Video Autoplay

**Problem:** Videos don't autoplay on iOS Safari.

**Cause:** iOS requires `muted` and `playsinline` attributes. Without `playsinline`, tapping play opens fullscreen.

**Fix:**

```html
<video autoplay muted playsinline loop>
  <source src="video.mp4" type="video/mp4" />
</video>
```

For `prefers-reduced-motion` users, show play button instead:

```jsx
<video
  autoPlay={!prefersReducedMotion}
  controls={prefersReducedMotion}
  muted
  playsInline
/>
```

---

## 10. position: fixed with Virtual Keyboard

**Problem:** Fixed/sticky elements jump or get displaced when the iOS virtual keyboard opens.

**Cause:** iOS Safari treats the keyboard as reducing the visual viewport, but `position: fixed` elements are positioned relative to the layout viewport.

**Fix:** Use the Visual Viewport API:

```js
window.visualViewport.addEventListener("resize", () => {
  const keyboardHeight = window.innerHeight - window.visualViewport.height
  bottomBar.style.transform = `translateY(-${keyboardHeight}px)`
})
```

Or avoid `position: fixed` for bottom bars on pages with inputs — use `position: sticky` within the scrollable content instead.

---

## 11. calc() + dvw + min() Bug

**Problem:** `calc()` expressions combining `dvw` with `min()` produce incorrect results.

**Cause:** Safari rendering bug reported in certain versions. Verify whether the issue persists in the current Safari release.

**Fix:** Use `vw` instead of `dvw` in calc expressions, or avoid combining `dvw` with `min()`/`max()`.

---

## 12. mask / clip-path Prefix

**Problem:** CSS `mask` properties don't work in Safari.

**Cause:** Safari still requires the `-webkit-` prefix for some mask properties.

**Fix:**

```css
.masked {
  -webkit-mask-image: linear-gradient(to bottom, black, transparent);
  mask-image: linear-gradient(to bottom, black, transparent);
}
```

---

## 13. aspect-ratio in Flex/Scroll Containers

**Problem:** `aspect-ratio` produces unexpected sizing when the element is a flex item or inside a scroll container.

**Cause:** Safari resolves the aspect ratio constraint differently when the element's size is influenced by flex or scroll layout.

**Fix:** Set an explicit `width` or `height` on the element, not just `aspect-ratio`:

```css
.flex-item {
  width: 100%; /* explicit constraint */
  aspect-ratio: 16 / 9; /* now Safari can resolve height */
}
```

In scroll containers, also set `min-height: 0` or `min-width: 0`:

```css
.scroll-child {
  min-width: 0;
  aspect-ratio: 1;
}
```

---

## 14. Safe Area Insets

For notched devices and home indicator bars. The `env()` values return `0` unless `viewport-fit=cover` is set.

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

```css
.bottom-bar {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

.full-bleed {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

Available: `safe-area-inset-top`, `safe-area-inset-right`, `safe-area-inset-bottom`, `safe-area-inset-left`.

**Tailwind:** `pb-[max(1rem,env(safe-area-inset-bottom))]`, `px-[env(safe-area-inset-left)]`.

Support: 96.78% global. All modern browsers.

---

## Quick Safari Reset

Minimal rules to prevent the most common Safari issues:

```css
body {
  -webkit-font-smoothing: antialiased;
}

input,
select,
textarea {
  font-size: max(16px, 1rem);
}

/* On any element that clips content and has rounded corners */
.clip-rounded {
  overflow: clip;
  isolation: isolate;
}
```

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

---

Sources: WebKit blog (release notes), Apple Developer docs, Ahmad Shadeed (ishadeed.com), Ben Frain, Josh Comeau, defensivecss.dev, MDN, Polypane, WebKit Bugzilla #297779 #231360.
