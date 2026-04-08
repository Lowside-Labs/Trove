# Testing & Pre-Ship Checklist

Practical guide for testing on real devices and catching issues before deployment.

---

## Accessing Localhost on iPhone

### Same network (fastest)

1. Mac and iPhone on the same Wi-Fi
2. Find Mac IP: `ipconfig getifaddr en0` (or System Settings > Network)
3. Dev server must bind to `0.0.0.0` (Next.js dev does this by default)
4. On iPhone: `http://<mac-ip>:3000`

### ngrok (across networks, HTTPS)

```bash
brew install ngrok
ngrok config add-authtoken <your-token>  # one-time
ngrok http 3000
```

Gives a public HTTPS URL. Required for testing features that need HTTPS (clipboard API, geolocation, service workers).

---

## Safari Remote Debugging

1. **iPhone:** Settings > Safari > Advanced > Web Inspector (enable)
2. **Mac:** Safari > Settings > Advanced > "Show features for web developers" (check)
3. Connect iPhone to Mac via USB (or Wi-Fi if paired in Finder)
4. Mac Safari > Develop menu > your iPhone > select the tab
5. Full Web Inspector: DOM, styles, console, network, performance

---

## Chrome DevTools vs Real iPhone Safari

| Issue                        | Chrome DevTools emulation | Real iPhone Safari                         |
| ---------------------------- | ------------------------- | ------------------------------------------ |
| Scrolling                    | Simulated, no rubber-band | Native elastic overscroll                  |
| `100vh`                      | Correct                   | Includes browser chrome (use `100svh`)     |
| `position: fixed` + keyboard | Works fine                | Elements jump when keyboard opens          |
| Font rendering               | Chrome rendering engine   | Thinner/different subpixel rendering       |
| Hover states                 | Simulated correctly       | Touch triggers hover, stays "stuck"        |
| Input focus zoom             | No zoom                   | Zooms on inputs < 16px, never auto-unzooms |
| Safe area insets             | Always 0                  | Real insets on notched devices             |
| Horizontal overflow          | May not catch             | Reveals horizontal scroll you missed       |
| `backdrop-filter`            | Smooth                    | Can cause scroll jank on older iPhones     |
| Video autoplay               | Always works              | Requires `muted` + `playsinline`           |

**Key insight:** Outside the EU, all browsers on iPhone use Safari's WebKit engine underneath — "Chrome on iPhone" is just Safari with a different UI. In the EU (iOS 17.4+), alternative engines (Blink, Gecko) are permitted, so this may no longer hold for EU users.

---

## Pre-Ship Mobile Checklist

### Layout

- [ ] No unexpected horizontal scrolling (check at 320px, 375px, 414px)
- [ ] Hero CTA visible without scrolling (above the fold on shortest viewport)
- [ ] Sticky/fixed elements don't overlap content or each other
- [ ] No content hidden behind notch or home indicator (safe area insets applied)
- [ ] `100svh` used instead of `100vh` for full-height sections

### Touch

- [ ] All tap targets are at least 44x44px (visual or hit area)
- [ ] `touch-action: manipulation` on interactive elements (prevents double-tap-to-zoom)
- [ ] No sticky hover states on touch devices (`@media (hover: hover)` for hover effects)
- [ ] `-webkit-tap-highlight-color: transparent` if default tap highlight is unwanted

### Forms

- [ ] Input font-size is 16px+ (prevents iOS auto-zoom)
- [ ] Fixed/sticky elements handle virtual keyboard correctly (Visual Viewport API or avoid fixed on input pages)
- [ ] Form submits with Enter / keyboard submit button

### Media

- [ ] Videos have `muted playsinline` for autoplay on iOS
- [ ] Images use `loading="lazy"` below fold, `fetchpriority="high"` on LCP image
- [ ] Image containers use `aspect-ratio` to prevent CLS
- [ ] SVGs have explicit `width`/`height` or `min-width: 0` in flex containers

### Performance

- [ ] Only `transform` and `opacity` are animated (no width/height/margin)
- [ ] `will-change` applied to fewer than 10 elements
- [ ] `backdrop-filter` blur is under 20px or limited to desktop
- [ ] `content-visibility: auto` on heavy off-screen sections (always pair with `contain-intrinsic-size` to prevent zero-height rendering and scroll issues)

### Accessibility

- [ ] Every animation has `prefers-reduced-motion` fallback
- [ ] Icon buttons have `aria-label`
- [ ] Focus order is logical (no `tabindex` > 0)
- [ ] Body scroll is locked when modal/drawer is open (`overflow: hidden` on body + `overscroll-behavior: contain` on modal content to prevent scroll chaining)

---

## Quick Diagnostic Commands

```bash
# Find Mac IP for iPhone testing
ipconfig getifaddr en0

# Expose localhost with HTTPS
ngrok http 3000

# Check for horizontal overflow issues (in browser console)
document.querySelectorAll('*').forEach(el => {
  if (el.scrollWidth > el.clientWidth) {
    console.log('Overflow:', el, el.scrollWidth - el.clientWidth + 'px');
  }
});
```

---

Sources: Josh Comeau (Local Testing on an iPhone), Apple Developer (Safari Web Inspector docs), MDN.
