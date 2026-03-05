/**
 * useMousePosition.js
 * Tracks the global mouse position so tooltips can follow the cursor.
 * Returns { x, y } in viewport coordinates.
 */

import { useState, useEffect, useCallback } from "react";

export function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = useCallback((e) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [handleMove]);

  return pos;
}
