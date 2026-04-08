# Intrinsic Layout

Techniques that make layouts adapt without media queries. The browser resolves the layout continuously at every width.

---

## 1. The Fluid Grid

The single most important pattern for eliminating layout breakpoints.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}
```

**How it works:**

- `repeat(auto-fill, ...)` — generate as many columns as fit
- `minmax(250px, 1fr)` — each column is at least 250px, grows equally to fill remaining space
- Column count is a continuous function of container width, not a breakpoint decision

**The `min()` guard:** Raw `minmax(250px, 1fr)` breaks on viewports narrower than 250px. Wrapping in `min(250px, 100%)` makes it evaluate to `100%` on small screens, gracefully falling to a single column.

**auto-fill vs auto-fit:**

| Behavior                 | auto-fill                                    | auto-fit                             |
| ------------------------ | -------------------------------------------- | ------------------------------------ |
| Empty tracks             | Kept (items stay at min size)                | Collapsed to zero                    |
| Few items on wide screen | Items maintain minimum width                 | Items stretch to fill row            |
| Use when                 | Product grids, galleries (consistent sizing) | Feature cards (fill available space) |

**Minmax sweet spots:**

- Cards/tiles: `minmax(min(280px, 100%), 1fr)`
- Thumbnails/gallery: `minmax(min(150px, 100%), 1fr)`
- Text content: `minmax(min(35ch, 100%), 1fr)`

Tailwind: `grid grid-cols-[repeat(auto-fill,minmax(min(250px,100%),1fr))]`

---

## 2. Flexbox Wrapping

Layouts that exist in a "superposition" of states without any breakpoints.

### The Sidebar

Two-column layout that automatically stacks when space runs out:

```css
.with-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, 1rem);
}

.sidebar {
  flex-basis: 20rem;
  flex-grow: 1;
}

.not-sidebar {
  flex-basis: 0;
  flex-grow: 999;
  min-inline-size: 50%;
}
```

**How it works:** The main content has `flex-grow: 999` so it aggressively claims space, but `min-inline-size: 50%` forces it onto its own line once it would be squeezed below half the container. The breakpoint is emergent — it happens at exactly the width where both can't fit. No magic number.

### The Switcher

Horizontal row that flips to vertical stack based on container width:

```css
.switcher {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, 1rem);
  --threshold: 30rem;
}

