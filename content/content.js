/**
 * AI Interviewer Extension - Content Script
 * Main coordinator for interview functionality with voice recording and transcription
 *
 * Features:
 * - Interview session management
 * - Chrome extension messaging coordination
 * - Module integration and initialization
 */

// Initialize the content script when DOM is ready
initializeContentScript();

// Handle messages from popup and background scripts
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  switch (request.action) {
    case "interviewStart":
      startInterview(true);
      sendResponse({ success: true });
      break;
    case "interviewStop":
      stopInterview();
      sendResponse({ success: true });
      break;
    default:
      sendResponse({ success: false, error: "Unknown action" });
  }
});

/**
 * Initializes the content script and restores interview state if needed
 * @returns {Promise<void>}
 */
async function initializeContentScript() {
  try {
    // Check if interview was previously active
    const isInterviewActive =
      (await getFromStorage("isInterviewActive")) || false;

    if (isInterviewActive) {
      await startInterview();
    }
  } catch (error) {
    console.error("Failed to initialize content script:", error);
    showError("Failed to initialize AI Interviewer: " + error.message);
  }
}

