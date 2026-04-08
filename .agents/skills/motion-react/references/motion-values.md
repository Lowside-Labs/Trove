<overview>
MotionValues are composable, signal-like values that track state and velocity. They enable performant animations because Motion renders them with its optimized DOM renderer without triggering React re-renders.
</overview>

<useMotionValue>
**Creating motion values:**
```tsx
import { useMotionValue } from "motion/react"

function Component() {
  const x = useMotionValue(0)

  return <motion.div style={{ x }} />
}
```

**Updating values:**
```tsx
// Set directly (no re-render)
x.set(100)

// Get current value
const current = x.get()

// Get velocity (numbers only)
const velocity = x.getVelocity()
```

**Listening to changes:**
```tsx
// ✅ Correct
useEffect(() => {
  const unsubscribe = x.on("change", (latest) => {
    console.log(latest)
  })
  return unsubscribe
}, [x])

// ❌ Deprecated (never use)
x.onChange((latest) => { ... })
```

**Available events:**
- `"change"` — value changed
- `"animationStart"` — animation started
- `"animationComplete"` — animation finished
- `"animationCancel"` — animation cancelled
</useMotionValue>

<useTransform>
**Range mapping (preferred):**
```tsx
import { useTransform } from "motion/react"

// Map x: 0-100 → opacity: 1-0
const opacity = useTransform(x, [0, 100], [1, 0])

// With options
const opacity = useTransform(
  x,
  [0, 100],
  [1, 0],
  { clamp: false }  // continue mapping outside range
)
```

**Function form (preferred):**
```tsx
// Reactive function — re-runs when dependencies change
const doubled = useTransform(() => x.get() * 2)

// Multiple dependencies
const combined = useTransform(() => x.get() + y.get())
```

**Deprecated form (never use):**
```tsx
// ❌ Old callback form — deprecated
useTransform(x, (latest) => latest * 2)
```

**Color/complex value mapping:**
```tsx
const backgroundColor = useTransform(
  scrollYProgress,
  [0, 0.5, 1],
  ["#ff0000", "#00ff00", "#0000ff"]
)
```
</useTransform>

<useSpring>
**Creating spring-animated values:**
```tsx
import { useSpring } from "motion/react"

// From another motion value
const springX = useSpring(x)

// With configuration
const springX = useSpring(x, {
  stiffness: 100,
  damping: 30,
  restDelta: 0.001
})

// From static value (less common)
const springValue = useSpring(0, { stiffness: 300 })
```

**Spring configuration:**
| Property | Description | Default |
|----------|-------------|---------|
| stiffness | Spring stiffness | 100 |
| damping | Opposing force (0 = oscillate forever) | 10 |
| mass | Higher = more lethargic | 1 |
| restDelta | Minimum distance to consider "at rest" | 0.01 |
| restSpeed | Minimum speed to consider "at rest" | 0.01 |

**Common patterns:**
```tsx
// Smooth scroll progress
const { scrollYProgress } = useScroll()
const smoothProgress = useSpring(scrollYProgress, {
  stiffness: 100,
  damping: 30,
  restDelta: 0.001
})
```
</useSpring>

<anti_patterns>
**Never read MotionValue in render:**
```tsx
// ❌ Bad — causes re-renders, breaks reactivity
function Component() {
  const x = useMotionValue(0)
  return <div style={{ opacity: x.get() }} />  // ❌
}

// ✅ Good — pass motion value directly
function Component() {
  const x = useMotionValue(0)
  return <motion.div style={{ opacity: x }} />  // ✅
}
```

**Never use deprecated onChange:**
```tsx
// ❌ Deprecated
x.onChange((v) => console.log(v))

// ✅ Correct
x.on("change", (v) => console.log(v))
```

**Performance in transform functions:**
```tsx
// ❌ Bad — object allocation every frame
useTransform(() => ({ x: value.get(), y: value.get() }))

// ✅ Good — return primitive
useTransform(() => value.get() * 2)
```
</anti_patterns>

<animating_motion_values>
**Animate source directly:**
```tsx
import { animate } from "motion/react"

const x = useMotionValue(0)

// Animate the source
animate(x, 100, { duration: 1 })

// Derived values follow automatically
const opacity = useTransform(x, [0, 100], [1, 0])
```

**Don't use transition prop with motion value styles:**
```tsx
// ❌ Wrong — transition won't work with motion value in style
<motion.div
  style={{ x }}
  transition={{ duration: 1 }}  // ignored
/>

// ✅ Correct — animate the source
animate(x, 100, { duration: 1 })
```
</animating_motion_values>
