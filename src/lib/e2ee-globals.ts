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
 * Functions handle session state internally:
 * - isDekUnlocked() returns false if session is not unlocked
 * - encryptContactName() throws if session is locked or encryption not ready
 *
 * Also sets up session state change notifications to the chrome extension via postMessage.
 */
import { encryptField } from "./e2ee";
import { getSessionDek } from "./e2ee-actions";
import { cryptoSession } from "./e2ee-session";

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
    return cryptoSession.exists();
  };

  /**
   * Encrypt a contact name using the session DEK
   *
   * Throws if DEK is not available (user must unlock first or wait for sync)
   */
  window.encryptContactName = async (name: string): Promise<string> => {
    if (!cryptoSession.exists()) {
      throw new Error("DEK not available. User must unlock E2EE first.");
    }

    const dek = await getSessionDek();
    if (!dek) {
      throw new Error("Encryption not ready. Please wait for sync.");
    }

    return encryptField(name, dek);
  };
}

// Initialize globals once when module loads (if in browser)
if (typeof window !== "undefined") {
  setupE2eeGlobals();

  // Set up Chrome extension integration
  // Listen to session state changes and notify the extension
  cryptoSession.onStateChange((event) => {
    window.postMessage(
      {
        type: "TOUCH_DEK_STATE_CHANGE",
        isUnlocked: event.isUnlocked,
      },
      window.location.origin,
    );
  });
}
