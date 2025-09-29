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
 * Converts base64 string to ArrayBuffer for audio processing
 * @param {string} base64 - Base64 encoded audio data
 * @returns {ArrayBuffer} Binary audio data as ArrayBuffer
 * @throws {Error} When base64 string is invalid
 */
export function base64ToBufferArray(base64) {
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Base64 parameter must be a non-empty string");
  }

  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  } catch (error) {
    throw new Error("Failed to decode base64 data: " + error.message);
  }
}

/**
 * Creates a WAV file header for audio data
 * @param {number} sampleRate - Audio sample rate (e.g., 44100, 24000)
 * @param {number} numChannels - Number of audio channels (1 for mono, 2 for stereo)
 * @param {number} bitsPerSample - Bits per sample (typically 16)
 * @param {number} dataLength - Length of PCM data in bytes
 * @returns {ArrayBuffer} WAV header as ArrayBuffer
 * @throws {Error} When parameters are invalid
 */
export function createWAVheader(
  sampleRate,
  numChannels,
  bitsPerSample,
  dataLength
) {
  // Validate parameters
  if (!sampleRate || sampleRate <= 0) {
    throw new Error("Sample rate must be a positive number");
  }
  if (!numChannels || numChannels < 1 || numChannels > 2) {
    throw new Error("Number of channels must be 1 (mono) or 2 (stereo)");
  }
  if (bitsPerSample !== 16 && bitsPerSample !== 8) {
    throw new Error("Bits per sample must be 8 or 16");
  }
  if (dataLength < 0) {
    throw new Error("Data length must be non-negative");
  }

  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const buffer = new ArrayBuffer(44); // Standard WAV header is 44 bytes
  const view = new DataView(buffer);

  /**
   * Helper function to write string data to DataView
   * @param {DataView} view - DataView to write to
   * @param {number} offset - Byte offset to start writing
   * @param {string} text - String to write
   */
  function writeString(view, offset, text) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  // WAV file format specification
  writeString(view, 0, "RIFF"); // ChunkID
  view.setUint32(4, 36 + dataLength, true); // ChunkSize (little-endian)
  writeString(view, 8, "WAVE"); // Format
  writeString(view, 12, "fmt "); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (PCM = 16)
  view.setUint16(20, 1, true); // AudioFormat (PCM = 1)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample
  writeString(view, 36, "data"); // Subchunk2ID
  view.setUint32(40, dataLength, true); // Subchunk2Size

  return buffer;
}

/**
 * Creates a WAV Blob from PCM audio data
 * @param {ArrayBuffer} pcmData - Raw PCM audio data
 * @param {number} sampleRate - Audio sample rate (default: 24000)
 * @param {number} numChannels - Number of channels (default: 1 for mono)
 * @param {number} bitsPerSample - Bits per sample (default: 16)
 * @returns {Blob} WAV audio file as Blob
 * @throws {Error} When audio data is invalid or processing fails
 */
export function createWAVBlob(
  pcmData,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
) {
  if (!pcmData || !(pcmData instanceof ArrayBuffer)) {
    throw new Error("PCM data must be a valid ArrayBuffer");
  }

  if (pcmData.byteLength === 0) {
    throw new Error("PCM data cannot be empty");
  }

  try {
    // Create WAV header
    const wavHeader = createWAVheader(
      sampleRate,
      numChannels,
      bitsPerSample,
      pcmData.byteLength
    );

    // Combine header and audio data
    const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
    wavBuffer.set(new Uint8Array(wavHeader), 0);
    wavBuffer.set(new Uint8Array(pcmData), wavHeader.byteLength);

    return new Blob([wavBuffer], { type: "audio/wav" });
  } catch (error) {
    throw new Error("Failed to create WAV blob: " + error.message);
  }
}

/**
 * Creates an audio Blob from base64 encoded audio data
 * Converts the base64 data to PCM format and wraps it in a WAV container
 * @param {string} base64 - Base64 encoded audio data from AI API
 * @param {string} mimeType - MIME type hint (used for logging, actual format determined by AI)
 * @returns {Blob} WAV audio file ready for playback
 * @throws {Error} When base64 data is invalid or conversion fails
 */
export function createAudioElementFromBase64(base64, mimeType = "audio/wav") {
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Base64 audio data is required");
  }

  try {
    // Convert base64 to ArrayBuffer (PCM data)
    const audioData = base64ToBufferArray(base64);

    // Create WAV blob with standard settings for AI-generated audio
    // Google's TTS typically outputs at 24kHz, mono, 16-bit
    const audioBlob = createWAVBlob(audioData, 24000, 1, 16);

    return audioBlob;
  } catch (error) {
    throw new Error("Failed to create audio from base64: " + error.message);
  }
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
