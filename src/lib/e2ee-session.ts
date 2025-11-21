/**
 * E2EE session management
 */
import { base64urlEncode } from "./e2ee";
import { z } from "zod";
import { useSyncExternalStore } from "react";

const CryptoSession = z.object({
  kek: z.string(), // base64url-encoded
  credentialId: z.string(),
});

type CryptoSession = z.infer<typeof CryptoSession>;

const STORAGE_KEY = "crypto_session";

type SessionStateChangeListener = (event: { isUnlocked: boolean }) => void;

const sessionStateChangeListeners: SessionStateChangeListener[] = [];

/**
 * Notify all listeners of session state change
 */
function notifySessionStateChange(isUnlocked: boolean): void {
  for (const listener of sessionStateChangeListeners) {
    listener({ isUnlocked });
  }
}

/**
 * Get the crypto session from sessionStorage
 */
function get(): CryptoSession | null {
  if (typeof window === "undefined") return null;

  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (!cached) return null;

  return CryptoSession.parse(JSON.parse(cached));
}

/**
 * Check if a crypto session exists in sessionStorage
 */
function exists(): boolean {
  return !!get();
}

/**
 * Store a crypto session in sessionStorage
 */
function set(kek: Uint8Array, credentialId: string): void {
  if (typeof window === "undefined") return;

  const cached: CryptoSession = {
    kek: base64urlEncode(kek),
    credentialId,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  notifySessionStateChange(true);
}

/**
 * Clear the crypto session from sessionStorage
 */
function clear(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(STORAGE_KEY);
  notifySessionStateChange(false);
}

/**
 * Register a listener for session state changes
 *
 * Returns a cleanup function to remove the listener
 */
function onStateChange(listener: SessionStateChangeListener) {
  sessionStateChangeListeners.push(listener);
  return () => {
    const index = sessionStateChangeListeners.indexOf(listener);
    if (index !== -1) {
      sessionStateChangeListeners.splice(index, 1);
    }
  };
}

/**
 * Register a callback to be called when session is unlocked
 *
 * Convenience wrapper around onStateChange that only fires on unlock.
 * If session is already unlocked when this is called, the callback fires immediately.
 *
 * Returns a cleanup function to remove the listener
 */
function onUnlock(callback: () => void) {
  // Fire immediately if already unlocked
  if (exists()) {
    callback();
  }

  return onStateChange((event) => {
    if (event.isUnlocked) {
      callback();
    }
  });
}

/**
 * Subscribe function for React's useSyncExternalStore
 *
 * Adapts onStateChange to the signature expected by useSyncExternalStore
 */
function subscribe(callback: () => void) {
  return onStateChange(() => {
    callback();
  });
}

/**
 * React hook to subscribe to session state
 *
 * Returns true if session is unlocked, false otherwise
 */
export function useSessionState() {
  return useSyncExternalStore(
    subscribe,
    exists,
    () => false, // Server snapshot - session never unlocked on server
  );
}

export const cryptoSession = {
  get,
  exists,
  set,
  clear,
  onStateChange,
  onUnlock,
  subscribe,
};
