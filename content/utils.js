// Recording states
const RecordingState = {
  READY: "ready",
  RECORDING: "recording",
  PROCESSING: "processing",
  AI_SPEAKING: "ai_speaking",
};

// Global variables for recording
let mediaRecorder = null;
let recordingButton = null;
let audioChunks = [];
let currentState = RecordingState.READY;

/**
 * Plays an audio blob with proper error handling and user feedback
 * @param {Blob} audioBlob - Audio blob to play
 * @returns {Promise<void>} Promise that resolves when audio starts playing
 * @throws {Error} When audio blob is invalid or playback fails
 */
function playAudioBlob(audioBlob, onEndedCallback = null) {
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
    throw new Error(errorMsg);
  });

  audio.addEventListener("ended", () => {
    // Clean up object URL to free memory
    URL.revokeObjectURL(audioUrl);
    if (onEndedCallback && typeof onEndedCallback === "function") {
      onEndedCallback();
    }
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

/**
 * Converts a Blob to base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(",")[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Storage utility functions
 */
function getFromStorage(key) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(result[key]);
      });
    } catch (error) {
      reject(new Error("Failed to access chrome.storage: " + error.message));
    }
  });
}

function setInStorage(key, value) {
  return new Promise((resolve, reject) => {
    try {
      const item = {};
      item[key] = value;
      chrome.storage.sync.set(item, () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      });
    } catch (error) {
      reject(new Error("Failed to access chrome.storage: " + error.message));
    }
  });
}
