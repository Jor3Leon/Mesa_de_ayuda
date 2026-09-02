import { useState, useEffect } from 'react';

/**
 * Custom React Hook to detect if the current viewport matches a mobile breakpoint.
 * Uses window.matchMedia for performant event-driven updates.
 *
 * @param {number} breakpoint - Max width in pixels for mobile (default: 768px)
 * @returns {boolean} true if viewport width < breakpoint
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (event) => setIsMobile(event.matches);

    // Sync initial state
    setIsMobile(mq.matches);

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else if (typeof mq.addListener === 'function') {
      // Fallback for older browsers
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
