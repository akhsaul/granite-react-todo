import { useState, useEffect } from "react";

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    // Add the event listener in a way that's compatible with Safari
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else {
      media.addListener(listener); // Deprecated but needed for some browsers
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener); // Deprecated
      }
    };
  }, [matches, query]);

  return matches;
};
