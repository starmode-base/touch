/**
 * Focus refetch
 *
 * The Chrome extension writes contacts and contact activities server-side,
 * bypassing the collections, and the collection mutation handlers skip
 * refetching (they write their own rows back directly). Refetch those
 * collections when the app regains focus so external writes show up without
 * a full page load.
 *
 * Importing this module (client-side) registers the listeners; it is inert
 * during SSR.
 */
import { contactsStore } from "#collections/contacts";
import { contactActivitiesCollection } from "#collections/contact-activities";

/** Skip refetch bursts (visibilitychange and focus often fire together) */
const THROTTLE_MS = 1_000;

let lastRefetchAt = 0;

function refetchExternallyWritten() {
  if (document.visibilityState !== "visible") return;

  const now = Date.now();
  if (now - lastRefetchAt < THROTTLE_MS) return;
  lastRefetchAt = now;

  // Only refetch collections that have synced before; this skips signed-out
  // visitors and collections that haven't loaded yet
  contactsStore.refetch().catch(console.warn);

  if (contactActivitiesCollection.status === "ready") {
    contactActivitiesCollection.utils.refetch().catch(console.warn);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("focus", refetchExternallyWritten);
  document.addEventListener("visibilitychange", refetchExternallyWritten);
}
