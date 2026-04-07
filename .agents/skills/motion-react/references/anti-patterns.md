<overview>
Common mistakes and anti-patterns when using Motion for React. Avoiding these will prevent bugs, improve performance, and ensure animations work correctly.
</overview>

<import_mistakes>
**Wrong package import:**
```tsx
// ❌ Deprecated — don't use
import { motion } from "framer-motion"

// ✅ Correct
import { motion } from "motion/react"
```

**Wrong import for server components:**
```tsx
// ❌ Won't work in server components
import { motion } from "motion/react"

// ✅ Use client variant
import * as motion from "motion/react-client"
```
</import_mistakes>

<motion_value_mistakes>
**Reading MotionValue in render:**
```tsx
// ❌ Breaks reactivity, causes unnecessary re-renders
function Component() {
  const x = useMotionValue(0)
  return <div style={{ opacity: x.get() }} />  // ❌
}

// ✅ Pass motion value directly
function Component() {
  const x = useMotionValue(0)
  return <motion.div style={{ opacity: x }} />  // ✅
}
```

**Using deprecated onChange:**
```tsx
// ❌ Deprecated in v11+
x.onChange((v) => console.log(v))

// ✅ Use on() method
x.on("change", (v) => console.log(v))
```

**Deprecated useTransform callback form:**
```tsx
// ❌ Deprecated
useTransform(x, (latest) => latest * 2)

// ✅ Use function form
useTransform(() => x.get() * 2)

// ✅ Or range mapping
useTransform(x, [0, 100], [0, 200])
```
</motion_value_mistakes>

<AnimatePresence_mistakes>
**Missing key prop:**
```tsx
// ❌ AnimatePresence can't track elements
<AnimatePresence>
  {items.map(item => (
    <motion.div exit={{ opacity: 0 }}>{item.text}</motion.div>
  ))}
</AnimatePresence>

// ✅ Each child needs unique key
<AnimatePresence>
  {items.map(item => (
    <motion.div key={item.id} exit={{ opacity: 0 }}>{item.text}</motion.div>
  ))}
</AnimatePresence>
```

**Fragments break exit animations:**
```tsx
// ❌ Fragment hides elements from AnimatePresence
<AnimatePresence>
  {show && (
    <>
      <motion.div exit={{ opacity: 0 }} />
      <motion.div exit={{ opacity: 0 }} />
    </>
  )}
</AnimatePresence>

// ✅ Use array with keys or wrapper element
<AnimatePresence>
  {show && (
    <motion.div exit={{ opacity: 0 }}>
      <div />
      <div />
    </motion.div>
  )}
</AnimatePresence>
```

**Exit on wrong element:**
```tsx
// ❌ Exit on child — won't work
<AnimatePresence>
  {show && (
    <div key="wrapper">
      <motion.div exit={{ opacity: 0 }} />  {/* ❌ Not direct child */}
    </div>
  )}
</AnimatePresence>

// ✅ Exit on direct child of AnimatePresence
<AnimatePresence>
  {show && (
    <motion.div key="wrapper" exit={{ opacity: 0 }}>
      <div />
    </motion.div>
  )}
</AnimatePresence>
```
</AnimatePresence_mistakes>

<layout_animation_mistakes>
**Missing exit causes layout issues:**
```tsx
// ❌ Layout animation breaks when sibling exits
<AnimatePresence>
  {items.map(item => (
    <motion.div key={item.id} layout />  {/* Missing exit */}
  ))}
</AnimatePresence>

// ✅ Always add exit with layout
<AnimatePresence>
  {items.map(item => (
    <motion.div
      key={item.id}
      layout
      exit={{ opacity: 0 }}  // ← Important
    />
  ))}
</AnimatePresence>
```

**Layout + transform conflicts:**
```tsx
// ⚠️ Can cause unexpected behavior
<motion.div
  layout
  animate={{ x: 100 }}  // Conflicts with layout
/>

// ✅ Let layout handle positioning
<motion.div layout />
```

**Missing forwardRef with popLayout:**
```tsx
// ❌ Breaks with popLayout mode
const Card = ({ children }) => (
  <motion.div layout>{children}</motion.div>
)

<AnimatePresence mode="popLayout">
  <Card key="card" />  {/* No ref forwarding */}
</AnimatePresence>

// ✅ Forward ref for popLayout
const Card = forwardRef((props, ref) => (
  <motion.div ref={ref} layout {...props} />
))
```
</layout_animation_mistakes>

