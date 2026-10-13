// ---- upstream: src/components/liquid/motion.ts ----
/* The one motion question every component in here asks: may I move at all?

   ONE implementation, shared by every liquid surface. */

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
