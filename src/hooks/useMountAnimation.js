/**
 * useMountAnimation.js
 * Returns a boolean `mounted` that flips to true after a short delay.
 * Re-fires whenever `key` changes (e.g. on theme switch) so buildings
 * re-animate from the bottom.
 */

import { useState, useEffect } from "react";

/**
 * @param {any} key  Changing this value re-triggers the animation.
 * @param {number} delay  ms before `mounted` becomes true (default 80)
 */
export function useMountAnimation(key, delay = 80) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [key, delay]);

  return mounted;
}
