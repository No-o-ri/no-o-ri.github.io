"use client";

import { useEffect, useRef, useState } from "react";

/** Returns [ref, seen]; `seen` flips true once the element is ≥ `amount` visible and stays true. */
export function useInViewOnce<T extends Element>(amount = 0.35): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: amount },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [amount, seen]);
  return [ref, seen];
}
