let currentZIndex = 100;

/**
 * Brings the given DOM element to the front by increasing its z-index
 * beyond all other elements that use this function.
 * 
 * @param element The DOM element to bring to the front
 */
export const bringElementToFront = (element: HTMLElement | null) => {
  if (!element) return;
  
  currentZIndex += 1;
  
  // Prevent integer overflow or getting too high, though extremely unlikely
  if (currentZIndex > 9999) {
    currentZIndex = 100;
  }
  
  element.style.zIndex = currentZIndex.toString();
};
