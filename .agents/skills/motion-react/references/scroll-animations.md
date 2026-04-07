<overview>
Motion supports two types of scroll animations: scroll-triggered (animate when element enters viewport) and scroll-linked (values tied to scroll progress). Use `whileInView` for triggered, `useScroll` for linked.
</overview>

<useScroll>
**Basic usage:**
```tsx
import { useScroll } from "motion/react"

function Component() {
  const { scrollY, scrollYProgress } = useScroll()

  return <motion.div style={{ opacity: scrollYProgress }} />
}
```

**Return values:**
| Value | Description |
|-------|-------------|
| `scrollX` | Absolute horizontal scroll position (pixels) |
| `scrollY` | Absolute vertical scroll position (pixels) |
| `scrollXProgress` | Horizontal progress (0-1) |
| `scrollYProgress` | Vertical progress (0-1) |

**All values are MotionValues** — use them directly in `style` or transform with `useTransform`.
</useScroll>

<scroll_container>
**Track a scrollable container:**
```tsx
const containerRef = useRef(null)

const { scrollYProgress } = useScroll({
  container: containerRef
})

return (
  <div ref={containerRef} style={{ overflow: "auto", height: 400 }}>
    {/* scrollable content */}
  </div>
)
```
</scroll_container>

<scroll_target>
**Track element progress through viewport:**
```tsx
const targetRef = useRef(null)

const { scrollYProgress } = useScroll({
  target: targetRef,
  offset: ["start end", "end start"]
})

return (
  <motion.div
    ref={targetRef}
    style={{ opacity: scrollYProgress }}
  />
)
```

**Offset explained:**
- First value: when animation starts
- Second value: when animation ends
- Format: `"[target] [container]"`

**Common offsets:**
```tsx
// Element enters from bottom, exits at top
offset: ["start end", "end start"]
// Progress 0 → 1 as element scrolls through viewport

// Element at top of viewport
offset: ["start start", "end start"]
// Progress 0 when element top hits viewport top
// Progress 1 when element bottom hits viewport top

// Center of element at center of viewport
offset: ["center center", "center center"]

// With pixel offsets
offset: ["start end", "end start-100px"]
```
</scroll_target>

<scroll_patterns>
**Progress bar:**
```tsx
function ProgressBar() {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      style={{
        scaleX: scrollYProgress,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: "#3b82f6",
        transformOrigin: "left"
      }}
    />
  )
}
```

**Parallax effect:**
```tsx
function Parallax({ children, speed = 0.5 }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${speed * 100}%`])

  return (
    <div ref={ref}>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  )
}
```

**Scroll-linked color:**
```tsx
const { scrollYProgress } = useScroll()

const backgroundColor = useTransform(
  scrollYProgress,
  [0, 0.5, 1],
  ["#ffffff", "#3b82f6", "#1e1e1e"]
)

return <motion.div style={{ backgroundColor }} />
```
</scroll_patterns>

<smoothing>
**Smooth scroll values with useSpring:**
```tsx
const { scrollYProgress } = useScroll()

const smoothProgress = useSpring(scrollYProgress, {
  stiffness: 100,
  damping: 30,
  restDelta: 0.001
})

return <motion.div style={{ scaleX: smoothProgress }} />
```

This adds a spring-based lag that makes scroll-linked animations feel smoother.
</smoothing>

<scroll_velocity>
**Track scroll velocity:**
```tsx
import { useScroll, useVelocity, useTransform } from "motion/react"

function Component() {
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)

  // Scale based on scroll speed
  const scale = useTransform(
    scrollVelocity,
    [-1000, 0, 1000],
    [0.9, 1, 0.9]
  )

  return <motion.div style={{ scale }} />
}
```
</scroll_velocity>

<useInView>
**Alternative to whileInView for more control:**
```tsx
import { useInView } from "motion/react"

function Component() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
    />
  )
}
```

**Options:**
```tsx
const isInView = useInView(ref, {
  once: true,        // only trigger once
  amount: "all",     // "some" | "all" | number (0-1)
  margin: "-100px",  // CSS margin format
  root: scrollRef    // custom scroll container
})
```
</useInView>

<performance_tips>
**Optimize scroll-linked animations:**
1. Use `willChange: "transform"` for animated elements
2. Prefer transforms over layout properties
3. Use `useSpring` to smooth out rapid scroll changes
4. Avoid complex calculations in `useTransform` functions

```tsx
// ✅ Good — simple transform
const y = useTransform(scrollYProgress, [0, 1], [0, -100])

// ⚠️ Avoid — complex calculation every frame
const result = useTransform(() => {
  const values = data.map(d => d.value)  // ❌ creates array
  return values.reduce((a, b) => a + b)
})
```
</performance_tips>
