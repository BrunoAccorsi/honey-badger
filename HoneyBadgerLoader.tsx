import { memo, useEffect, useRef } from "react";
import spriteSrc from "./frames/sprite.webp";

// Sprite sheet: 4 cols × 3 rows, each frame 590×282 px
const COLS = 4;
const FRAME_W = 590;
const FRAME_H = 282;
const FRAME_COUNT = 12;
const ASPECT = FRAME_H / FRAME_W;

// Unscaled offsets for each frame, computed once at module load
const OFFSETS: ReadonlyArray<readonly [number, number]> = Array.from(
  { length: FRAME_COUNT },
  (_, i) => [(i % COLS) * FRAME_W, Math.floor(i / COLS) * FRAME_H] as const,
);

interface HoneyBadgerLoaderProps {
  /** Width in px. Height scales automatically at the native 590:282 ratio. Default: 220 */
  size?: number;
  /** Frames per second. Default: 18 */
  fps?: number;
  /** Freeze the animation on the current frame. Default: false */
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function HoneyBadgerLoaderImpl({
  size = 220,
  fps = 18,
  paused = false,
  className,
  style,
}: HoneyBadgerLoaderProps) {
  const elRef = useRef<HTMLDivElement>(null);

  // Live fps without re-running the effect on change
  const fpsRef = useRef(fps);
  fpsRef.current = fps;

  useEffect(() => {
    const el = elRef.current;
    if (!el || paused) return;

    // Respect a11y preference — show a static frame instead of animating
    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const scale = size / FRAME_W;
    // Pre-compute the exact `background-position` string for each frame
    // so the RAF tick is a single array lookup + one DOM write.
    const positions = OFFSETS.map(
      ([x, y]) => `${-x * scale}px ${-y * scale}px`,
    );

    let raf = 0;
    let frame = 0;
    let last = performance.now();
    let acc = 0;

    const tick = (now: number) => {
      const interval = 1000 / fpsRef.current;
      acc += now - last;
      last = now;
      let advanced = false;
      while (acc >= interval) {
        acc -= interval;
        frame = (frame + 1) % FRAME_COUNT;
        advanced = true;
      }
      if (advanced) el.style.backgroundPosition = positions[frame];
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [paused, size]);

  const displayW = size;
  const displayH = Math.round(size * ASPECT);

  return (
    <div
      ref={elRef}
      role="img"
      aria-label="Loading"
      className={className}
      style={{
        width: displayW,
        height: displayH,
        backgroundImage: `url(${spriteSrc})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${FRAME_W * COLS * (size / FRAME_W)}px auto`,
        backgroundPosition: "0 0",
        contain: "strict",
        ...style,
      }}
    />
  );
}

const HoneyBadgerLoader = memo(HoneyBadgerLoaderImpl);
HoneyBadgerLoader.displayName = "HoneyBadgerLoader";
export default HoneyBadgerLoader;
