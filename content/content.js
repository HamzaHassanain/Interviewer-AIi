/**
 * AI Interviewer Extension - Content Script
 * Handles text-to-speech functionality on supported web pages
 */

/**
 * Main function that initializes the content script and demonstrates TTS functionality
 * Tests the text-to-speech feature with a sample message
 */
async function main() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "textToSpeech",
      text: "Hello, this is a test of the text to speech functionality.",
    });

    // Comprehensive error handling for different response types
    if (!response) {
      throw new Error("No response received from background script");
    }

    if (response.status === "Error") {
      console.error("Background script error:", response.error);
      return;
    }

    if (response.status !== "success") {
      throw new Error("Unexpected response status: " + response.status);
    }

    if (!response.audioData) {
      throw new Error("No audio data received in response");
    }

    // Convert base64 audio data back to blob for playback
    const audioBlob = base64ToBlob(
      response.audioData,
      response.mimeType || "audio/wav"
    );

    // Create audio element and set up playback
    playAudioBlob(audioBlob);
  } catch (error) {
    console.error("Content script error:", error);

    // Report error to background script for logging
    try {
      chrome.runtime.sendMessage({
        action: "logError",
        error: error.message,
        context: "content script main function",
      });
    } catch (reportError) {
      console.error("Failed to report error to background:", reportError);
    }
  }
}

/**
 * Plays an audio blob with proper error handling and user feedback
 * @param {Blob} audioBlob - Audio blob to play
 * @returns {Promise<void>} Promise that resolves when audio starts playing
 * @throws {Error} When audio blob is invalid or playback fails
 */
function playAudioBlob(audioBlob) {
  if (!audioBlob || !(audioBlob instanceof Blob)) {
    throw new Error("Invalid audio blob provided");
  }

  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  // Set up event listeners for audio playback
  audio.addEventListener("loadeddata", () => {
    audio.play();
  });

  audio.addEventListener("error", (e) => {
    console.error("Audio loading/playback error:", e);
    const errorMsg = audio.error
      ? `Audio error (code ${audio.error.code}): ${getAudioErrorMessage(
          audio.error.code
        )}`
      : "Unknown audio error";
    reject(new Error(errorMsg));
  });

  audio.addEventListener("ended", () => {
    // Clean up object URL to free memory
    URL.revokeObjectURL(audioUrl);
  });
}

/**
 * Helper function to convert base64 string to Blob
 * @param {string} base64 - Base64 encoded data (without data URL prefix)
 * @param {string} mimeType - MIME type for the blob (e.g., "audio/wav")
 * @returns {Blob} Blob object created from base64 data
 * @throws {Error} When base64 data is invalid or conversion fails
 */
function base64ToBlob(base64, mimeType) {
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Base64 data must be a non-empty string");
  }

  if (!mimeType || typeof mimeType !== "string") {
    throw new Error("MIME type must be specified");
  }

  try {
    // Decode base64 to binary string
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    // Convert binary string to byte array
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    return blob;
  } catch (error) {
    throw new Error("Failed to convert base64 to blob: " + error.message);
  }
}

/**
 * Gets a human-readable error message for HTML5 audio error codes
 * @param {number} errorCode - Audio error code
 * @returns {string} Human-readable error message
 */
function getAudioErrorMessage(errorCode) {
  const errorMessages = {
    1: "MEDIA_ERR_ABORTED - Audio playback was aborted",
    2: "MEDIA_ERR_NETWORK - Network error while loading audio",
    3: "MEDIA_ERR_DECODE - Audio decoding failed",
    4: "MEDIA_ERR_SRC_NOT_SUPPORTED - Audio format not supported",
  };

  return errorMessages[errorCode] || `Unknown error code: ${errorCode}`;
}

/**
 * Shows a user notification (can be extended to show actual UI notifications)
 * @param {string} message - Message to show
 * @param {string} type - Notification type: "success", "error", "info"
 */
function showUserNotification(message, type = "info") {
  // Future enhancement: Show actual browser notification or inject UI element
}

// Initialize the content script
main();
