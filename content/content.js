/**
 * AI Interviewer Extension - Content Script
 * Handles interview functionality with voice recording and transcription
 */


initializeContentScript();

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
  }
});

async function initializeContentScript() {
  try {
    const isInterviewActive =
      (await getFromStorage("isInterviewActive")) || false;
    if (isInterviewActive) {
      startInterview();
    }
  } catch (error) {
    console.error("Failed to initialize content script:", error);
  }
}

/**
 * Starts the interview session by creating the recording interface
 */
async function startInterview() {
  try {
    // Store interview state
    await setInStorage("isInterviewActive", true);

    // Create the recording button UI
    createRecordingButton();

    // Request microphone permissions
    await requestMicrophonePermission();
  } catch (error) {
    console.error("Failed to start interview:", error);
    showError("Failed to start interview: " + error.message);
  }
}

/**
 * Stops the interview session and cleans up
 */
async function stopInterview() {
  try {
    // Store interview state
    await setInStorage("isInterviewActive", false);

    // Stop any ongoing recording
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }

    // Remove the recording button
    removeRecordingButton();
  } catch (error) {
    console.error("Failed to stop interview:", error);
  }
}


