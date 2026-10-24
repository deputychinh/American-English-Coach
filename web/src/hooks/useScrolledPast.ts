'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

/** Whether the element has scrolled up past the top of the screen (iOS large-title collapse). */
export const useScrolledPast = <T extends HTMLElement>(): [RefObject<T | null>, boolean] => {
  const ref = useRef<T>(null);
  const [isPast, setIsPast] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    // Plain viewport: a margin that already covers the title at rest would never report a change.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setIsPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, isPast];
};
