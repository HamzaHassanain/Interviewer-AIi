/**
 * AI Interviewer Extension - Content Script
 * Handles text-to-speech functionality on supported web pages
 */

/**
 * Main function that initializes the content script and demonstrates TTS functionality
 * Tests the text-to-speech feature with a sample message
 */
// async function main() {
//   try {
//     const response = await chrome.runtime.sendMessage({
//       action: "textToSpeech",
//       text: "Hello, this is a test of the text to speech functionality.",
//     });

//     // Comprehensive error handling for different response types
//     if (!response) {
//       throw new Error("No response received from background script");
//     }

//     if (response.status === "Error") {
//       console.error("Background script error:", response.error);
//       return;
//     }

//     if (response.status !== "success") {
//       throw new Error("Unexpected response status: " + response.status);
//     }

//     if (!response.audioData) {
//       throw new Error("No audio data received in response");
//     }

//     // Convert base64 audio data back to blob for playback
//     const audioBlob = base64ToBlob(
//       response.audioData,
//       response.mimeType || "audio/wav"
//     );

//     // Create audio element and set up playback
//     playAudioBlob(audioBlob);
//   } catch (error) {
//     console.error("Content script error:", error);

//     // Report error to background script for logging
//     try {
//       chrome.runtime.sendMessage({
//         action: "logError",
//         error: error.message,
//         context: "content script main function",
//       });
//     } catch (reportError) {
//       console.error("Failed to report error to background:", reportError);
//     }
//   }
// }

initializeContentScript();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "interviewStart":
      startInterview();
      break;
    case "interviewStop":
      stopInterview();
      break;
  }
});

async function initializeContentScript() {
  const isInterviewActive =
    (await getFromStorage("isInterviewActive")) || false;
  if (isInterviewActive) {
    startInterview();
  }
}

function startInterview() {}
function stopInterview() {}