<transition_mistakes>
**Transition on motion value style:**
```tsx
// ❌ Transition ignored when style uses motion value
const x = useMotionValue(0)

<motion.div
  style={{ x }}
  transition={{ duration: 1 }}  // ← Ignored
/>

// ✅ Animate the motion value directly
animate(x, 100, { duration: 1 })
```

**Wrong transition type:**
```tsx
// ⚠️ Spring on colors looks weird
<motion.div
  animate={{ backgroundColor: "#ff0000" }}
  transition={{ type: "spring" }}  // Colors shouldn't spring
/>

// ✅ Use duration-based for colors
<motion.div
  animate={{ backgroundColor: "#ff0000" }}
  transition={{ duration: 0.3 }}
/>
```
</transition_mistakes>

<radix_integration_mistakes>
**forceMount on DOM elements:**
```tsx
// ❌ forceMount is a Radix prop, not motion
<motion.div forceMount>  {/* Prop doesn't exist */}

// ✅ forceMount goes on Radix components
<Dialog.Content forceMount>
  <motion.div />
</Dialog.Content>
```

**Missing state hoisting:**
```tsx
// ❌ Can't animate exit without controlling open state
<Dialog.Root>
  <AnimatePresence>
    <Dialog.Content>  {/* Radix controls mounting */}
      <motion.div exit={{ opacity: 0 }} />
    </Dialog.Content>
  </AnimatePresence>
</Dialog.Root>

// ✅ Hoist state to component
const [open, setOpen] = useState(false)
<Dialog.Root open={open} onOpenChange={setOpen}>
  <AnimatePresence>
    {open && (
      <Dialog.Portal forceMount>
        <Dialog.Content forceMount>
          <motion.div exit={{ opacity: 0 }} />
        </Dialog.Content>
      </Dialog.Portal>
    )}
  </AnimatePresence>
</Dialog.Root>
```
</radix_integration_mistakes>

<base_ui_integration_mistakes>
**Function render prop:**
```tsx
// ❌ Causes type errors
<Menu.Popup
  render={(props) => <motion.div {...props} />}
/>

// ✅ Use element form
<Menu.Popup
  render={
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    />
  }
/>
```

**Missing keepMounted:**
```tsx
// ❌ Exit animation never plays
<AnimatePresence>
  {open && (
    <ContextMenu.Portal>  {/* Unmounts immediately */}
      <motion.div exit={{ opacity: 0 }} />
    </ContextMenu.Portal>
  )}
</AnimatePresence>

// ✅ keepMounted allows exit animation
<AnimatePresence>
  {open && (
    <ContextMenu.Portal keepMounted>
      <motion.div exit={{ opacity: 0 }} />
    </ContextMenu.Portal>
  )}
</AnimatePresence>
```
</base_ui_integration_mistakes>

<performance_mistakes>
**Allocations in frame callbacks:**
```tsx
// ❌ Creates new array/object every frame
useTransform(() => {
  return items.map(i => i.value)  // ❌ new array
})

useTransform(() => {
  return { x: val.get(), y: val2.get() }  // ❌ new object
})

// ✅ Return primitives, avoid allocations
useTransform(() => val.get() * 2)
```

**Missing willChange (independent transforms only):**
```tsx
// ⚠️ Independent transforms don't auto-promote layer
<motion.div animate={{ x: 100 }} />

// ✅ Add willChange for independent transforms
<motion.div
  style={{ willChange: "transform" }}
  animate={{ x: 100 }}
/>

// ✅ Or use transform string — WAAPI auto-promotes, no willChange needed
<motion.div animate={{ transform: "translateX(100px)" }} />
```

**Using independent transforms when transform string would be better:**
```tsx
// ⚠️ Uses Motion's JS engine
<motion.div animate={{ x: 100, scale: 1.2, rotate: 45 }} />

// ✅ Runs via WAAPI (native browser, 120fps capable)
<motion.div animate={{ transform: "translateX(100px) scale(1.2) rotate(45deg)" }} />

// ✅ Independent transforms ARE correct here — competing concerns
<motion.div animate={{ x: 100 }} whileHover={{ scale: 1.2 }} />
```

**Animating layout properties:**
```tsx
// ❌ Triggers expensive layout recalculation
<motion.div animate={{ width: 200, height: 100 }} />

// ✅ Use transforms or layout prop
<motion.div animate={{ scale: 2 }} />
// or
<motion.div layout style={{ width: isLarge ? 200 : 100 }} />
```
</performance_mistakes>
