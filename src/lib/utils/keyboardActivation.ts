import type { KeyboardEvent } from 'react';

/**
 * Builds an `onKeyDown` handler that activates a non-native interactive element
 * (a `div`/`span` carrying `role="button"`) with Enter or Space, so it behaves
 * like a native `<button>` for keyboard and screen-reader users.
 *
 * Space is prevented from scrolling the page, matching native button behaviour.
 * `Spacebar` is the legacy IE/Edge key value, kept for older WebViews.
 *
 * Use this only where a native `<button>` is not possible (e.g. a card that
 * contains its own nested buttons, or a table cell). Prefer a real `<button>`
 * wherever the markup allows it.
 *
 * @example
 * <div role="button" tabIndex={0} onClick={copy} onKeyDown={activateOnKey(copy)} />
 */
export function activateOnKey(
  activate: () => void,
): (event: KeyboardEvent<HTMLElement>) => void {
  return (event) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      activate();
    }
  };
}
