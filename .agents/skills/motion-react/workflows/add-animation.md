# Workflow: Add Animation to Component

<required_reading>
**Read these reference files NOW:**
1. references/imports-and-setup.md
2. references/animation-props.md
3. references/gestures.md (if adding interaction)
4. references/scroll-animations.md (if scroll-based)
</required_reading>

<process>
## Step 1: Identify Animation Type

Ask: "What triggers the animation?"

| Trigger | Approach |
|---------|----------|
| On mount | `initial` + `animate` |
| On state change | `animate` with state-driven values |
| On hover | `whileHover` |
| On click/tap | `whileTap` |
| On focus | `whileFocus` |
| On drag | `drag` + `whileDrag` |
| On scroll (viewport) | `whileInView` |
| On scroll (linked) | `useScroll` + `useTransform` |
| On exit/unmount | `AnimatePresence` + `exit` |
| Orchestrated children | `variants` with `staggerChildren` |

## Step 2: Set Up Import

```tsx
"use client"  // Required for client components
import { motion } from "motion/react"

// Additional imports as needed:
import { AnimatePresence, useScroll, useTransform } from "motion/react"
```

## Step 3: Convert to Motion Component

```tsx
// Before
<div className="card">Content</div>

// After
<motion.div className="card">Content</motion.div>
```

## Step 4: Add Animation Props

**Basic enter animation:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

**Gesture animation:**
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>
```

**Exit animation:**
```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>
```

**Scroll-linked:**
```tsx
const { scrollYProgress } = useScroll()

return (
  <motion.div
    style={{
      scaleX: scrollYProgress,
      transformOrigin: "left"
    }}
  />
)
```

## Step 5: Add Performance Optimization

For frequently animated elements:
```tsx
<motion.div
  style={{ willChange: "transform" }}
  animate={{ x: 100 }}
/>
```

## Step 6: Verify

```bash
# Build to check for errors
pnpm build

# Check browser console for Motion warnings
# Test animation triggers correctly
# Verify 60fps performance (no jank)
```
</process>

<anti_patterns>
Avoid:
- Importing from `framer-motion` instead of `motion/react`
- Reading MotionValue with `.get()` in render
- Missing `key` prop on AnimatePresence children
- Using `transition` prop with motion value styles
- Animating `width`/`height` instead of `scale`
</anti_patterns>

<success_criteria>
Animation is complete when:
- [ ] Correct import from `motion/react`
- [ ] Motion component wraps target element
- [ ] Animation triggers at correct time
- [ ] Smooth 60fps performance
- [ ] Exit animations work (if applicable)
- [ ] No console warnings
- [ ] `willChange` added for GPU acceleration (if needed)
</success_criteria>
