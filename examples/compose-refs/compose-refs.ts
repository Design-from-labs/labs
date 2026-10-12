import type * as React from "react";

/**
 * One ref callback that keeps every given ref pointing at the same element.
 * Works with callback refs and ref objects, and returns a React 19 cleanup
 * that releases each of them.
 */
export function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    const cleanups: Array<() => void> = [];
    for (const ref of refs) {
      if (typeof ref === "function") {
        const cleanup = ref(node);
        cleanups.push(
          typeof cleanup === "function" ? cleanup : () => ref(null),
        );
      } else if (ref) {
        ref.current = node;
        cleanups.push(() => {
          ref.current = null;
        });
      }
    }
    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };
}
