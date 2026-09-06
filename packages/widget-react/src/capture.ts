import { domToBlob } from "modern-screenshot";

type CaptureOptions = {
  /** Skip images and videos for a fast fallback capture. */
  lightweight?: boolean;
};

/**
 * Screenshot of what the reviewer currently sees: the viewport, at the current
 * scroll position. modern-screenshot renders the whole document from its
 * origin, so without the translate a page scrolled down would always produce
 * an image of its top. Click coordinates are viewport-relative (clientX/Y),
 * so the marker and the image stay consistent.
 */
export function captureViewport({ lightweight = false }: CaptureOptions = {}) {
  const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

  return domToBlob(document.body, {
    width: window.innerWidth,
    height: window.innerHeight,
    scale: window.devicePixelRatio || 1,
    style: {
      transform: `translate(${-scrollX}px, ${-scrollY}px)`,
      transformOrigin: "top left",
    },
    features: { restoreScrollPosition: true },
    // Inverted from html2canvas: return true to INCLUDE, false to EXCLUDE
    filter: (el: Node) => {
      if (el instanceof Element && el.hasAttribute("data-ff-widget")) return false;
      if (lightweight) {
        if (el instanceof HTMLImageElement) return false;
        if (el instanceof HTMLVideoElement) return false;
        if (el instanceof HTMLPictureElement) return false;
      }
      return true;
    },
  });
}
