---
name: css-craft
description: >-
  Expert CSS guidance for fluid, resilient interfaces, including intrinsic
  layout, modern CSS features, Safari and iOS quirks, shadow and ring clipping
  fixes, pseudo-elements, mobile performance, and responsive UI polishing.
---

# CSS Craft

Expert-level CSS for building interfaces that adapt intrinsically, render correctly on Safari, and perform well on mobile.

## The Governing Principle

**Describe constraints, not breakpoints.** Use `minmax()`, `clamp()`, `min()`, `max()`, intrinsic sizing keywords, and flex wrapping to tell the browser the range of acceptable values. Let it resolve the layout at every viewport width continuously. Only reach for a media query when the change is **qualitative** (show/hide an element, reorder content, swap navigation patterns), never quantitative (column count, spacing amount, font size).

## Do I Need a Media Query?

```
Is this about column count or spacing?
├── Yes → Use auto-fill/minmax grid or flex-wrap. No query needed.
└── No
    Is this about font size or padding scaling?
    ├── Yes → Use clamp(). No query needed.
    └── No
        Does the component need to adapt to its own container width?
        ├── Yes → Use a container query.
        └── No
            Is this a page-level structural change (nav pattern, sidebar visibility)?
            └── Yes → Use a media query. This is what they're for.
```

## Safari CSS Reset

Apply to every project. Prevents the most common Safari issues:

```css
body {
  -webkit-font-smoothing: antialiased;
}

input,
select,
textarea {
  font-size: max(16px, 1rem); /* prevent iOS zoom on focus */
}

.needs-clip {
  overflow: clip; /* not hidden — doesn't break sticky, no scroll context */
}

.has-rounded-children {
  overflow: clip; /* clip content to rounded corners */
  isolation: isolate; /* fix Safari bug where transforms escape the clip */
}
```

And in the viewport meta tag:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

## Shadow / Ring Clipping Quick Fix

When `box-shadow`, `outline`, or `ring` gets clipped by a scrollable parent (`overflow-y: auto`):

```css
.scroll-parent {
  overflow-y: auto;
  padding-inline: 8px; /* breathing room for shadow */
  margin-inline: -8px; /* cancel layout shift */
}
```

Tailwind: `overflow-y-auto px-2 -mx-2`. See `modern-css-techniques.md` section 13 for the full decision tree.

## Reference Files

Load the appropriate reference based on the task:

| Task                                                               | Reference                                                       |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Layout, grids, spacing, fluid design, eliminating breakpoints      | [intrinsic-layout.md](references/intrinsic-layout.md)           |
| Modern CSS features, reducing JS, new APIs, color, pseudo-elements | [modern-css-techniques.md](references/modern-css-techniques.md) |
| Safari/iOS bugs, workarounds, quirks                               | [safari-quirks.md](references/safari-quirks.md)                 |
| Testing on real devices, pre-ship checklist                        | [testing-checklist.md](references/testing-checklist.md)         |

When reviewing or writing CSS, read the relevant reference file(s) first to apply expert-level patterns. For Safari debugging, always start with `safari-quirks.md`.
