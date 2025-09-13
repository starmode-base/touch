console.log("Background service worker initialized!");

const linkedinPattern = /^https:\/\/www\.linkedin\.com\/in\/[a-z0-9-]+\/$/;

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
      iconUrl: "icon-128.png",
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
  const hostPermissions = chrome.runtime.getManifest()
    .host_permissions as string[];

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

chrome.action.onClicked.addListener((tab) => {
  const run = async () => {
    try {
      if (typeof tab.id !== "number") throw new Error("No active tab");

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
        await notify("Open the Touch app to sync contacts");
        return;
      }

      // 3) Post directly via the Touch tab so auth cookies apply
      const [inj] = await chrome.scripting.executeScript({
        target: { tabId: touchTabId },
        args: [{ name, linkedin }],
        func: async (payload) => {
          const extractWorkspaceIdFromPath = (pathname: string) => {
            const [candidate] = pathname.split("/").filter(Boolean);

            if (!candidate) return null;

            if (!/^[0-9A-Za-z]{20}$/.test(candidate)) return null;

            return candidate;
          };

          const workspaceId = extractWorkspaceIdFromPath(
            window.location.pathname,
          );

          if (!workspaceId) {
            return { ok: false as const, error: "No workspace selected" };
          }

          try {
            const url = new URL("/api/chrome", window.location.origin);
            const res = await fetch(url.toString(), {
              method: "POST",
              headers: { "content-type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                workspaceId,
                name: payload.name,
                linkedin: payload.linkedin,
              }),
            });

            type UpsertContactSFReturnType =
              | {
                  mode: "created";
                  contactId: string;
                }
              | {
                  mode: "updated";
                  contactId: string;
                }
              | {
                  mode: "noop";
                  contactId?: undefined;
                };

            if (!res.ok) {
              const data = (await res.json()) as UpsertContactSFReturnType;
              return { ok: false as const, status: res.status, data };
            }

            const data = (await res.json()) as UpsertContactSFReturnType;

            return { ok: true as const, data };
          } catch (e) {
            if (e instanceof Error) {
              return { ok: false as const, error: e.message };
            }

            throw e;
          }
        },
      });

      const result = inj?.result;

      if (result?.ok) {
        await notify(
          result.data.mode === "created"
            ? "Contact created"
            : result.data.mode === "updated"
              ? "Contact updated"
              : "Contact up to date",
        );
        return;
      }

      await notify(
        result?.error ??
          (result?.status === 401
            ? "Sign in to Touch"
            : "Failed to save contact"),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await notify(message);
    }
  };

  void run();
});
