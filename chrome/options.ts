const DEFAULTS = {
  baseUrl: "http://localhost:3012/",
  workspaceId: "GjzejeIz75q6ikorjIDx",
};

(async function init() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  const baseUrlInput = document.getElementById(
    "baseUrl",
  ) as HTMLInputElement | null;
  const workspaceIdInput = document.getElementById(
    "workspaceId",
  ) as HTMLInputElement | null;
  if (baseUrlInput) baseUrlInput.value = String(settings.baseUrl || "");
  if (workspaceIdInput)
    workspaceIdInput.value = String(settings.workspaceId || "");
})();

const saveBtn = document.getElementById("save");

if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const baseUrl =
      (
        document.getElementById("baseUrl") as HTMLInputElement | null
      )?.value.trim() || "";
    const workspaceId =
      (
        document.getElementById("workspaceId") as HTMLInputElement | null
      )?.value.trim() || "";
    await chrome.storage.sync.set({ baseUrl, workspaceId });
    alert("Saved");
  });
}
