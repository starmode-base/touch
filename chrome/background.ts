import { z } from "zod";

console.log("Background service worker initialized!");

const linkedinPattern = /^https:\/\/www\.linkedin\.com\/in\/[a-z0-9-]+\/$/;

/**
 * Schema for content script messages
 */
const dekStateChangeMessageSchema = z.object({
  type: z.literal("DEK_STATE_CHANGE"),
  isUnlocked: z.boolean(),
});

/**
 * Schema for API response from /api/chrome
 */
const apiResponseSchema = z.object({
  mode: z.enum(["created", "updated", "unchanged"]),
});

/**
 * Schema for script injection result (error case)
 */
const injectionErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  status: z.number().optional(),
  debug: z.string().optional(),
});

/**
 * Schema for script injection result (success case)
 */
const injectionSuccessSchema = z.object({
  ok: z.literal(true),
  data: apiResponseSchema,
});

/**
 * Schema for LinkedIn profile extraction
 */
const linkedinExtractionSchema = z.object({
  url: z.string(),
  name: z.string().nullable(),
});

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
  await chrome.notifications.create({
    type: "basic",
    iconUrl: ICON_PATHS.enabled["128"],
    title: "Touch",
    message,
  });
}

/**
 * Get the allowed origins from the manifest
 */
function getAllowedOriginsFromManifest(): string[] {
  const manifest = chrome.runtime.getManifest();
  const hostPermissions = z.array(z.string()).parse(manifest.host_permissions);

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
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      // Return the result directly - if window doesn't have the expected shape, validation will fail
      return (
        (window as { isDekUnlocked?: () => boolean }).isDekUnlocked?.() ?? false
      );
    },
  });

  return injection?.result === true;
}

/**
 * Track DEK unlock state per tab
 */
const dekStateByTab = new Map<number, boolean>();

/**
 * Check if a URL is a LinkedIn profile page
 */
function isLinkedInProfilePage(url: string | undefined): boolean {
  if (!url) return false;
  const normalizedUrl = normalizeLinkedInUrl(url);
  return normalizedUrl !== null;
}

/**
 * Base function to set icon state with all visual properties
 */
async function setIcon(options: {
  tabId: number;
  iconState: IconState;
  badge: {
    text: string;
    color: string;
  } | null;
  title: string;
}): Promise<void> {
  await chrome.action.setTitle({ tabId: options.tabId, title: options.title });

  await chrome.action.setIcon({
    tabId: options.tabId,
    path: ICON_PATHS[options.iconState],
  });

  if (options.badge) {
    await chrome.action.setBadgeText({
      tabId: options.tabId,
      text: options.badge.text,
    });

    await chrome.action.setBadgeBackgroundColor({
      tabId: options.tabId,
      color: options.badge.color,
    });
  } else {
    await chrome.action.setBadgeText({ tabId: options.tabId, text: "" });
  }
}

/**
 * Set icon to disabled state (gray, not on LinkedIn)
 */
async function setIconDisabled(tabId: number): Promise<void> {
  await setIcon({
    tabId,
    iconState: "disabled",
    badge: null,
    title: "Touch: Navigate to a LinkedIn profile page to save contacts",
  });
}

/**
 * Set icon to "no Touch tab" state (black icon, red badge)
 */
async function setIconNoTouch(tabId: number): Promise<void> {
  await setIcon({
    tabId,
    iconState: "enabled",
    badge: { text: "!", color: "#dc2626" },
    title: "Touch: Open Touch app in a browser tab",
  });
}

/**
 * Set icon to "locked" state (black icon, yellow badge)
 */
async function setIconLocked(tabId: number): Promise<void> {
  await setIcon({
    tabId,
    iconState: "enabled",
    badge: { text: "!", color: "#eab308" },
    title: "Touch: Unlock your vault to save contacts",
  });
}

/**
 * Set icon to "ready" state (black icon, green badge)
 */
async function setIconReady(tabId: number): Promise<void> {
  await setIcon({
    tabId,
    iconState: "enabled",
    badge: { text: "✓", color: "#16a34a" },
    title: "Touch: Ready to save contacts",
  });
}

/**
 * Update icon state for a specific tab using progressive guard clauses
 */
async function updateTabIconState(
  tabId: number,
  url: string | undefined,
): Promise<void> {
  // Not LinkedIn → gray
  if (!url || !isLinkedInProfilePage(url)) {
    await setIconDisabled(tabId);
    return;
  }

  // LinkedIn profile - check Touch/DEK state
  const allowedOrigins = getAllowedOriginsFromManifest();
  const touchTabId = await findBestTouchTab(allowedOrigins);

  // No Touch → red
  if (!touchTabId) {
    await setIconNoTouch(tabId);
    return;
  }

  // Has Touch - check DEK status
  const cachedState = dekStateByTab.get(touchTabId);
  const isDekUnlocked = cachedState ?? (await checkDekUnlocked(touchTabId));

  // Touch + locked → yellow
  if (!isDekUnlocked) {
    await setIconLocked(tabId);
    return;
  }

  // Touch + unlocked → green (happy path!)
  await setIconReady(tabId);
}

/**
 * Update icon state for all tabs (across all windows)
 */
