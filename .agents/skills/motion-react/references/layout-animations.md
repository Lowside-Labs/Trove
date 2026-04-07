<overview>
Layout animations automatically animate changes to an element's position and size. Motion uses FLIP (First, Last, Invert, Play) to animate layout changes with transforms, which is more performant than animating width/height.
</overview>

<layout_prop>
**Enable layout animations:**
```tsx
<motion.div layout>
  {/* Content that may change size/position */}
</motion.div>
```

**Layout modes:**
```tsx
layout={true}        // animate position and size
layout="position"    // only animate position changes
layout="size"        // only animate size changes
layout="preserve-aspect"  // maintain aspect ratio during animation
```

**What triggers layout animation:**
- Element's position changes (CSS, siblings added/removed)
- Element's size changes (content, CSS)
- Parent layout changes affecting this element
</layout_prop>

<layout_examples>
**Reorderable list:**
```tsx
function List({ items }) {
  return (
    <ul>
      {items.map(item => (
        <motion.li key={item.id} layout>
          {item.text}
        </motion.li>
      ))}
    </ul>
  )
}
```

**Expandable card:**
```tsx
function Card({ isExpanded }) {
  return (
    <motion.div layout>
      <motion.h2 layout="position">Title</motion.h2>
      {isExpanded && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Expanded content
        </motion.p>
      )}
    </motion.div>
  )
}
```

**Flex justify-content animation:**
```tsx
// Layout animations can animate "unanimatable" properties
function FlexSwitch({ isEnd }) {
  return (
    <motion.div
      layout
      style={{
        display: "flex",
        justifyContent: isEnd ? "flex-end" : "flex-start"
      }}
    >
      <motion.div layout />
    </motion.div>
  )
}
```
</layout_examples>

<layoutId>
**Shared element transitions:**
```tsx
// Element "morphs" between positions when layoutId matches
function Tabs({ selected }) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button key={tab.id}>
          {tab.label}
          {selected === tab.id && (
            <motion.div
              layoutId="underline"
              className="underline"
            />
          )}
        </button>
      ))}
    </div>
  )
}
```

**Card expansion:**
```tsx
function Gallery({ selectedId }) {
  return (
    <>
      {/* Thumbnails */}
      {items.map(item => (
        <motion.div key={item.id} layoutId={item.id}>
          <img src={item.thumb} />
        </motion.div>
      ))}

      {/* Expanded view */}
      <AnimatePresence>
        {selectedId && (
          <motion.div layoutId={selectedId}>
            <img src={items[selectedId].full} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
```
</layoutId>

<layout_with_AnimatePresence>
**Exit animations with layout:**
```tsx
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    />
  ))}
</AnimatePresence>
```

**popLayout mode:**
- Exiting elements "pop" out of layout flow
- Remaining elements animate to fill the gap immediately
- Best for lists where items are removed

**forwardRef requirement:**
When using `popLayout`, custom components must forward refs:
```tsx
const ListItem = forwardRef((props, ref) => (
  <motion.li ref={ref} {...props} />
))
```
</layout_with_AnimatePresence>

<layout_transition>
**Customize layout animation:**
```tsx
<motion.div
  layout
  transition={{
    layout: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  }}
/>
```

**Disable layout animation temporarily:**
```tsx
<motion.div layout transition={{ layout: { duration: 0 } }} />
```
</layout_transition>

<LayoutGroup>
**Coordinate layout across components:**
```tsx
import { LayoutGroup } from "motion/react"

function App() {
  return (
    <LayoutGroup>
      <Sidebar />
      <MainContent />
    </LayoutGroup>
  )
}
```

**Namespaced layout groups:**
```tsx
// Prevent layoutId collisions between sections
<LayoutGroup id="sidebar">
  {/* sidebar items */}
</LayoutGroup>

<LayoutGroup id="main">
  {/* main content items */}
</LayoutGroup>
```
</LayoutGroup>

<anti_patterns>
**Avoid layout on frequently updating elements:**
```tsx
// ❌ Bad — layout recalculates every frame
<motion.div layout style={{ width: scrollProgress.get() * 100 }} />

// ✅ Good — use transform instead
<motion.div style={{ scaleX: scrollProgress }} />
```

**Don't mix layout with transform animations:**
```tsx
// ⚠️ Careful — can cause unexpected behavior
<motion.div
  layout
  animate={{ x: 100 }}  // may conflict with layout
/>

// ✅ Prefer — let layout handle position
<motion.div layout />
```

**Remember: layout animations use transforms internally.** Combining with explicit transform animations can cause conflicts.
</anti_patterns>

<performance>
**Layout animation performance tips:**
1. Use `layout="position"` when only position changes
2. Avoid layout on large numbers of elements simultaneously
3. Use `layoutId` sparingly — each one adds computation
4. Consider `will-change: transform` for complex layouts
</performance>
