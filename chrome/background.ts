/* eslint-disable */
console.log("Background service worker initialized!");

const linkedinPattern = /^https:\/\/www\.linkedin\.com\/in\/[a-z0-9-]+\/$/;

/**
 * Icon state enum
 */
type IconState = "enabled" | "disabled";

/**
 * Icon paths for different states
 */
const ICON_PATHS: Record<IconState, { "48": string; "128": string }> = {
  enabled: {
    "48": "icon-48.png",
    "128": "icon-128.png",
  },
  disabled: {
    "48": "icon-gray-48.png",
    "128": "icon-gray-128.png",
  },
};

/**
 * Normalize a LinkedIn URL to the canonical format
 */
function normalizeLinkedInUrl(input: string) {
  const u = new URL(input);

  // Remove hash
  u.hash = "";

  // Remove search
  u.search = "";

  // Lowercase the URL
  const normalizedUrl = u.href.toLowerCase();

  // Check if the URL is a valid LinkedIn URL, including the trailing slash
  if (!linkedinPattern.test(normalizedUrl)) return null;

  // Return the normalized URL
  return normalizedUrl;
}

/**
 * Notify the user with a basic notification
 */
async function notify(message: string): Promise<void> {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: ICON_PATHS["enabled"]["128"],
      title: "Touch",
      message,
    });
  } catch (error) {
    // notifications permission not granted; ignore
    console.log("error", error);
  }
}

/**
 * Get the allowed origins from the manifest
 */
function getAllowedOriginsFromManifest(): string[] {
  const hostPermissions: string[] =
    chrome.runtime.getManifest().host_permissions;

  return hostPermissions.map((p) => new URL(p).origin);
}

/**
 * Find the best Touch tab within the first origin (by manifest order) that has
 * open tabs. The best tab is the most recently accessed tab.
 */
async function findBestTouchTab(origins: string[]) {
  const tabs = await chrome.tabs.query({});

  for (const origin of origins) {
    const candidates: chrome.tabs.Tab[] = [];

    for (const t of tabs) {
      if (!t.url) continue;

      const tabUrl = new URL(t.url);

      if (tabUrl.origin === origin) {
        candidates.push(t);
      }
    }

    // Keep looking at the next origin if there are no candidates
    if (candidates.length === 0) continue;

    // Find the most recently accessed tab with this origin
    candidates.sort((a, b) => {
      const aAccessed = a.lastAccessed ?? 0;
      const bAccessed = b.lastAccessed ?? 0;
      return bAccessed - aAccessed;
    });

    const [best] = candidates;

    if (!best?.id) return null;

    return best.id;
  }

  return null;
}

/**
 * Check if DEK is unlocked in a Touch tab
 */
async function checkDekUnlocked(tabId: number): Promise<boolean> {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const win = window as any;
        try {
          return win.isDekUnlocked?.() ?? false;
        } catch {
          return false;
        }
      },
    });

    return injection?.result === true;
  } catch (error) {
    // Script injection might fail if page isn't ready or CSP blocks it
    // Return false to be safe
    console.log("Failed to check DEK unlock status:", error);
    return false;
  }
}

/**
 * Track DEK unlock state per tab
 */
const dekStateByTab = new Map<number, boolean>();

/**
 * Update extension icon state based on Touch tab availability and DEK unlock status
 */
async function updateIconState(): Promise<void> {
  const allowedOrigins = getAllowedOriginsFromManifest();
  const touchTabId = await findBestTouchTab(allowedOrigins);

  if (!touchTabId) {
    await chrome.action.setIcon({ path: ICON_PATHS.disabled });
    // Clear badge when no Touch tab is available
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({
      title: "Touch: Open Touch app in a browser tab",
    });

    return;
  }

  // Use cached state if available, otherwise check
  const cachedState = dekStateByTab.get(touchTabId);
  const isDekUnlocked =
    cachedState !== undefined
      ? cachedState
      : await checkDekUnlocked(touchTabId);

  // Update badge and title
  if (isDekUnlocked) {
    await chrome.action.setIcon({ path: ICON_PATHS.enabled });
    await chrome.action.setBadgeText({ text: "✓" });
    await chrome.action.setBadgeBackgroundColor({ color: "#16a34a" }); // green
    await chrome.action.setTitle({ title: "Touch: Ready to save contacts" });
  } else {
    await chrome.action.setIcon({ path: ICON_PATHS.disabled });
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" }); // red
    await chrome.action.setTitle({
      title: "Touch: Unlock your vault to save contacts",
    });
  }
}