.switcher > * {
  flex-grow: 1;
  flex-basis: calc((var(--threshold) - 100%) * 999);
}
```

When container > `--threshold`, the calc yields a large negative number (clamped to 0), so items share one row. When narrower, it yields a huge positive number, forcing `flex-basis: 100%` and stacking.

### General wrapping

For any naturally responsive list of items:

```css
.cluster > * {
  flex: 1 1 var(--item-min-width, 15rem);
}
```

Each item has a preferred minimum width. When items can't fit side-by-side at that basis, they wrap. `flex-grow: 1` ensures they fill the row.

---

## 3. min(), max(), clamp() for Everything

Most developers learn these for font-size. Their real power is in widths, padding, gaps, and spacing.

**Mental models:**

| Function                 | Mental model                        | Example       |
| ------------------------ | ----------------------------------- | ------------- |
| `min(a, b)`              | "Be this, but no larger than that"  | Ceiling/cap   |
| `max(a, b)`              | "Be this, but no smaller than that" | Floor/minimum |
| `clamp(min, ideal, max)` | "Stay between these bounds"         | Corridor      |

### Fluid container (the "smol container")

```css
.container {
  width: min(70rem, 100% - 3rem);
  margin-inline: auto;
}
```

Replaces `width: 100%; max-width: 70rem; padding-inline: 1.5rem;` in fewer lines. The `100% - 3rem` ensures gutters on small screens.

### Fluid padding

```css
section {
  padding-block: clamp(2rem, 5vw, 6rem);
  padding-inline: clamp(1rem, 3vw, 4rem);
}
```

Grows with viewport continuously. On 320px, `5vw` = 16px, so clamp selects the 2rem floor. On 1440px, `5vw` = 72px, capped at 6rem.

### Fluid gap

```css
.grid {
  gap: clamp(1rem, 2.5vw, 2.5rem);
}
```

### Readable paragraph width

```css
p {
  width: clamp(45ch, 50%, 75ch);
}
```

50% of container, but never narrower than 45 characters or wider than 75.

### Fluid typography

```css
h1 {
  font-size: clamp(2.5rem, 4vw + 1rem, 4.5rem);
}
```

**Critical:** Always include a `rem` component in the preferred value (`4vw + 1rem`). Pure `vw` units don't scale with user zoom, violating WCAG. The `+ 1rem` ensures zoom still affects the size.

### Composability

These functions nest: `min()` inside `minmax()` inside `repeat()` is valid and common.

---

## 4. Intrinsic Sizing Keywords

Let content determine element size instead of specifying dimensions.

| Keyword              | Behavior                                                 |
| -------------------- | -------------------------------------------------------- |
| `min-content`        | Shrinks to smallest size without overflow (longest word) |
| `max-content`        | Expands to fit all content on one line                   |
| `fit-content`        | Like max-content, capped at container width              |
| `fit-content(300px)` | Like max-content, capped at 300px                        |

**Content-sized navigation:**

```css
nav {
  width: fit-content;
  margin-inline: auto;
}
```

**Content-sized sidebar + fluid main (holy grail):**

```css
.layout {
  display: grid;
  grid-template-columns: fit-content(300px) minmax(50%, 1fr);
}
```

Sidebar sizes to content (max 300px). Main area takes the rest but never shrinks below 50%.

**Tags/pills:**

```css
.tag {
  width: fit-content;
}
```

Exactly as wide as text + padding. No fixed width needed.

---

## 5. Container Queries vs Media Queries

**Mental model:** Media queries for page-level decisions. Container queries for component-level adaptation. Intrinsic techniques (auto-fill, flex-wrap) beat both when possible.

| Use media queries for...           | Use container queries for...                |
| ---------------------------------- | ------------------------------------------- |
| Global layout (sidebar visibility) | Component layout (card horizontal/vertical) |
| Navigation pattern switching       | Widgets in different-width contexts         |
| Accessibility preferences          | Design system components                    |

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (width >= 400px) {
  .card {
    grid-template-columns: 200px 1fr;
  }
}
```

**Container query units** (`cqi`, `cqw`) size relative to the container:

```css
.card-title {
  font-size: clamp(1rem, 3cqi, 1.5rem);
}
```

**Rules:**

- Always use `container-type: inline-size` (not `size`) unless height queries are genuinely needed. Height queries can cause layout loops.
- Always name containers for clarity.
- Support: Chrome 105+, Firefox 110+, Safari 16+ (95%+).

Tailwind v4: `@container` parent, `@md:flex-row` child. Built-in, no plugin. Container breakpoints: `@xs` 320px, `@sm` 384px, `@md` 448px, `@lg` 512px, `@xl` 576px.

---

## 6. Subgrid

Aligning nested elements across siblings without hacks.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 1.5rem;
}

.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
}
```

Every card's title row, content row, and CTA row align horizontally across all cards, even with different content lengths.

**Use when:** Card CTAs must bottom-align, form labels must align across rows, pricing table features must line up.

Support: Baseline Widely Available (Chrome 117+, Firefox 71+, Safari 16+).

---

## 7. aspect-ratio as a Layout Tool

Not just for images — creates proportional constraints without specifying both dimensions.

**Proportional heroes:**

```css
.hero {
  aspect-ratio: 21 / 9;
  max-block-size: 60vh;
  overflow: hidden;
}
```

**Skeleton/loading placeholders (prevents CLS):**

```css
.skeleton {
  aspect-ratio: var(--expected-ratio, 16 / 9);
}
```

**Per-breakpoint aspect ratios (one of the few valid breakpoint uses):**

```css
.tile {
  aspect-ratio: 3 / 4; /* tall on mobile */
}
@media (width >= 768px) {
  .tile {
    aspect-ratio: auto;
  } /* grid row determines height on desktop */
}
```

Tailwind: `aspect-video` (16:9), `aspect-square` (1:1), `aspect-[4/3]`.

---

## 8. Spacing Philosophy

### Gap as primary mechanism

Spacing between children belongs on the parent, not children.

```css
/* Fragile — orphaned margin, :last-child overrides */
.grid > * {
  margin-bottom: 1rem;
}
.grid > *:last-child {
  margin-bottom: 0;
}

