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

function createAndPlayWAVBuffer(pcmData, onErrorCallback, onEndedCallback) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataLen = pcmData.byteLength;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  // Write WAV header
  /* It’s best to use a WAV header generator, but here's a quick manual setup */

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + dataLen, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitsPerSample, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, dataLen, true);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Combine the header and PCM data into a single Blob
  const wavBlob = new Blob([header, pcmData], { type: "audio/wav" });

  // Create an object URL from the Blob
  const audioUrl = URL.createObjectURL(wavBlob);

  // Create an audio element and play it
  const audio = new Audio(audioUrl);
  audio
    .play()
    .then(() => {})
    .catch((error) => {
      onErrorCallback && onErrorCallback(error);
    });

  audio.addEventListener("ended", () => {
    // Playback ended
    onEndedCallback && onEndedCallback();
    onEndedCallback();
  });
}

/**
 * Storage utility functions
 */
function getFromStorage(key) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get([key], (result) => {
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
      chrome.storage.local.set(item, () => {
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
