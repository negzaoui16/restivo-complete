import { useState, useCallback } from "react";

/**
 * Generic circular carousel hook.
 *
 * @param length  Total number of items in the carousel.
 * @returns `active` index, `prev` handler, `next` handler.
 */
export function useCarousel(length: number) {
  const [active, setActive] = useState(0);

  const prev = useCallback(
    () => setActive((i) => (i === 0 ? length - 1 : i - 1)),
    [length]
  );

  const next = useCallback(
    () => setActive((i) => (i === length - 1 ? 0 : i + 1)),
    [length]
  );

  return { active, prev, next } as const;
}
