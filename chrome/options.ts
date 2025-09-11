const DEFAULTS = {
  origins: ["http://localhost:3012", "https://touch.starmode.dev"],
};

(async function init() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  const originsInput = document.getElementById(
    "origins",
  ) as HTMLTextAreaElement | null;
  if (originsInput)
    originsInput.value = Array.isArray(settings.origins)
      ? settings.origins.join("\n")
      : "";
})();

const saveBtn = document.getElementById("save");

if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const origins = (
      (document.getElementById("origins") as HTMLTextAreaElement | null)
        ?.value || ""
    )
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await chrome.storage.sync.set({ origins });
    alert("Saved");
  });
}
