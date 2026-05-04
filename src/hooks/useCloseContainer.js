import React, { useEffect, useRef, useState } from "react";

export default function useCloseContainer(
  preventContainerClose = false,
  additionalRefs = [],
) {
  const containerRef = useRef(null);
  const [isContainerOpened, setIsContainerOpened] = useState(false);

  useEffect(() => {
    const handleOffClick = (e) => {
      const isInside = [containerRef, ...additionalRefs].some(
        (ref) => ref.current && ref.current.contains(e.target),
      );
      if (!isInside && !preventContainerClose) {
        setIsContainerOpened(false);
      }
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [preventContainerClose]);

  return { containerRef, isContainerOpened, setIsContainerOpened };
}
