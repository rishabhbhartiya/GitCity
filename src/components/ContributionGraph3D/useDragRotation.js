/**
 * useDragRotation.js
 */

import { useState, useRef, useCallback } from "react";

/**
 * @param {object} opts
 * @param {number} opts.initRotX   initial X rotation in degrees (default 55)
 * @param {number} opts.initRotY   initial Y rotation in degrees (default -20)
 * @param {number} opts.minRotX    clamp minimum pitch (default 5)
 * @param {number} opts.maxRotX    clamp maximum pitch (default 89)
 */
export function useDragRotation({
  initRotX = 55,
  initRotY = -20,
  minRotX = 5,
  maxRotX = 89,
} = {}) {
  const [rot, setRot] = useState({ x: initRotX, y: initRotY });
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef(null); // { startX, startY, startRotX, startRotY }

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRotX: rot.x,
      startRotY: rot.y,
    };
  }, [rot]);

  const onMouseMove = useCallback((e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setRot({
      x: Math.max(minRotX, Math.min(maxRotX, drag.current.startRotX - dy * 0.4)),
      y: drag.current.startRotY + dx * 0.4,
    });
  }, [minRotX, maxRotX]);

  const onMouseUp = useCallback(() => {
    drag.current = null;
    setIsDragging(false);
  }, []);

  // Touch support
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    setIsDragging(true);
    drag.current = {
      startX: t.clientX,
      startY: t.clientY,
      startRotX: rot.x,
      startRotY: rot.y,
    };
  }, [rot]);

  const onTouchMove = useCallback((e) => {
    if (!drag.current) return;
    const t = e.touches[0];
    const dx = t.clientX - drag.current.startX;
    const dy = t.clientY - drag.current.startY;
    setRot({
      x: Math.max(minRotX, Math.min(maxRotX, drag.current.startRotX - dy * 0.4)),
      y: drag.current.startRotY + dx * 0.4,
    });
  }, [minRotX, maxRotX]);

  const onTouchEnd = useCallback(() => {
    drag.current = null;
    setIsDragging(false);
  }, []);

  const reset = useCallback(() => {
    setRot({ x: initRotX, y: initRotY });
  }, [initRotX, initRotY]);

  return {
    rotX: rot.x,
    rotY: rot.y,
    isDragging,
    reset,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave: onMouseUp,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
