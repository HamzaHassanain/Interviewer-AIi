/**
 * Utility functions for AI Interviewer Extension
 * Contains audio processing, format conversion, and API helper functions
 */

/**
 * Converts a Blob to base64 string for cross-context messaging
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} Base64 encoded string (without data URL prefix)
 * @throws {Error} When blob is invalid or conversion fails
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    if (!blob || !(blob instanceof Blob)) {
      reject(new Error("Invalid blob parameter"));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        // Extract base64 data after the comma (removing data URL prefix)
        const base64data = reader.result.split(",")[1];
        if (!base64data) {
          reject(new Error("Failed to extract base64 data from blob"));
          return;
        }
        resolve(base64data);
      } catch (error) {
        reject(new Error("Failed to process blob data: " + error.message));
      }
    };
    reader.onerror = () => {
      reject(
        new Error(
          "FileReader error: " + reader.error?.message || "Unknown error"
        )
      );
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Provides more specific error messages based on error type for AI API calls
 * @param {Error} error - The original error
 * @param {string} operation - The operation that failed (e.g., "Text-to-speech", "Speech-to-text")
 * @returns {Error} Enhanced error with more specific message
 */
export function enhanceApiError(error, operation) {
  if (error.message.includes("API key")) {
    return new Error("Invalid API key or authentication failed");
  } else if (error.message.includes("quota")) {
    return new Error("API quota exceeded. Please try again later");
  } else if (
    error.message.includes("network") ||
    error.name === "NetworkError"
  ) {
    return new Error(
      "Network error. Please check your connection and try again"
    );
  } else if (
    error.message.includes("audio") &&
    operation === "Speech-to-text"
  ) {
    return new Error("Invalid or corrupted audio data");
  } else {
    return new Error(`${operation} failed: ${error.message}`);
  }
}
