<overview>
Gesture animations respond to user interactions: hover, tap, drag, focus, and viewport visibility. Each gesture has event listeners and a `while-` animation prop.
</overview>

<whileHover>
**Basic hover animation:**
```tsx
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
/>
```

**With variants:**
```tsx
const variants = {
  hover: { scale: 1.1, backgroundColor: "#ff0000" }
}

<motion.div whileHover="hover" variants={variants} />
```

**Event callbacks:**
```tsx
<motion.div
  whileHover={{ scale: 1.1 }}
  onHoverStart={(event, info) => console.log("hover start")}
  onHoverEnd={(event, info) => console.log("hover end")}
/>
```

**Key behavior:**
- `whileHover` filters out touch events automatically
- Only fires for primary pointer (not right-click)
- Smoothly reverses when hover ends
</whileHover>

<whileTap>
**Press/tap animation:**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
/>
```

**Keyboard accessibility:**
- Elements with `whileTap` automatically become keyboard accessible
- Can receive focus and be "pressed" via Enter key
- No additional a11y work needed

**Event callbacks:**
```tsx
<motion.div
  whileTap={{ scale: 0.9 }}
  onTapStart={(event, info) => console.log("tap start")}
  onTap={(event, info) => console.log("tap complete")}
  onTapCancel={(event, info) => console.log("tap cancelled")}
/>
```
</whileTap>

<whileFocus>
**Focus animation:**
```tsx
<motion.input
  whileFocus={{ scale: 1.02, borderColor: "#3b82f6" }}
/>
```

**Combining with other gestures:**
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  whileFocus={{ outline: "2px solid #3b82f6" }}
/>
```
</whileFocus>

<whileDrag>
**Basic drag:**
```tsx
<motion.div
  drag           // enable both axes
  drag="x"       // constrain to x-axis
  drag="y"       // constrain to y-axis
  whileDrag={{ scale: 1.1 }}
/>
```

**Drag constraints:**
```tsx
// Pixel constraints
<motion.div
  drag
  dragConstraints={{
    top: -100,
    left: -100,
    right: 100,
    bottom: 100
  }}
/>

// Ref-based constraints (constrain to parent)
const constraintsRef = useRef(null)

<motion.div ref={constraintsRef}>
  <motion.div drag dragConstraints={constraintsRef} />
</motion.div>
```

**Drag configuration:**
```tsx
<motion.div
  drag
  dragElastic={0.2}           // 0 = no elastic, 1 = full elastic
  dragMomentum={false}        // disable inertia on release
  dragTransition={{           // customize inertia
    power: 0.3,
    timeConstant: 200
  }}
  dragPropagation             // allow parent to receive drag
/>
```

**Drag event callbacks:**
```tsx
<motion.div
  drag
  onDragStart={(event, info) => console.log(info.point)}
  onDrag={(event, info) => console.log(info.velocity)}
  onDragEnd={(event, info) => console.log(info.offset)}
/>

// info object contains:
// - point: { x, y } current position
// - delta: { x, y } movement since last event
// - offset: { x, y } total movement from start
// - velocity: { x, y } current velocity
```

**Drag snap:**
```tsx
<motion.div
  drag="x"
  dragSnapToOrigin  // snap back to origin on release
/>
```
</whileDrag>

<whileInView>
**Viewport animation:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}  // only animate once
/>
```

**Viewport options:**
```tsx
<motion.div
  whileInView={{ opacity: 1 }}
  viewport={{
    once: true,           // only trigger once
    amount: 0.5,          // 0-1, portion visible to trigger (default: "some")
    margin: "100px",      // trigger earlier/later
    root: scrollRef       // custom scroll container
  }}
/>
```

**Event callback:**
```tsx
<motion.div
  whileInView={{ opacity: 1 }}
  onViewportEnter={(entry) => console.log("entered")}
  onViewportLeave={(entry) => console.log("left")}
/>
```
</whileInView>

<combining_gestures>
**Common button pattern:**
```tsx
<motion.button
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  whileFocus={{ boxShadow: "0 0 0 2px #3b82f6" }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>
```

**Interactive card:**
```tsx
<motion.div
  whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 300 }}
/>
```
</combining_gestures>

<gesture_propagation>
**Propagation behavior:**
- By default, gestures don't propagate to parent
- Use `dragPropagation` to allow drag to propagate
- Hover/tap don't propagate regardless

**Nested interactive elements:**
```tsx
// Parent won't receive tap when child is tapped
<motion.div whileTap={{ scale: 0.95 }}>
  <motion.button whileTap={{ scale: 0.9 }}>
    Nested button
  </motion.button>
</motion.div>
```
</gesture_propagation>
