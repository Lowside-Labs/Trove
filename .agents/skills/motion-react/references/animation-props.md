<overview>
Core animation props for motion components. Motion automatically creates appropriate transitions based on value types — springs for physical properties (x, scale), duration-based for others (opacity, color).
</overview>

<basic_animation>
**animate prop:**
```tsx
// Animate on mount
<motion.div animate={{ x: 100 }} />

// Multiple properties
<motion.div animate={{ x: 100, opacity: 0.5, scale: 1.2 }} />

// With initial state
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
/>

// Disable initial animation
<motion.div
  initial={false}  // start at animate values
  animate={{ opacity: 1 }}
/>
```

**Animatable properties:**
- Transforms: `x`, `y`, `z`, `rotate`, `rotateX/Y/Z`, `scale`, `scaleX/Y`
- Appearance: `opacity`, `backgroundColor`, `color`, `borderRadius`
- Size: `width`, `height` (prefer transforms for performance)
- Filters: `filter`, `blur`
- Clip: `clipPath`
</basic_animation>

<transitions>
**transition prop:**
```tsx
<motion.div
  animate={{ x: 100 }}
  transition={{ duration: 0.5 }}
/>
```

**Duration-based:**
```tsx
transition={{
  duration: 0.5,           // seconds
  delay: 0.2,              // seconds
  ease: "easeInOut",       // or cubic bezier
  repeat: 2,               // repeat count
  repeatType: "reverse",   // "loop", "reverse", "mirror"
  repeatDelay: 0.5         // delay between repeats
}}
```

**Spring-based:**
```tsx
transition={{
  type: "spring",
  stiffness: 100,
  damping: 10,
  mass: 1
}}

// Shorthand
transition={{
  type: "spring",
  bounce: 0.3,  // 0 = no bounce, 1 = max bounce
  duration: 0.6
}}
```

**Per-property transitions:**
```tsx
transition={{
  x: { type: "spring", stiffness: 300 },
  opacity: { duration: 0.2 },
  default: { duration: 0.3 }  // fallback
}}
```

**Easing functions:**
```tsx
// Named easings
ease: "linear" | "easeIn" | "easeOut" | "easeInOut" |
      "circIn" | "circOut" | "circInOut" |
      "backIn" | "backOut" | "backInOut" |
      "anticipate"

// Cubic bezier
ease: [0.17, 0.67, 0.83, 0.67]
```
</transitions>

<variants>
**Defining variants:**
```tsx
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
/>
```

**Orchestration (parent → children):**
```tsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,      // delay between children
      delayChildren: 0.3,        // delay before first child
      staggerDirection: 1,       // 1 = forward, -1 = reverse
      when: "beforeChildren"     // or "afterChildren"
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

<motion.ul variants={container} initial="hidden" animate="visible">
  <motion.li variants={item} />
  <motion.li variants={item} />
  <motion.li variants={item} />
</motion.ul>
```

**Dynamic variants:**
```tsx
const variants = {
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.1 }
  })
}

<motion.div
  variants={variants}
  custom={index}  // passed to variant function
  animate="visible"
/>
```
</variants>

<keyframes>
**Keyframe arrays:**
```tsx
<motion.div
  animate={{
    x: [0, 100, 50],           // keyframe values
    opacity: [0, 1, 1]
  }}
  transition={{ duration: 2 }}
/>
```

**With times:**
```tsx
<motion.div
  animate={{ x: [0, 100, 50] }}
  transition={{
    duration: 2,
    times: [0, 0.3, 1]  // 0-1 progress for each keyframe
  }}
/>
```
</keyframes>

<exit_animations>
**exit prop with AnimatePresence:**
```tsx
import { AnimatePresence } from "motion/react"

<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      key="modal"  // required for AnimatePresence
    />
  )}
</AnimatePresence>
```

**AnimatePresence modes:**
```tsx
// sync (default) — enter and exit simultaneously
<AnimatePresence mode="sync">

// wait — exit completes before enter starts
<AnimatePresence mode="wait">

// popLayout — exiting elements "pop" out of layout flow
<AnimatePresence mode="popLayout">
```

**onExitComplete callback:**
```tsx
<AnimatePresence onExitComplete={() => console.log("exited")}>
```
</exit_animations>

<animation_controls>
**useAnimationControls:**
```tsx
import { useAnimationControls } from "motion/react"

function Component() {
  const controls = useAnimationControls()

  const handleClick = async () => {
    await controls.start({ x: 100 })
    await controls.start({ opacity: 0 })
  }

  return (
    <motion.div animate={controls}>
      <button onClick={handleClick}>Animate</button>
    </motion.div>
  )
}
```

**Control methods:**
```tsx
controls.start({ x: 100 })              // start animation
controls.start("visible")               // start variant
controls.stop()                         // stop all animations
controls.set({ x: 0 })                  // set immediately (no animation)
```
</animation_controls>

<useAnimate>
**Manual animation control:**
```tsx
import { useAnimate } from "motion/react"

function Component() {
  const [scope, animate] = useAnimate()

  const handleClick = async () => {
    await animate(scope.current, { x: 100 })
    await animate("li", { opacity: 1 }, { delay: stagger(0.1) })
  }

  return (
    <div ref={scope}>
      <button onClick={handleClick}>Animate</button>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    </div>
  )
}
```
</useAnimate>
