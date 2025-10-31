/**
 * Content script that listens for DEK state changes from the Touch app
 * and forwards them to the background script
 */

import { z } from "zod";

// Schema for messages from the Touch app
const touchMessageSchema = z.object({
  type: z.literal("TOUCH_DEK_STATE_CHANGE"),
  isUnlocked: z.boolean(),
});

// Listen for messages from the Touch app (page context)
window.addEventListener("message", (event) => {
  // Only accept messages from the same origin
  if (event.origin !== window.location.origin) return;

  // Validate the message data
  const parsed = touchMessageSchema.parse(event.data);

  // Forward to background script
  // chrome.runtime automatically includes sender.tab.id in the message
  void chrome.runtime.sendMessage({
    type: "DEK_STATE_CHANGE",
    isUnlocked: parsed.isUnlocked,
  });
});
