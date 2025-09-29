/**
 * AI Interviewer Extension - Content Script
 * Main coordinator for interview functionality with voice recording and transcription
 *
 * Features:
 * - Interview session management
 * - Chrome extension messaging coordination
 * - Module integration and initialization
 */

// // Import all necessary modules
// import { getFromStorage, setInStorage } from "./utils.js";
// import {
//   createRecordingButton,
//   removeRecordingButton,
//   showError,
//   showSuccess,
// } from "./ui-controller.js";
// import { requestMicrophonePermission } from "./recording-manager.js";
// import { clearConversationHistory } from "./interviewer.js";

// Initialize the content script when DOM is ready
initializeContentScript();

// Handle messages from popup and background scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "interviewStart":
      startInterview();
      sendResponse({ status: "success" });
      break;
    case "interviewStop":
      stopInterview();
      sendResponse({ status: "success" });
      break;
    default:
      sendResponse({ status: "error", error: "Unknown action" });
  }
});

/**
 * Initializes the content script and restores interview state if needed
 * @returns {Promise<void>}
 */
async function initializeContentScript() {
  try {
    console.log("Initializing AI Interviewer content script...");

    // Check if interview was previously active
    const isInterviewActive =
      (await getFromStorage("isInterviewActive")) || false;

    if (isInterviewActive) {
      console.log("Restoring active interview session");
      await startInterview();
    } else {
      console.log("No active interview session to restore");
    }
  } catch (error) {
    console.error("Failed to initialize content script:", error);
    showError("Failed to initialize AI Interviewer: " + error.message);
  }
}

/**
 * Starts the interview session by creating the recording interface
 * @returns {Promise<void>}
 */
async function startInterview() {
  try {
    console.log("Starting interview session...");

    // Store interview state
    await setInStorage("isInterviewActive", true);

    // Clear any previous conversation history for fresh start
    await clearConversationHistory();

    // Create the recording button UI
    createRecordingButton();

    // Request microphone permissions
    await requestMicrophonePermission();

    showSuccess(
      "AI Interviewer is ready! Click the recording button to start."
    );
    console.log("Interview session started successfully");
  } catch (error) {
    console.error("Failed to start interview:", error);
    showError("Failed to start interview: " + error.message);

    // Clean up on error
    await setInStorage("isInterviewActive", false);
  }
}

/**
 * Stops the interview session and cleans up all resources
 * @returns {Promise<void>}
 */
async function stopInterview() {
  try {
    console.log("Stopping interview session...");

    // Store interview state
    await setInStorage("isInterviewActive", false);

    // Stop any ongoing recording (this will be handled by recording-manager.js)
    // The recording manager will detect the state change and clean up appropriately

    // Remove the recording button UI
    removeRecordingButton();

    showSuccess("Interview session ended.");
    console.log("Interview session stopped successfully");
  } catch (error) {
    console.error("Failed to stop interview:", error);
    showError("Failed to stop interview: " + error.message);
  }
}
