<overview>
Radix UI primitives require special handling for Motion animations. Key challenges: Radix controls open/closed state internally, and exit animations need `forceMount` to keep elements in DOM during animation.
</overview>

<core_pattern>
**The fundamental approach:**
1. Use `asChild` + `motion.div` as child
2. Hoist state with `useState` for exit animations
3. Apply `forceMount` on Radix components (not DOM elements)
4. Wrap conditionally rendered content with `AnimatePresence`

```tsx
import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { motion, AnimatePresence } from "motion/react"

function AnimatedDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overlay"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="content"
              >
                {/* Dialog content */}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
```
</core_pattern>

<forceMount_explained>
**Why forceMount is needed:**
- Radix unmounts components when closed
- `AnimatePresence` needs elements in DOM to animate exit
- `forceMount` keeps component mounted regardless of open state

**Where to apply forceMount:**
```tsx
// ✅ Correct — on Radix components
<Dialog.Portal forceMount>
<Dialog.Overlay forceMount>
<Dialog.Content forceMount>

// ❌ Wrong — never on DOM elements
<motion.div forceMount>  // This prop doesn't exist on motion.div
```

**forceMount accepts:**
- `true` (always mount)
- Or omit entirely (Radix controls mounting)
</forceMount_explained>

<asChild_pattern>
**Using asChild with motion:**
```tsx
// Radix component renders as motion.div
<Dialog.Content asChild>
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    Content
  </motion.div>
</Dialog.Content>
```

**Without asChild:**
```tsx
// Creates nested divs — may affect styling
<Dialog.Content>
  <motion.div>
    Content
  </motion.div>
</Dialog.Content>
```

**Choosing the right element:**
```tsx
// Button trigger
<Dialog.Trigger asChild>
  <motion.button whileHover={{ scale: 1.05 }}>
    Open
  </motion.button>
</Dialog.Trigger>

// Nav link
<NavigationMenu.Link asChild>
  <motion.a href="/" whileHover={{ color: "#3b82f6" }}>
    Home
  </motion.a>
</NavigationMenu.Link>
```
</asChild_pattern>

<common_components>
**Tooltip:**
```tsx
function AnimatedTooltip({ children, content }) {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger asChild>
        {children}
      </Tooltip.Trigger>
      <AnimatePresence>
        {open && (
          <Tooltip.Portal forceMount>
            <Tooltip.Content asChild forceMount sideOffset={5}>
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                {content}
              </motion.div>
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
      </AnimatePresence>
    </Tooltip.Root>
  )
}
```

**Dropdown Menu:**
```tsx
function AnimatedDropdown({ trigger, children }) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>
      <AnimatePresence>
        {open && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content asChild forceMount sideOffset={5}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  )
}
```

**Accordion:**
```tsx
// Accordion items don't need forceMount for height animations
<Accordion.Content asChild>
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: "auto", opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
</Accordion.Content>
```
</common_components>

<known_issues>
**Dialog pointer-events issue:**
When using `forceMount` on Dialog, `pointer-events: none` may be applied to `document.body` and overlay, preventing interaction.

**Workaround:**
```tsx
// Ensure overlay properly receives pointer events
<Dialog.Overlay asChild forceMount>
  <motion.div
    style={{ pointerEvents: open ? "auto" : "none" }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  />
</Dialog.Overlay>
```

**Focus management:**
Radix handles focus automatically. Ensure your motion animations don't interfere with focus trap timing.
</known_issues>

<animation_recommendations>
**Hardware-accelerated exit animations:**
Use properties that trigger GPU acceleration for smooth exit:
- `opacity`
- `transform` (or `x`, `y`, `scale`, `rotate`)
- `filter`
- `clipPath`

```tsx
// ✅ Smooth exit
exit={{ opacity: 0, scale: 0.95 }}

// ⚠️ May cause layout shifts
exit={{ width: 0, height: 0 }}
```

**Timing recommendations:**
```tsx
// Quick for tooltips/dropdowns
transition={{ duration: 0.15 }}

// Medium for dialogs/modals
transition={{ duration: 0.2 }}

// Spring for playful feel
transition={{ type: "spring", stiffness: 500, damping: 30 }}
```
</animation_recommendations>

<decision_tree>
**When to use each approach:**

**Simple hover/tap animations:**
- Just use `asChild` + motion component
- No need for `forceMount` or state hoisting

**Enter animations only:**
- Use `asChild` + motion component with `initial`/`animate`
- No `forceMount` needed

**Exit animations:**
- Hoist open state to component
- Use `open`/`onOpenChange` props
- Wrap with `AnimatePresence`
- Apply `forceMount` to Portal, Overlay, Content
- Add `exit` prop to motion components
</decision_tree>
