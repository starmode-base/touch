console.log("Background service worker initialized!");

interface Settings {
  origins: string[];
}

const SETTINGS_DEFAULTS: Settings = {
  origins: ["http://localhost:3012", "https://touch.starmode.dev"],
};

chrome.action.onClicked.addListener((tab) => {
  const run = async () => {
    try {
      if (!tab || typeof tab.id !== "number") throw new Error("No active tab");

      const settings = await chrome.storage.sync.get(SETTINGS_DEFAULTS);

      // 1) Extract LinkedIn data from the current tab
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const getMeta = (name: string): string | null => {
            const byProp = document.querySelector<HTMLMetaElement>(
              `meta[property="${name}"]`,
            );
            if (byProp?.content) return byProp.content;
            const byName = document.querySelector<HTMLMetaElement>(
              `meta[name="${name}"]`,
            );
            return byName?.content ?? null;
          };

          const rawUrl = getMeta("og:url") ?? location.href;
          const rawTitle = getMeta("og:title") ?? document.title;
          const cleanTitle = rawTitle
            .replace(/\s*\|\s*LinkedIn(\s+Member)?\s*$/i, "")
            .trim();

          return { rawUrl, rawTitle: cleanTitle };
        },
      });

      const linkedin = normalizeLinkedInUrl(injection?.result?.rawUrl || "");
      if (!linkedin) {
        await notify("Not a LinkedIn profile URL");
        return;
      }
      const name = (injection?.result?.rawTitle || "").slice(0, 64);

      // 2) Locate the best Touch tab (active/recent)
      const touchTab = await findBestTouchTab(settings.origins);
      if (!touchTab) {
        await notify("Open Touch app to send contact");
        return;
      }

      // 3) Post directly via the Touch tab so auth cookies apply
      const [{ result } = {} as any] = await chrome.scripting.executeScript({
        target: { tabId: touchTab.id },
        func: async (payload) => {
          const extractWorkspaceIdFromPath = (pathname: string) => {
            const parts = pathname.split("/").filter(Boolean);
            const candidate = parts[0] || "";
            return /^[0-9A-Za-z]{20}$/.test(candidate) ? candidate : "";
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

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              return { ok: false as const, status: res.status, data };
            }

            const data = await res.json().catch(() => ({}));

            return { ok: true as const, data };
          } catch (e) {
            return { ok: false as const, error: (e as Error).message };
          }
        },
        args: [{ name, linkedin }],
      });

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

      await notify(
        result?.error ||
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

function normalizeLinkedInUrl(input: string) {
  try {
    const u = new URL(input);
    if (!/\.?(^|\.)linkedin\.com$/i.test(u.hostname)) return null;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0]?.toLowerCase() !== "in" || !parts[1]) return null;

    const slug = parts[1].toLowerCase();
    if (!/^[a-z0-9-]+$/i.test(slug)) return null;

    return `https://www.linkedin.com/in/${slug}/`;
  } catch {
    return null;
  }
}

async function notify(message: string) {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icon-128.png",
      title: "Touch",
      message,
    });
  } catch {
    // notifications permission not granted; ignore
  }
}

async function findBestTouchTab(origins: string[]) {
  const tabs = await chrome.tabs.query({});
  const normalizedOrigins = new Set(
    origins
      .map((o) => {
        try {
          const u = new URL(o);
          return `${u.protocol}//${u.host}`;
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );

  const candidates = [] as { tab: chrome.tabs.Tab; origin: string }[];
  for (const t of tabs) {
    const href = t.url || "";
    let u: URL | null = null;
    try {
      u = new URL(href);
    } catch {
      continue;
    }
    const origin = `${u.protocol}//${u.host}`;
    if (!normalizedOrigins.has(origin)) continue;
    candidates.push({ tab: t, origin });
  }

  if (candidates.length === 0) return null;

  // Prefer active; else most recently accessed
  candidates.sort((a, b) => {
    const aActive = a.tab.active ? 1 : 0;
    const bActive = b.tab.active ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const aAccess = a.tab.lastAccessed ?? 0;
    const bAccess = b.tab.lastAccessed ?? 0;
    return bAccess - aAccess;
  });

  const best = candidates[0];
  if (best?.tab.id == null) return null;
  return { id: best.tab.id, origin: best.origin } as const;
}
