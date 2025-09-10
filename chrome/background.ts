console.log("Background service worker initialized!");

chrome.action.onClicked.addListener((tab) => {
  const DEFAULTS = {
    baseUrl: "http://localhost:3012/",
    workspaceId: "GjzejeIz75q6ikorjIDx",
  };

  const run = async () => {
    try {
      if (!tab || typeof tab.id !== "number") throw new Error("No active tab");

      const settings = await chrome.storage.sync.get(DEFAULTS);
      const baseUrl = String(settings.baseUrl ?? "").trim();
      const workspaceId = String(settings.workspaceId ?? "").trim();

      if (!baseUrl || !workspaceId) {
        await chrome.runtime.openOptionsPage();
        return;
      }

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
      const target = new URL("/chrome/", baseUrl);
      target.searchParams.set("workspaceId", workspaceId);
      target.searchParams.set("name", name);
      target.searchParams.set("linkedin", linkedin);

      await chrome.tabs.create({ url: target.toString(), active: false });
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
