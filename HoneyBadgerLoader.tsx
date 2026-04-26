import { memo, useEffect, useRef } from "react";
import spriteSrc from "./frames/sprite.webp";

// ─── Sprite sheet layout ─────────────────────────────────────────────────────
//
//   The sprite sheet is a 4-column × 3-row grid of animation frames:
//
//   [ 1 ][ 2 ][ 3 ][ 4 ]
//   [ 5 ][ 6 ][ 7 ][ 8 ]
//   [ 9 ][10 ][11 ][12 ]
//
//   Each frame is 590 × 282 px → total sheet: 2360 × 846 px
//   We animate by shifting background-position across the grid.
//
// ─────────────────────────────────────────────────────────────────────────────

const SPRITE = {
  cols: 4,
  frameWidth: 590,
  frameHeight: 282,
  frameCount: 12,
} as const;

const ASPECT_RATIO = SPRITE.frameHeight / SPRITE.frameWidth;

// Pre-compute each frame's [x, y] offset in the sprite sheet once at module
// load — avoids repeating the math on every size change.
const FRAME_OFFSETS = Array.from({ length: SPRITE.frameCount }, (_, frameIndex) => ({
  x: (frameIndex % SPRITE.cols) * SPRITE.frameWidth,
  y: Math.floor(frameIndex / SPRITE.cols) * SPRITE.frameHeight,
}));

// ─── Props ───────────────────────────────────────────────────────────────────

export interface HoneyBadgerLoaderProps {
  /** Width in px. Height scales automatically to preserve the native aspect ratio. Default: 220 */
  size?: number;
  /** Animation speed in frames per second. Default: 18 */
  fps?: number;
  /** Pause on the current frame without unmounting. Default: false */
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Component ───────────────────────────────────────────────────────────────

function HoneyBadgerLoaderImpl({
  size = 220,
  fps = 18,
  paused = false,
  className,
  style,
}: HoneyBadgerLoaderProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  // Store fps in a ref so the animation loop always reads the latest value
  // without needing to restart when fps changes.
  const fpsRef = useRef(fps);
  fpsRef.current = fps;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || paused) return;

    // Don't animate if the user has requested reduced motion (accessibility).
    const prefersReducedMotion =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Scale the pre-computed offsets to match the current display size.
    const sizeScale = size / SPRITE.frameWidth;
    const scaledPositions = FRAME_OFFSETS.map(
      ({ x, y }) => `${-x * sizeScale}px ${-y * sizeScale}px`,
    );

    // Animation loop — runs outside React to avoid re-renders on every frame.
    // Uses an accumulator so the playback speed stays accurate regardless of
    // how often the browser calls requestAnimationFrame.
    let animationFrameId = 0;
    let currentFrame = 0;
    let lastTimestamp = performance.now();
    let elapsedTime = 0;

    function tick(timestamp: number) {
      const msPerFrame = 1000 / fpsRef.current;

      elapsedTime += timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Advance frames for however much time has passed.
      if (elapsedTime >= msPerFrame) {
        elapsedTime %= msPerFrame;
        currentFrame = (currentFrame + 1) % SPRITE.frameCount;
        element.style.backgroundPosition = scaledPositions[currentFrame];
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [paused, size]);

  const displayWidth = size;
  const displayHeight = Math.round(size * ASPECT_RATIO);
  const sheetWidth = SPRITE.cols * size;

  return (
    <div
      ref={elementRef}
      role="img"
      aria-label="Loading"
      className={className}
      style={{
        width: displayWidth,
        height: displayHeight,
        backgroundImage: `url(${spriteSrc})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${sheetWidth}px auto`,
        backgroundPosition: "0 0",
        // Tells the browser this element's layout and paint are self-contained,
        // so it can skip work on surrounding elements when we update the background.
        contain: "strict",
        ...style,
      }}
    />
  );
}

// memo prevents re-renders when a parent re-renders with the same props.
const HoneyBadgerLoader = memo(HoneyBadgerLoaderImpl);
HoneyBadgerLoader.displayName = "HoneyBadgerLoader";

export default HoneyBadgerLoader;
