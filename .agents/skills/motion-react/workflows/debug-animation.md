# Workflow: Debug Animation Issues

<required_reading>
**Read these reference files NOW:**
1. references/anti-patterns.md
2. references/motion-values.md
3. references/animation-props.md
</required_reading>

<process>
## Step 1: Check Imports

```tsx
// ❌ Deprecated
import { motion } from "framer-motion"

// ✅ Correct
import { motion } from "motion/react"
```

For server components:
```tsx
import * as motion from "motion/react-client"
```

## Step 2: Check Console for Warnings

Motion logs deprecation warnings. Common ones:
- `onChange is deprecated` → Use `value.on("change", fn)`
- `useTransform callback is deprecated` → Use function form or range mapping

## Step 3: Common Issues Checklist

**Animation not running:**
- [ ] Is element a `motion.` component?
- [ ] Is `initial` different from `animate`?
- [ ] For exit: Is element direct child of `AnimatePresence`?
- [ ] For exit: Does element have unique `key`?
- [ ] For Radix/Base UI: Is `forceMount`/`keepMounted` applied?

**Exit animation not working:**
```tsx
// Check these requirements:
<AnimatePresence>
  {show && (
    <motion.div
      key="unique"        // ✅ Required
      exit={{ opacity: 0 }}  // ✅ Required
    />
  )}
</AnimatePresence>
```

**Animation feels wrong:**
- [ ] Check `transition` type (spring vs tween)
- [ ] Adjust `stiffness`/`damping` for springs
- [ ] Adjust `duration`/`ease` for tweens

**MotionValue not updating UI:**
```tsx
// ❌ Wrong — reading in render
<div style={{ opacity: x.get() }} />

// ✅ Correct — pass motion value
<motion.div style={{ opacity: x }} />
```

**Layout animation issues:**
- [ ] Is `layout` prop on the motion component?
- [ ] For popLayout: Is ref forwarded?
- [ ] Conflicting `animate` with layout?

## Step 4: Debug MotionValue

```tsx
import { useMotionValue } from "motion/react"

const x = useMotionValue(0)

// Debug with effect
useEffect(() => {
  return x.on("change", (latest) => {
    console.log("x:", latest)
  })
}, [x])
```

## Step 5: Check Performance

```tsx
// Open Chrome DevTools > Performance
// Record during animation
// Look for:
// - Long tasks (>50ms)
// - Layout thrashing (forced reflows)
// - Low FPS (should be ~60)
```

**Common performance fixes:**
```tsx
// Add GPU acceleration hint
style={{ willChange: "transform" }}

// Use transforms instead of layout props
animate={{ scale: 1.5 }}  // ✅
animate={{ width: 200 }}   // ❌
```

## Step 6: Radix/Base UI Specific

**Radix exit not working:**
```tsx
// Must:
// 1. Control open state
const [open, setOpen] = useState(false)

// 2. Use open/onOpenChange
<Dialog.Root open={open} onOpenChange={setOpen}>

// 3. forceMount on components
<Dialog.Portal forceMount>
  <Dialog.Content forceMount>

// 4. Wrap with AnimatePresence
<AnimatePresence>
  {open && (...)}
</AnimatePresence>
```

**Base UI exit not working:**
```tsx
// Must use keepMounted on Portal
<ContextMenu.Portal keepMounted>

// And control state
const [open, setOpen] = useState(false)
<ContextMenu.Root open={open} onOpenChange={setOpen}>
```

## Step 7: Verify Fix

```bash
# Rebuild
pnpm build

# Test in browser:
# 1. Animation triggers correctly
# 2. Exit animation plays
# 3. No console errors/warnings
# 4. Performance is smooth
```
</process>

<common_fixes>
| Problem | Fix |
|---------|-----|
| Animation doesn't run | Check `initial` ≠ `animate` |
| Exit doesn't work | Add `key`, use `AnimatePresence` |
| Radix exit fails | Add `forceMount`, hoist state |
| Base UI exit fails | Add `keepMounted`, hoist state |
| Motion value not reactive | Pass to style, don't `.get()` in render |
| Janky animation | Add `willChange`, use transforms |
| Wrong timing | Adjust `transition` config |
</common_fixes>

<success_criteria>
Debugging is complete when:
- [ ] Animation runs as expected
- [ ] No console errors or warnings
- [ ] Performance is smooth (60fps)
- [ ] Exit animations work (if applicable)
- [ ] All edge cases tested
</success_criteria>
