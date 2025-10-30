/* eslint-disable */
/**
 * Content script that listens for DEK state changes from the Touch app
 * and forwards them to the background script
 */

// Listen for messages from the Touch app (page context)
window.addEventListener("message", (event) => {
  // Only accept messages from the same origin
  if (event.origin !== window.location.origin) return;

  // Only handle DEK state change messages
  if (
    event.data &&
    typeof event.data === "object" &&
    event.data.type === "TOUCH_DEK_STATE_CHANGE"
  ) {
    // Forward to background script
    // chrome.runtime automatically includes sender.tab.id in the message
    chrome.runtime
      .sendMessage({
        type: "DEK_STATE_CHANGE",
        isUnlocked: event.data.isUnlocked,
      })
      .catch((error) => {
        // Ignore errors (extension might not be installed or background script not ready)
        console.log("[Touch Extension] Failed to send message:", error);
      });
  }
});
