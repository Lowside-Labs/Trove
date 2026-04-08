<overview>
Motion provides a hybrid animation engine combining JavaScript with native browser APIs for 120fps GPU-accelerated animations. Bundle size is ~34kb by default but can be reduced to ~5kb with optimization.
</overview>

<willChange>
**Hardware acceleration with willChange:**
```tsx
<motion.div
  style={{
    willChange: "transform"
  }}
  animate={{ x: 100, scale: 1.2 }}
/>
```

**Valid willChange values:**
- `transform` — for x, y, scale, rotate, etc.
- `opacity` — for opacity animations
- `filter` — for blur, brightness, etc.
- `clipPath` — for clip-path animations

**When to use:**
```tsx
// ✅ Needed — independent transforms don't auto-promote layer
<motion.div style={{ willChange: "transform" }} animate={{ x: 100, scale: 1.1 }} />

// ✅ Not needed — WAAPI (transform string) auto-promotes the layer
<motion.div animate={{ transform: "translateX(100px) scale(1.1)" }} />

// ⚠️ Don't overuse — each creates a new compositor layer
// Only apply to elements that actually animate with independent transforms
```
</willChange>

<transform_optimization>
**Prefer `transform` string for WAAPI acceleration:**
```tsx
// ✅ Best — runs via WAAPI (native browser, 120fps capable)
<motion.div animate={{ transform: "translateX(100px) scale(1.2) rotate(45deg)" }} />

// ⚠️ Uses Motion's JS engine — still good, but not WAAPI
<motion.div animate={{ x: 100, scale: 1.2, rotate: 45 }} />
```

**Use independent transforms when:**
- Different transforms need different transition settings
- Transforms are passed as MotionValues via `style`
- Competing/composable transforms (e.g. `animate` + `whileHover` on different axes):

```tsx
// Independent transforms needed here — separate concerns
<motion.div animate={{ x: 100 }} whileHover={{ scale: 1.2 }} />
```

**Independent transform properties (when needed):**
- Position: `x`, `y`, `z`
- Scale: `scale`, `scaleX`, `scaleY`, `scaleZ`
- Rotate: `rotate`, `rotateX`, `rotateY`, `rotateZ`
- Skew: `skewX`, `skewY`
- Origin: `originX`, `originY`, `originZ`
</transform_optimization>

<frame_callback_optimization>
**In functions running every frame (`useTransform`, `onUpdate`):**

```tsx
// ❌ Bad — creates objects/arrays each frame
useTransform(() => {
  const values = items.map(i => i.value)  // array allocation
  return { result: values.reduce((a, b) => a + b) }  // object allocation
})

// ✅ Good — no allocations
useTransform(() => value.get() * 2)  // primitive return

// ❌ Bad — array methods create iterators
items.forEach(item => process(item))
Object.entries(obj).map(([k, v]) => ...)

// ✅ Good — for loops are faster
for (let i = 0; i < items.length; i++) {
  process(items[i])
}
```

**Rules for frame callbacks:**
1. Avoid object/array allocation
2. Prefer mutation over creation
3. Use `for` loops over `forEach`/`map`
4. Avoid `Object.entries`, `Object.values`, `Object.keys`
5. Return primitives when possible
</frame_callback_optimization>

<bundle_size>
**Default bundle size:** ~34kb (minified + gzipped)

**Reducing bundle size:**

**Option 1: Use `m` component + LazyMotion**
```tsx
import { LazyMotion, m, domAnimation } from "motion/react"

// domAnimation: ~17kb (basic animations)
// domMax: ~34kb (all features including layout)

function App() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div animate={{ opacity: 1 }} />
    </LazyMotion>
  )
}
```

**Option 2: Dynamic import for lazy loading**
```tsx
// features.ts
export { domAnimation as default } from "motion/react"

// App.tsx
const loadFeatures = () => import("./features").then(mod => mod.default)

function App() {
  return (
    <LazyMotion features={loadFeatures} strict>
      <m.div animate={{ opacity: 1 }} />
    </LazyMotion>
  )
}
```

**Important:** Don't mix `motion` and `m` — using `motion` anywhere breaks LazyMotion benefits.

**Option 3: useAnimate mini**
```tsx
import { useAnimate } from "motion/react"
// Full: ~17kb
// Mini (WAAPI only): ~2.3kb

// Mini version only uses Web Animations API
// No motion values, sequences, or independent transforms
```
</bundle_size>

<animation_performance>
**Avoid animating layout-triggering properties:**
```tsx
// ❌ Triggers layout — slow
animate={{ width: 100, height: 100, top: 50, left: 50 }}

// ✅ Uses transforms — fast
animate={{ scale: 1.5, x: 50, y: 50 }}
```

**Use layout prop for layout changes:**
```tsx
// Instead of animating width/height manually
// Let Motion handle it with FLIP animations
<motion.div layout style={{ width: isExpanded ? 400 : 200 }} />
```

**Stagger to reduce simultaneous animations:**
```tsx
// Animating 100 items simultaneously can be slow
// Stagger them to spread the load
<motion.ul>
  {items.map((item, i) => (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: i * 0.02 }}  // 20ms stagger
    />
  ))}
</motion.ul>
```
</animation_performance>

<reduced_motion>
**Respecting user preferences:**
```tsx
import { useReducedMotion } from "motion/react"

function Component() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      animate={{
        x: shouldReduceMotion ? 0 : 100,
        opacity: 1  // keep this — accessibility
      }}
    />
  )
}
```

**Global setting:**
```tsx
import { MotionConfig } from "motion/react"

function App() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? "always" : "never"}>
      {/* All motion components respect this */}
    </MotionConfig>
  )
}
```
</reduced_motion>

<profiling>
**Debugging performance:**
1. Use Chrome DevTools Performance tab
2. Look for long tasks during animations
3. Check for layout thrashing (forced reflows)
4. Monitor compositor layers in Layers panel

**Common issues:**
- Too many elements animating simultaneously
- Animating layout properties (width, height, top, left)
- Complex `useTransform` calculations
- Missing `willChange` on frequently animated elements
- Too many layout animations on large lists
</profiling>
