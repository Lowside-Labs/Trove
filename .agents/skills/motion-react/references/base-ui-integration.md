<overview>
Base UI uses render props for composition instead of Radix's `asChild`. Pass motion components via the `render` prop. For exit animations, hoist state and use `keepMounted` on Portal.
</overview>

<render_prop_pattern>
**Basic usage:**
```tsx
import { Menu } from "@base-ui-components/react"
import { motion } from "motion/react"

<Menu.Popup
  render={
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    />
  }
>
  {/* Menu items */}
</Menu.Popup>
```

**Important:** Don't use function render props or spread patterns — they cause type errors:
```tsx
// ❌ Wrong — causes type errors
<Menu.Popup
  render={(props) => <motion.div {...props} />}
/>

// ❌ Wrong — causes type errors
<Menu.Popup
  render={<motion.div {...someProps} />}
/>

// ✅ Correct — element with inline props
<Menu.Popup
  render={
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    />
  }
>
```
</render_prop_pattern>

<standard_exit_animations>
**For components YOU control rendering:**
Standard `AnimatePresence` + `exit` pattern works:

```tsx
import { AnimatePresence } from "motion/react"
import { Menu } from "@base-ui-components/react"

function AnimatedMenu({ open }) {
  return (
    <AnimatePresence>
      {open && (
        <Menu.Trigger
          render={
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          }
        />
      )}
    </AnimatePresence>
  )
}
```
</standard_exit_animations>

<self_rendering_exit_animations>
**For self-rendering components (ContextMenu, Popover, etc.):**
These components control their own Portal rendering. Use this pattern:

1. Hoist open state to your component
2. Add `keepMounted` to Portal
3. Wrap Portal with `AnimatePresence`

```tsx
import { useState } from "react"
import { ContextMenu } from "@base-ui-components/react"
import { motion, AnimatePresence } from "motion/react"

function AnimatedContextMenu() {
  const [open, setOpen] = useState(false)

  return (
    <ContextMenu.Root open={open} onOpenChange={setOpen}>
      <ContextMenu.Trigger>Right-click me</ContextMenu.Trigger>
      <AnimatePresence>
        {open && (
          <ContextMenu.Portal keepMounted>
            <ContextMenu.Positioner>
              <ContextMenu.Popup
                render={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  />
                }
              >
                <ContextMenu.Item>Edit</ContextMenu.Item>
                <ContextMenu.Item>Delete</ContextMenu.Item>
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        )}
      </AnimatePresence>
    </ContextMenu.Root>
  )
}
```

**Why `keepMounted`?**
- Portal stays in DOM while `element.getAnimations()` detects running animations
- Allows exit animation to complete before unmounting
- Without it, Portal unmounts immediately on close
</self_rendering_exit_animations>

<common_components>
**Dialog:**
```tsx
function AnimatedDialog({ open, onOpenChange, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal keepMounted>
            <Dialog.Backdrop
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="backdrop"
                />
              }
            />
            <Dialog.Popup
              render={
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25 }}
                  className="dialog"
                />
              }
            >
              {children}
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
```

**Popover:**
```tsx
function AnimatedPopover({ trigger, children }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal keepMounted>
            <Popover.Positioner>
              <Popover.Popup
                render={
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  />
                }
              >
                {children}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}
```

**Select:**
```tsx
function AnimatedSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <Select.Root open={open} onOpenChange={setOpen} value={value} onValueChange={onChange}>
      <Select.Trigger>
        <Select.Value />
      </Select.Trigger>
      <AnimatePresence>
        {open && (
          <Select.Portal keepMounted>
            <Select.Positioner>
              <Select.Popup
                render={
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  />
                }
              >
                {options.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        )}
      </AnimatePresence>
    </Select.Root>
  )
}
```
</common_components>

<exit_animation_tips>
**Use hardware-accelerated properties for smooth exit:**
- `opacity`
- `transform` (or `scale`, `x`, `y`, `rotate`)
- `filter`
- `clipPath`

```tsx
// ✅ Smooth — GPU accelerated
exit={{ opacity: 0, scale: 0.9 }}

// ⚠️ May be janky — triggers layout
exit={{ width: 0 }}
```

**Timing:**
```tsx
// Fast for menus/tooltips
transition={{ duration: 0.1 }}

// Medium for dialogs
transition={{ duration: 0.2 }}

// Spring for bouncy feel
transition={{ type: "spring", stiffness: 400, damping: 25 }}
```
</exit_animation_tips>

<decision_tree>
**Which pattern to use:**

**No exit animation needed:**
- Just use `render` prop with `initial`/`animate`
- No state hoisting or `keepMounted`

**Component you control rendering:**
- Wrap with `AnimatePresence`
- Add `exit` prop to motion component

**Self-rendering component (ContextMenu, Popover, Dialog, Select):**
- Hoist `open` state
- Use `open`/`onOpenChange` props
- Wrap Portal with `AnimatePresence`
- Add `keepMounted` to Portal
- Add `exit` prop to motion component
</decision_tree>