chrome.action.onClicked.addListener((tab) => {
  const run = async () => {
    try {
      if (!tab || typeof tab.id !== "number") throw new Error("No active tab");

      // 1) Extract LinkedIn data from the current tab
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return {
            // Extract the URL from the page
            url: location.href,
            // Extract the name from the page
            name: document.querySelector("h1")?.textContent,
          };
        },
      });

      if (!injection?.result?.name) {
        await notify("Not a LinkedIn profile URL ");
        return;
      }

      const name = injection.result.name.trim();
      const linkedin = normalizeLinkedInUrl(injection.result.url);

      if (!linkedin) {
        await notify("Not a LinkedIn profile URL ");
        return;
      }

      // 2) Locate the best Touch tab within the first origin (by manifest
      //    order) that has open tabs
      const allowedOrigins = getAllowedOriginsFromManifest();
      const touchTabId = await findBestTouchTab(allowedOrigins);

      if (!touchTabId) {
        await notify(
          "Touch app not open - Open Touch in a browser tab to sync contacts",
        );
        return;
      }

      // 3) Encrypt the name and post via the Touch tab so auth cookies apply
      // We check DEK status inside the injected script for better reliability
      // Use MAIN world to access page's window object where globals are set
      const [inj] = await chrome.scripting.executeScript({
        target: { tabId: touchTabId },
        world: "MAIN",
        args: [{ name, linkedin }],
        func: async (payload) => {
          try {
            const win = window as any;

            // Check if DEK is unlocked (functions are always available)
            if (!win.isDekUnlocked?.()) {
              return {
                ok: false as const,
                error: "DEK_LOCKED",
                debug: "DEK is not unlocked",
              };
            }

            // Encrypt the name (function throws if DEK not available)
            const encryptedName = await win.encryptContactName(payload.name);

            const url = new URL("/api/chrome", window.location.origin);
            const res = await fetch(url.toString(), {
              method: "POST",
              headers: { "content-type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                name: encryptedName,
                linkedin: payload.linkedin,
              }),
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              return { ok: false as const, status: res.status, data };
            }

            const data = await res.json().catch(() => ({}));

            return { ok: true as const, data };
          } catch (e) {
            if (e instanceof Error) {
              return {
                ok: false as const,
                error: e.message,
                debug: `Exception: ${e.message} ${e.stack || ""}`,
              };
            }

            throw e;
          }
        },
      });

      const result = inj?.result;

      if (result?.ok) {
        await notify(
          result.data?.mode === "created"
            ? "Contact created"
            : result.data?.mode === "updated"
              ? "Contact updated"
              : "Contact up to date",
        );
        return;
      }

      // Handle specific error cases
      if (result?.error === "DEK_LOCKED") {
        // Log debug info to console for troubleshooting
        console.log("DEK_LOCKED error:", result?.debug);
        await notify(
          "Unlock Touch to save contacts - Click the Touch app tab and unlock your vault",
        );
        return;
      }

      const errorMessage =
        result?.error ||
        (result?.status === 401
          ? "Sign in to Touch"
          : result?.error?.includes("encrypt") || result?.error?.includes("DEK")
            ? "Failed to encrypt contact name"
            : "Failed to save contact");

      await notify(errorMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await notify(message);
    }
  };

  void run();
});

/**
 * Listen for messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DEK_STATE_CHANGE" && sender.tab?.id) {
    // Update cached state
    dekStateByTab.set(sender.tab.id, message.isUnlocked);
    // Update icon state immediately
    void updateIconState();
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});

/**
 * Update icon state on startup
 */
void updateIconState();

/**
 * Update icon state when tabs are updated (only for Touch tabs)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only check when navigation completes
  if (changeInfo.status !== "complete") return;

  const allowedOrigins = getAllowedOriginsFromManifest();
  if (!tab.url) return;

  const tabOrigin = new URL(tab.url).origin;
  if (allowedOrigins.includes(tabOrigin)) {
    // Clear cached state on navigation (new page load)
    dekStateByTab.delete(tabId);
    void updateIconState();
  }
});

/**
 * Update icon state when tabs are removed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  dekStateByTab.delete(tabId);
  void updateIconState();
});
