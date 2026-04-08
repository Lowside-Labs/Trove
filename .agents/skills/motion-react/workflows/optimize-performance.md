# Workflow: Optimize Animation Performance

<required_reading>
**Read these reference files NOW:**
1. references/performance.md
2. references/anti-patterns.md
</required_reading>

<process>
## Step 1: Measure Current Performance

```bash
# Open Chrome DevTools
# 1. Go to Performance tab
# 2. Click record
# 3. Trigger animations
# 4. Stop recording
# 5. Look for:
#    - Red bars (long tasks)
#    - Frame drops (below 60fps)
#    - Layout thrashing
```

## Step 2: Check for Common Issues

**Animating layout properties:**
```tsx
// ❌ Slow — triggers layout
animate={{ width: 200, height: 100, top: 50 }}

// ✅ Fast — uses transforms
animate={{ scale: 2, x: 50, y: 50 }}
```

**Missing GPU hints:**
```tsx
// ❌ May not be GPU accelerated
<motion.div animate={{ x: 100 }} />

// ✅ GPU accelerated
<motion.div
  style={{ willChange: "transform" }}
  animate={{ x: 100 }}
/>
```

**Heavy frame callbacks:**
```tsx
// ❌ Allocates every frame
useTransform(() => items.map(i => i.value))

// ✅ No allocations
useTransform(() => x.get() * 2)
```

## Step 3: Reduce Bundle Size

**Option 1: Use LazyMotion + m component**
```tsx
import { LazyMotion, domAnimation, m } from "motion/react"

function App() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div animate={{ opacity: 1 }} />  {/* Use m, not motion */}
    </LazyMotion>
  )
}

// Bundle size: ~17kb instead of ~34kb
```

**Option 2: Dynamic import**
```tsx
// features.ts
export { domAnimation as default } from "motion/react"

// App.tsx
const loadFeatures = () => import("./features").then(m => m.default)

function App() {
  return (
    <LazyMotion features={loadFeatures} strict>
      <m.div animate={{ opacity: 1 }} />
    </LazyMotion>
  )
}

// Initial render: ~5kb, features load async
```

**Important:** Never mix `motion` and `m` — using `motion` anywhere breaks LazyMotion benefits.

## Step 4: Optimize Staggered Animations

```tsx
// ❌ All 100 items animate simultaneously
{items.map(item => (
  <motion.div animate={{ opacity: 1 }} />
))}

// ✅ Stagger to spread the load
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.02 }  // 20ms between
  }
}

<motion.div variants={container} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div variants={item} />
  ))}
</motion.div>
```

## Step 5: Optimize Scroll Animations

```tsx
// ❌ Complex calculation every frame
const result = useTransform(() => {
  const values = data.filter(d => d.active).map(d => d.value)
  return values.reduce((a, b) => a + b, 0)
})

// ✅ Simple calculation
const y = useTransform(scrollYProgress, [0, 1], [0, -100])

// Add smoothing to reduce recalculations
const smoothY = useSpring(y, { stiffness: 100, damping: 30 })
```

## Step 6: Optimize Layout Animations

```tsx
// ❌ Full layout on every element
<ul>
  {items.map(item => <motion.li layout />)}
</ul>

// ✅ Position-only layout
<ul>
  {items.map(item => <motion.li layout="position" />)}
</ul>

// ✅ Layout group to coordinate
<LayoutGroup>
  <List />
  <Sidebar />
</LayoutGroup>
```

## Step 7: Respect Reduced Motion

```tsx
import { useReducedMotion } from "motion/react"

function Component() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      animate={{
        x: shouldReduceMotion ? 0 : 100
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3
      }}
    />
  )
}
```

## Step 8: Verify Improvements

```bash
# Re-measure performance
# 1. Record new Performance trace
# 2. Compare frame rate (should be 60fps)
# 3. Check bundle size with analyzer
# 4. Test on low-end device
```
</process>

<quick_wins>
| Issue | Quick Fix |
|-------|-----------|
| Jank | Add `willChange: "transform"` |
| Bundle size | Use `m` + `LazyMotion` |
| Layout properties | Use transforms instead |
| Many items | Add stagger to variants |
| Complex useTransform | Simplify, avoid allocations |
| Scroll jank | Add `useSpring` smoothing |
</quick_wins>

<success_criteria>
Optimization is complete when:
- [ ] Animations run at 60fps
- [ ] No layout thrashing in DevTools
- [ ] Bundle size reduced (if applicable)
- [ ] Respects reduced motion preference
- [ ] Works well on lower-end devices
- [ ] No unnecessary re-renders
</success_criteria>
