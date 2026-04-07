# Workflow: Integrate Motion with Radix UI

<required_reading>
**Read these reference files NOW:**
1. references/radix-integration.md
2. references/animation-props.md
</required_reading>

<process>
## Step 1: Identify Animation Needs

| Need | Approach |
|------|----------|
| Hover/tap only | `asChild` + motion with gesture props |
| Enter animation only | `asChild` + motion with `initial`/`animate` |
| Exit animation | Hoist state + `forceMount` + `AnimatePresence` |

## Step 2: Simple Gesture Animation (No Exit)

```tsx
import * as Dialog from "@radix-ui/react-dialog"
import { motion } from "motion/react"

<Dialog.Trigger asChild>
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    Open Dialog
  </motion.button>
</Dialog.Trigger>
```

## Step 3: Enter Animation Only (No Exit)

```tsx
<Dialog.Content asChild>
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="dialog-content"
  >
    {/* content */}
  </motion.div>
</Dialog.Content>
```

## Step 4: Full Animation with Exit

**Step 4a: Hoist the open state**
```tsx
import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { motion, AnimatePresence } from "motion/react"

function AnimatedDialog() {
  const [open, setOpen] = useState(false)
  // ...
}
```

**Step 4b: Use controlled props**
```tsx
<Dialog.Root open={open} onOpenChange={setOpen}>
```

**Step 4c: Add AnimatePresence and forceMount**
```tsx
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
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="content"
        >
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
          <Dialog.Close>Close</Dialog.Close>
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal>
  )}
</AnimatePresence>
```

## Step 5: Complete Example

```tsx
import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { motion, AnimatePresence } from "motion/react"

export function AnimatedDialog({ children, trigger }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger}
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
```

## Step 6: Other Components

**Tooltip:**
```tsx
function AnimatedTooltip({ content, children }) {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <AnimatePresence>
        {open && (
          <Tooltip.Portal forceMount>
            <Tooltip.Content asChild forceMount sideOffset={5}>
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="tooltip"
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

**DropdownMenu:**
```tsx
function AnimatedDropdown({ trigger, children }) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <AnimatePresence>
        {open && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content asChild forceMount sideOffset={5}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
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

## Step 7: Verify

```bash
# Build
pnpm build

# Test:
# 1. Open animation plays
# 2. Close animation plays (exit)
# 3. Focus management works
# 4. Accessibility intact (test with screen reader)
```
</process>

<anti_patterns>
Avoid:
- `forceMount` on DOM elements (only Radix components)
- Missing `key` on AnimatePresence children
- Forgetting to hoist state for exit animations
- Using non-motion element as `asChild` child
</anti_patterns>

<success_criteria>
Integration is complete when:
- [ ] Open animation plays smoothly
- [ ] Close (exit) animation plays smoothly
- [ ] Focus trapping works correctly
- [ ] Keyboard navigation works
- [ ] Screen reader announcements work
- [ ] No console errors
</success_criteria>