async function updateAllTabsIconState(): Promise<void> {
  const tabs = await chrome.tabs.query({});

  // Only update LinkedIn tabs - non-LinkedIn tabs are already gray by default
  const linkedInTabs = tabs.filter(
    (tab): tab is chrome.tabs.Tab & { id: number } =>
      tab.id !== undefined &&
      tab.url !== undefined &&
      isLinkedInProfilePage(tab.url),
  );

  await Promise.all(
    linkedInTabs.map((tab) => updateTabIconState(tab.id, tab.url)),
  );
}

chrome.action.onClicked.addListener((tab) => {
  const run = async () => {
    if (typeof tab.id !== "number") throw new Error("No active tab");

    // 0) Check if we're on a LinkedIn profile page
    if (!tab.url || !isLinkedInProfilePage(tab.url)) {
      await notify("Navigate to a LinkedIn profile page to save contacts");
      return;
    }

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

    const extractedData = linkedinExtractionSchema.parse(injection?.result);

    if (!extractedData.name) {
      await notify("Not a LinkedIn profile URL ");
      return;
    }

    const name = extractedData.name.trim();
    const linkedin = normalizeLinkedInUrl(extractedData.url);

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
        const win = window as {
          isDekUnlocked?: () => boolean;
          encryptContactName?: (name: string) => Promise<string>;
        };

        // Check if DEK is unlocked (functions are always available)
        if (!win.isDekUnlocked?.()) {
          return {
            ok: false as const,
            error: "DEK_LOCKED",
            debug: "DEK is not unlocked",
          };
        }

        // Validate window globals exist
        if (!win.encryptContactName) {
          return {
            ok: false as const,
            error: "MISSING_GLOBALS",
            debug: "encryptContactName not available",
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
          const data: unknown = await res.json();
          return { ok: false as const, status: res.status, data };
        }

        const data: unknown = await res.json();

        // Basic runtime check for expected shape
        if (
          typeof data === "object" &&
          data !== null &&
          "mode" in data &&
          typeof data.mode === "string"
        ) {
          return { ok: true as const, data: data as { mode: string } };
        }

        return {
          ok: false as const,
          error: "INVALID_RESPONSE",
          debug: "API response missing expected fields",
        };
      },
    });

    // Validate and handle the injection result
    const parseSuccess = injectionSuccessSchema.safeParse(inj?.result);
    if (parseSuccess.success) {
      const mode = parseSuccess.data.data.mode;
      await notify(
        mode === "created"
          ? "Contact created"
          : mode === "updated"
            ? "Contact updated"
            : "Contact up to date",
      );
      return;
    }

    // If not success, try parsing as error
    const parseError = injectionErrorSchema.safeParse(inj?.result);
    if (parseError.success) {
      const result = parseError.data;

      // Handle specific error cases
      if (result.error === "DEK_LOCKED") {
        // Log debug info to console for troubleshooting
        console.log("DEK_LOCKED error:", result.debug);
        await notify(
          "Unlock Touch to save contacts - Click the Touch app tab and unlock your vault",
        );
        return;
      }

      const errorMessage =
        result.status === 401
          ? "Sign in to Touch"
          : result.error.includes("encrypt") || result.error.includes("DEK")
            ? "Failed to encrypt contact name"
            : result.error;

      await notify(errorMessage);
      return;
    }

    // If we get here, the result didn't match either schema
    throw new Error("Unexpected injection result format");
  };

  void run();
});

/**
 * Listen for messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const parsed = dekStateChangeMessageSchema.safeParse(message);

  if (parsed.success && sender.tab?.id) {
    const tabId = sender.tab.id;

    // Update cached state
    dekStateByTab.set(tabId, parsed.data.isUnlocked);
    // Update ALL tabs since DEK state affects all LinkedIn tabs
    void updateAllTabsIconState();
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});

/**
 * Update all tabs' icon state on startup
 */
void updateAllTabsIconState();

/**
 * Update icon state when tabs are updated
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const run = async () => {
    // Only check when navigation completes
    if (changeInfo.status !== "complete") return;

    const allowedOrigins = getAllowedOriginsFromManifest();
    if (!tab.url) return;

    const tabOrigin = new URL(tab.url).origin;
    const isTouchTab = allowedOrigins.includes(tabOrigin);

    if (isTouchTab) {
      // Clear cached state on navigation (new page load)
      dekStateByTab.delete(tabId);
      // Touch tabs are never LinkedIn, set gray immediately
      await setIconDisabled(tabId);
      // Update ALL other tabs since system state may have changed
      await updateAllTabsIconState();
      return;
    }

    // For non-Touch tabs, update just this tab's icon (handles LinkedIn navigation)
    void updateTabIconState(tabId, tab.url);
  };

  void run();
});

/**
 * Update icon state when tabs are removed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  dekStateByTab.delete(tabId);
  // Update all tabs in case the removed tab was the Touch tab
  void updateAllTabsIconState();
});

/**
 * Update icon state when user switches tabs
 */
chrome.tabs.onActivated.addListener(() => {
  // When switching tabs, the "best Touch tab" may have changed
  // Update all LinkedIn tabs to reflect the current best Touch tab's DEK state
  void updateAllTabsIconState();
});
