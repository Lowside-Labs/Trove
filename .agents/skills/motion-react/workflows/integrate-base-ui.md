# Workflow: Integrate Motion with Base UI

<required_reading>
**Read these reference files NOW:**
1. references/base-ui-integration.md
2. references/animation-props.md
</required_reading>

<process>
## Step 1: Identify Animation Needs

| Need | Approach |
|------|----------|
| Enter animation only | `render` prop with `initial`/`animate` |
| Exit animation (you control rendering) | `AnimatePresence` + `exit` |
| Exit animation (self-rendering) | Hoist state + `keepMounted` + `AnimatePresence` |

## Step 2: Basic Enter Animation

```tsx
import { Menu } from "@base-ui-components/react"
import { motion } from "motion/react"

<Menu.Popup
  render={
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    />
  }
>
  <Menu.Item>Edit</Menu.Item>
  <Menu.Item>Delete</Menu.Item>
</Menu.Popup>
```

**Important:** Use element form, not function:
```tsx
// ❌ Wrong — causes type errors
render={(props) => <motion.div {...props} />}

// ✅ Correct
render={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />}
```

## Step 3: Exit Animation (You Control Rendering)

For components where you control visibility:

```tsx
import { AnimatePresence } from "motion/react"

function AnimatedComponent({ open }) {
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

## Step 4: Exit Animation (Self-Rendering Components)

For ContextMenu, Popover, Dialog, Select, etc:

**Step 4a: Hoist open state**
```tsx
import { useState } from "react"
import { ContextMenu } from "@base-ui-components/react"
import { motion, AnimatePresence } from "motion/react"

function AnimatedContextMenu() {
  const [open, setOpen] = useState(false)
  // ...
}
```

**Step 4b: Use controlled props**
```tsx
<ContextMenu.Root open={open} onOpenChange={setOpen}>
```

**Step 4c: Add keepMounted and AnimatePresence**
```tsx
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
          {/* Menu items */}
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  )}
</AnimatePresence>
```

## Step 5: Complete Examples

**Context Menu:**
```tsx
import { useState } from "react"
import { ContextMenu } from "@base-ui-components/react"
import { motion, AnimatePresence } from "motion/react"

export function AnimatedContextMenu({ children, items }) {
  const [open, setOpen] = useState(false)

  return (
    <ContextMenu.Root open={open} onOpenChange={setOpen}>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <AnimatePresence>
        {open && (
          <ContextMenu.Portal keepMounted>
            <ContextMenu.Positioner>
              <ContextMenu.Popup
                render={
                  <motion.div
                    className="bg-white rounded-lg shadow-lg py-1"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                  />
                }
              >
                {items.map(item => (
                  <ContextMenu.Item key={item.id}>
                    {item.label}
                  </ContextMenu.Item>
                ))}
              </ContextMenu.Popup>
            </ContextMenu.Positioner>
          </ContextMenu.Portal>
        )}
      </AnimatePresence>
    </ContextMenu.Root>
  )
}
```

**Dialog:**
```tsx
import { useState } from "react"
import { Dialog } from "@base-ui-components/react"
import { motion, AnimatePresence } from "motion/react"

export function AnimatedDialog({ trigger, children }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal keepMounted>
            <Dialog.Backdrop
              render={
                <motion.div
                  className="fixed inset-0 bg-black/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              }
            />
            <Dialog.Popup
              render={
                <motion.div
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25 }}
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
export function AnimatedPopover({ trigger, children }) {
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
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
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

## Step 6: Verify

```bash
# Build
pnpm build

# Test:
# 1. Open animation plays
# 2. Close animation plays (exit)
# 3. Focus management works
# 4. Keyboard navigation works
```
</process>

<anti_patterns>
Avoid:
- Function render props: `render={(props) => ...}`
- Spreading props in render: `render={<motion.div {...props} />}`
- Missing `keepMounted` on Portal for exit animations
- Forgetting to hoist state for self-rendering components
</anti_patterns>

<success_criteria>
Integration is complete when:
- [ ] Open animation plays smoothly
- [ ] Close (exit) animation plays smoothly
- [ ] Focus management works correctly
- [ ] Keyboard navigation works
- [ ] No type errors
- [ ] No console errors
</success_criteria>
