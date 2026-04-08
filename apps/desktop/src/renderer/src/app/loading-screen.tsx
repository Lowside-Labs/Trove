import { motion } from "motion/react";
import { Galaxy } from "../components/galaxy";

const RING_TEXT = "TROVE · GATHERING YOUR LIBRARY · TROVE · GATHERING YOUR LIBRARY · ";

export function LoadingScreen() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[oklch(0.08_0_0)]">
      {/* Galaxy shader background */}
      <div className="absolute inset-0">
        <Galaxy
          density={0.6}
          speed={0.15}
          starSpeed={0.3}
          glowIntensity={0.15}
          saturation={0.05}
          hueShift={250}
          twinkleIntensity={0.4}
          rotationSpeed={0.02}
          autoCenterRepulsion={12}
          mouseInteraction={false}
          transparent={false}
        />
      </div>

      {/* Dark circle with rotating text */}
      <div className="relative flex items-center justify-center">
        {/* Rotating ring of text */}
        <motion.svg
          className="absolute size-56"
          viewBox="0 0 200 200"
          animate={{ rotate: 360 }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <defs>
            <path
              id="textCircle"
              d="M 100,100 m -72,0 a 72,72 0 1,1 144,0 a 72,72 0 1,1 -144,0"
              fill="none"
            />
          </defs>
          <text
            className="fill-white/30"
            fontSize="9.5"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="500"
            letterSpacing="2.5"
          >
            <textPath href="#textCircle">{RING_TEXT}</textPath>
          </text>
        </motion.svg>

        {/* Center dark circle */}
        <div className="relative flex size-36 items-center justify-center rounded-full bg-[oklch(0.08_0_0)] shadow-[0_0_80px_40px_oklch(0.08_0_0)]">
          <motion.p
            className="text-lg font-medium tracking-wide text-white/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            Trove
          </motion.p>
        </div>
      </div>
    </div>
  );
}
