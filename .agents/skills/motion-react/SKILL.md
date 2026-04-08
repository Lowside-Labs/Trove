---
name: motion-react
description: Motion for React animation library (formerly Framer Motion). Use when working with animations, motion components, useTransform, useSpring, AnimatePresence, or any file importing from motion/react or framer-motion. Also covers Base UI and Radix integration.
---

<essential_principles>

Framer Motion is now called Motion for React. All framer-motion knowledge applies.

**Imports — CRITICAL:**
- **Never** import from `framer-motion` — always `motion/react`
- Server components: `import * as motion from "motion/react-client"`
- Client components (`"use client"`): `import { motion } from "motion/react"`
- `animate` function: React files use `motion/react`, non-React use `motion`

**Performance in frame callbacks** (`useTransform`, `onUpdate`):
- Avoid object allocation, prefer mutation
- Use `for` loops over `forEach`/`map`
- Avoid `Object.entries`, `Object.values`

**Transform optimization (WAAPI):**
- Prefer `transform` string over independent transforms — `transform` runs via WAAPI (native browser, 120fps capable)
- Use independent transforms (`x`, `y`, `scale`) only when:
  - Different transforms need different transition settings
  - Transforms are passed as MotionValues
  - Defining transforms via `style` prop
  - Competing/composable transforms (e.g. `animate={{ x: 100 }}` + `whileHover={{ scale: 1.2 }}`)
- `willChange: "transform"` is only needed with independent transforms or CSS transitions — WAAPI (`transform` string) auto-promotes the layer
- Only valid `willChange` values: `transform`, `opacity`, `clipPath`, `filter`

**Design guidance for transitions:**
- Prefer physics-based springs for physical motion (`x`, `rotate`, `scale`), especially interruptible animations
- For non-numerical values use `type: "spring", bounce: 0.2, visualDuration: 0.4`
- Match animation personality to the interface: serious UIs (finance, productivity) = no overshoot; playful UIs = softer curves, longer durations

**Motion Values — CRITICAL:**
- Use `value.on("change", update)` — never `value.onChange()` (deprecated)
- **Never** read MotionValue in render: `propName={value.get()}` ❌
- Only read in effects/callbacks: `useTransform(() => value.get())` ✓

**useTransform:**
```tsx
// ✅ Preferred
useTransform(value, inputRange, outputRange, options)  // range mapping
useTransform(() => otherValue.get() * 2)               // function

// ❌ Deprecated (never use)
useTransform(value, (latest) => newValue)
```

**Animating MotionValues:**
- Use `animate()` function on source MotionValue directly
- Don't use `transition` prop when values driven by MotionValues via `style`
- Derived values (`useTransform`, `useSpring`) follow automatically

</essential_principles>

<intake>
**What would you like to do?**

1. Add animation to a component
2. Debug animation issues
3. Optimize animation performance
4. Integrate with Radix UI
5. Integrate with Base UI
6. Something else

**Wait for response, then read the matching workflow and follow it.**
</intake>

<routing>
| Response | Workflow |
|----------|----------|
| 1, "add", "animate", "create", "new" | `workflows/add-animation.md` |
| 2, "debug", "fix", "broken", "not working", "bug" | `workflows/debug-animation.md` |
| 3, "optimize", "performance", "slow", "laggy", "bundle" | `workflows/optimize-performance.md` |
| 4, "radix", "radix-ui", "dialog", "tooltip", "dropdown" | `workflows/integrate-radix.md` |
| 5, "base ui", "base-ui", "menu", "popover", "contextmenu" | `workflows/integrate-base-ui.md` |
| 6, other | Clarify intent, then select appropriate workflow or reference |

**After reading the workflow, follow it exactly.**
</routing>

<verification_loop>
After every animation change:

```bash
# 1. Does it build?
pnpm build  # or npm run build

# 2. Check browser console for warnings
# Motion logs deprecation warnings for old APIs

# 3. Test the animation
# - Does it trigger correctly?
# - Does it feel smooth (60fps)?
# - Does exit animation work?
```

Report to user:
- "Build: ✓"
- "Animation triggers on [event]"
- "Ready for you to check [specific behavior]"
</verification_loop>

<reference_index>
All domain knowledge in `references/`:

**Setup:** imports-and-setup.md
**Core APIs:** motion-values.md, animation-props.md
**Interactions:** gestures.md, scroll-animations.md
**Layout:** layout-animations.md
**Integration:** radix-integration.md, base-ui-integration.md
**Optimization:** performance.md, anti-patterns.md
</reference_index>

<workflows_index>
| Workflow | Purpose |
|----------|---------|
| add-animation.md | Add animation to a component |
| debug-animation.md | Find and fix animation issues |
| optimize-performance.md | Improve performance, reduce bundle size |
| integrate-radix.md | Animate Radix UI components |
| integrate-base-ui.md | Animate Base UI components |
</workflows_index>
