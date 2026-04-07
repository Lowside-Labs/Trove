<overview>
Import patterns and setup for Motion for React. Framer Motion was rebranded to Motion in November 2024. The package is now `motion` with imports from `motion/react`.
</overview>

<migration>
**From framer-motion to motion:**

```bash
# Uninstall old package
npm uninstall framer-motion

# Install new package
npm install motion
```

**Replace all imports:**
```tsx
// ❌ Old (deprecated)
import { motion, AnimatePresence } from "framer-motion"

// ✅ New
import { motion, AnimatePresence } from "motion/react"
```

The API is identical — only the import path changes.
</migration>

<import_patterns>
**Client Components** (`"use client"`):
```tsx
"use client"
import { motion, AnimatePresence } from "motion/react"
```

**Server Components:**
```tsx
// Server components cannot use motion directly
// Use motion/react-client for hybrid rendering
import * as motion from "motion/react-client"
```

**Non-React files** (vanilla JS/TS):
```tsx
import { animate, scroll, inView } from "motion"
```

**Specific imports:**
```tsx
// Motion values
import { useMotionValue, useTransform, useSpring } from "motion/react"

// Scroll
import { useScroll, useInView } from "motion/react"

// Animation control
import { useAnimate, useAnimationControls } from "motion/react"

// Reduced motion
import { useReducedMotion } from "motion/react"
```
</import_patterns>

<installation>
```bash
npm install motion
# or
pnpm add motion
# or
yarn add motion
```

**Minimum requirements:**
- React 18+
- TypeScript 4.7+ (for full type support)
</installation>

<version_notes>
**Motion 11+ breaking changes:**
- MotionValue velocity calculation changed: subsequent value updates within synchronous code blocks won't affect velocity calculations
- Velocity is now calculated between latest value and value at end of previous frame

**React 18 requirement:**
- Motion requires React 18 as minimum version
- If using React 17, stay on framer-motion@6.x
</version_notes>

<decision_tree>
**Which import to use:**

- Building React component with animations → `motion/react`
- Server component needing motion → `motion/react-client`
- Vanilla JS animation (no React) → `motion`
- Testing reduced motion → `useReducedMotion` from `motion/react`
</decision_tree>
