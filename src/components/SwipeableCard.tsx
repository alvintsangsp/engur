import { useState, useRef, useCallback, ReactNode } from "react";
import { Trash2, History } from "lucide-react";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
  onClick?: () => void;
}

const SWIPE_THRESHOLD = 80;
const MAX_SWIPE = 120;

const SwipeableCard = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = "Delete",
  rightLabel = "Move to end",
  className = "",
  onClick,
}: SwipeableCardProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);
  const hasTriggered = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    isSwiping.current = false;
    hasTriggered.current = false;
    setIsAnimating(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;

    // Only start horizontal swiping if movement is more horizontal than vertical
    if (!isSwiping.current && Math.abs(deltaX) > 10) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwiping.current = true;
      }
    }

    if (isSwiping.current) {
      e.preventDefault();
      // Clamp the offset
      const clampedOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
      setOffsetX(clampedOffset);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) {
      startPos.current = null;
      return;
    }

    setIsAnimating(true);

    if (offsetX < -SWIPE_THRESHOLD && onSwipeLeft && !hasTriggered.current) {
      hasTriggered.current = true;
      // Animate out then trigger action
      setOffsetX(-200);
      setTimeout(() => {
        onSwipeLeft();
        setOffsetX(0);
        setIsAnimating(false);
      }, 200);
    } else if (offsetX > SWIPE_THRESHOLD && onSwipeRight && !hasTriggered.current) {
      hasTriggered.current = true;
      // Animate out then trigger action
      setOffsetX(200);
      setTimeout(() => {
        onSwipeRight();
        setOffsetX(0);
        setIsAnimating(false);
      }, 200);
    } else {
      // Snap back
      setOffsetX(0);
      setTimeout(() => setIsAnimating(false), 200);
    }

    startPos.current = null;
    isSwiping.current = false;
  }, [offsetX, onSwipeLeft, onSwipeRight]);

  const handleTouchCancel = useCallback(() => {
    setIsAnimating(true);
    setOffsetX(0);
    startPos.current = null;
    isSwiping.current = false;
    setTimeout(() => setIsAnimating(false), 200);
  }, []);

  const handleClick = useCallback(() => {
    if (!isSwiping.current && onClick) {
      onClick();
    }
  }, [onClick]);

  const showLeftAction = offsetX < -20;
  const showRightAction = offsetX > 20;
  const leftProgress = Math.min(1, Math.abs(offsetX) / SWIPE_THRESHOLD);
  const rightProgress = Math.min(1, offsetX / SWIPE_THRESHOLD);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left action background (delete) */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center justify-end pr-6 bg-destructive transition-opacity ${
          showLeftAction ? "opacity-100" : "opacity-0"
        }`}
        style={{ width: Math.abs(Math.min(offsetX, 0)) + 60 }}
      >
        <div className="flex items-center gap-2 text-destructive-foreground">
          <Trash2
            className="w-5 h-5"
            style={{ transform: `scale(${0.8 + leftProgress * 0.4})` }}
          />
          <span className="text-sm font-medium">{leftLabel}</span>
        </div>
      </div>

      {/* Right action background (move to end) */}
      <div
        className={`absolute inset-y-0 left-0 flex items-center justify-start pl-6 bg-primary transition-opacity ${
          showRightAction ? "opacity-100" : "opacity-0"
        }`}
        style={{ width: Math.max(offsetX, 0) + 60 }}
      >
        <div className="flex items-center gap-2 text-primary-foreground">
          <History
            className="w-5 h-5"
            style={{ transform: `scale(${0.8 + rightProgress * 0.4})` }}
          />
          <span className="text-sm font-medium">{rightLabel}</span>
        </div>
      </div>

      {/* Main card content */}
      <div
        className={`relative bg-card ${className}`}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isAnimating ? "transform 0.2s ease-out" : "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;