/* Robust — gap only creates space between items */
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
```

**Why gap wins:** No orphaned spacing on last child. No negative margin hacks. Single source of truth. Composable with `clamp()`.

### The flow pattern (for heterogeneous spacing)

Gap is uniform. When different element types need different spacing (less after headings, more between sections), use the flow/owl pattern:

```css
.flow > * + * {
  margin-block-start: var(--flow-space, 1em);
}

/* Tighter after headings */
.flow :is(h2, h3, h4) + * {
  --flow-space: var(--space-s);
}
```

**Rule:** Use `gap` for homogeneous spacing (grids, icon rows, button groups). Use flow for vertical prose where spacing varies by element type.

---

## 9. Logical Properties

Replace all directional properties with logical equivalents. Fewer declarations, semantic correctness, automatic RTL support.

| Physical                       | Logical                      | Benefit                        |
| ------------------------------ | ---------------------------- | ------------------------------ |
| `margin-left` + `margin-right` | `margin-inline`              | One declaration instead of two |
| `margin-top` + `margin-bottom` | `margin-block`               | One declaration instead of two |
| `padding-left`                 | `padding-inline-start`       | RTL-aware                      |
| `width`                        | `inline-size`                | Semantic                       |
| `height`                       | `block-size`                 | Semantic                       |
| `top`/`bottom`/`left`/`right`  | `inset-block`/`inset-inline` | Shorthand                      |

**Start with the shorthands** — they cover 80% of use cases:

```css
.card {
  padding-block: 1.5rem;
  padding-inline: 2rem;
  margin-block-end: 1rem;
}

.container {
  margin-inline: auto;
  max-inline-size: 70rem;
}
```

---

## 10. Holy Grail Patterns

Composable primitives that handle common layouts without breakpoints.

### The Stack (vertical rhythm)

```css
.stack {
  display: flex;
  flex-direction: column;
}
.stack > * + * {
  margin-block-start: var(--space, 1.5rem);
}
```

### The Cluster (horizontal wrapping — tags, buttons, breadcrumbs)

```css
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, 1rem);
  align-items: center;
}
```

### The Center (max-width + gutters)

```css
.center {
  margin-inline: auto;
  max-inline-size: var(--measure, 60ch);
  padding-inline: var(--space, 1rem);
}
```

### The Cover (vertically centered hero)

```css
.cover {
  display: flex;
  flex-direction: column;
  min-block-size: 100svh;
}
.cover > .centered {
  margin-block: auto;
}
```

### Full-bleed within constrained content

```css
.full-width {
  display: grid;
  grid-template-columns: 1fr min(65ch, 100%) 1fr;
}
.full-width > * {
  grid-column: 2;
}
.full-width > .breakout {
  grid-column: 1 / -1;
}
```

Content stays within readable measure. `.breakout` elements span edge to edge.

---

## Fluid Spacing Scale (Utopia approach)

Define spacing that interpolates between viewport sizes:

```css
:root {
  --space-s: clamp(1rem, 0.857rem + 0.71vw, 1.5rem);
  --space-m: clamp(1.5rem, 1.286rem + 1.07vw, 2.25rem);
  --space-l: clamp(2rem, 1.714rem + 1.43vw, 3rem);
  --space-xl: clamp(3rem, 2.571rem + 2.14vw, 4.5rem);
}
```

Use throughout: `gap: var(--space-m)`, `padding-block: var(--space-xl)`. Every value becomes responsive without a single breakpoint. Generate values at utopia.fyi.

---

## Summary

1. **Describe constraints, not breakpoints.** `minmax()`, `clamp()`, `min()`, `max()`.
2. **Spacing belongs on relationships.** Gap for uniform, flow for heterogeneous.
3. **Content should size itself.** `fit-content`, `min-content`, `max-content`, `aspect-ratio`.
4. **Components respond to their container.** Container queries > media queries for components.
5. **Think in block and inline.** Logical properties everywhere.
6. **Alignment propagates through nesting.** Subgrid for cross-component alignment.
7. **The best media query is the one you never write.**

Sources: Jen Simmons (Intrinsic Web Design), Heydon Pickering & Andy Bell (Every Layout), Kevin Powell (Frontend Masters), Josh Comeau (Interactive Guide to CSS Grid), Una Kravets & Adam Argyle (web.dev), Rachel Andrew (subgrid spec), Steph Eckles (SmolCSS), Utopia (utopia.fyi).
