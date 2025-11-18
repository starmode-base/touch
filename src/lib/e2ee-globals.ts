/**
 * Chrome extension globals for E2EE
 *
 * Sets up global window functions that allow the chrome extension to interact
 * with E2EE encryption functions from injected scripts.
 *
 * These functions are always available in the tab context where the chrome extension
 * injects scripts. They allow the extension to encrypt contact names using
 * the same encryption logic as the main app.
 *
 * Functions handle DEK availability internally:
 * - isDekUnlocked() returns false if DEK is not available
 * - encryptContactName() throws if DEK is not available
 *
 * Also sets up DEK state change notifications to the chrome extension via postMessage.
 */

import { hasGlobalDek, encryptField, onDekStateChange } from "./e2ee";
import { getSessionDek } from "./e2ee-app";

/**
 * Global window interface for E2EE functions exposed to chrome extension
 */
declare global {
  interface Window {
    encryptContactName?: (name: string) => Promise<string>;
    isDekUnlocked?: () => boolean;
  }
}

/**
 * Setup E2EE encryption functions globally for chrome extension access
 */
function setupE2eeGlobals(): void {
  if (typeof window === "undefined") {
    return;
  }

  /**
   * Check if DEK is unlocked and available
   */
  window.isDekUnlocked = (): boolean => {
    return hasGlobalDek();
  };

  /**
   * Encrypt a contact name using the global DEK
   *
   * Throws if DEK is not available (user must unlock first)
   */
  window.encryptContactName = async (name: string): Promise<string> => {
    if (!hasGlobalDek()) {
      throw new Error("DEK not available. User must unlock E2EE first.");
    }

    const dek = await getSessionDek();
    return encryptField(name, dek);
  };
}

// Initialize globals once when module loads (if in browser)
if (typeof window !== "undefined") {
  setupE2eeGlobals();

  // Set up Chrome extension integration
  // Listen to DEK state changes and notify the extension
  onDekStateChange((event) => {
    window.postMessage(
      {
        type: "TOUCH_DEK_STATE_CHANGE",
        isUnlocked: event.isUnlocked,
      },
      window.location.origin,
    );
  });
}
