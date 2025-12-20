import { useState, useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  offsetX: number;
  offsetY: number;
  direction: "left" | "right" | "up" | "down" | null;
}

const SWIPE_THRESHOLD = 80;

export const useSwipe = (handlers: SwipeHandlers, enabled: boolean = true) => {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    offsetX: 0,
    offsetY: 0,
    direction: null,
  });
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      isSwiping.current = true;
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startPos.current || !isSwiping.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startPos.current.x;
      const deltaY = touch.clientY - startPos.current.y;

      // Determine primary direction
      let direction: SwipeState["direction"] = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? "right" : "left";
      } else if (deltaY < -SWIPE_THRESHOLD / 2) {
        direction = "up";
      }

      setSwipeState({
        offsetX: deltaX,
        offsetY: deltaY,
        direction,
      });
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isSwiping.current) return;

    const { offsetX, offsetY } = swipeState;

    // Check if swipe threshold is met
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      if (offsetX > 0) {
        handlers.onSwipeRight?.();
      } else {
        handlers.onSwipeLeft?.();
      }
    } else if (offsetY < -SWIPE_THRESHOLD) {
      handlers.onSwipeUp?.();
    }

    // Reset state
    setSwipeState({ offsetX: 0, offsetY: 0, direction: null });
    startPos.current = null;
    isSwiping.current = false;
  }, [enabled, swipeState, handlers]);

  const handleTouchCancel = useCallback(() => {
    setSwipeState({ offsetX: 0, offsetY: 0, direction: null });
    startPos.current = null;
    isSwiping.current = false;
  }, []);

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
};
