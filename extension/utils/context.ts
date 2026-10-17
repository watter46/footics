/**
 * context.ts
 * Extension context validation utilities.
 * Guard against "Extension context invalidated." errors when content scripts
 * attempt to access browser/chrome APIs after extension reload or update.
 */

/**
 * Checks if the current extension execution context is valid.
 * Returns false if the context was invalidated (e.g. extension was reloaded/updated).
 */
export function isExtensionContextValid(): boolean {
  try {
    if (typeof browser !== 'undefined') {
      if (browser.runtime) {
        return Boolean(browser.runtime.id);
      }
      // If browser.storage exists in mock/test environment without runtime
      if (browser.storage?.local) {
        return true;
      }
      return false;
    }
    if (typeof chrome !== 'undefined') {
      if (chrome.runtime) {
        return Boolean(chrome.runtime.id);
      }
      if (chrome.storage?.local) {
        return true;
      }
      return false;
    }
    return false;
  } catch {
    return false;
  }
}
