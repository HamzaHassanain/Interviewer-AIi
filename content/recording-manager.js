/**
 * Recording Manager Module
 * Handles audio recording functionality and processing pipeline
 *
 * Features:
 * - MediaRecorder setup and management
 * - Audio processing and transcription
 * - Enhanced AI interaction workflow
 * - State management throughout the recording lifecycle
 */

/**
 * Requests microphone permission from the user
 * @returns {Promise<boolean>} Whether permission was granted
 */
async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop()); // Stop immediately, we just wanted permission
    return true;
  } catch (error) {
    console.error("Microphone permission denied:", error);
    showError(
      "Microphone access is required for voice recording. Please allow microphone access and try again."
    );
    throw new Error("Microphone permission required");
  }
}

/**
 * Starts audio recording with enhanced audio settings
 * @returns {Promise<void>}
 */
async function startRecording() {
  try {
    // Update UI state immediately
    updateButtonState(RecordingState.RECORDING);
    currentState = RecordingState.RECORDING;

    // Get high-quality audio stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1,
      },
    });

    // Create MediaRecorder with optimal settings
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      audioBitsPerSecond: 16000,
    });

    // Reset audio chunks for new recording
    audioChunks = [];

    // Handle data available events
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    // Handle recording completion
    mediaRecorder.onstop = async () => {
      // Clean up media stream
      stream.getTracks().forEach((track) => track.stop());

      // Process the recorded audio
      await processRecordedAudio();
    };

    // Handle errors during recording
    mediaRecorder.onerror = (event) => {
      console.error("MediaRecorder error:", event.error);
      showError("Recording error: " + event.error.message);
      resetToReadyState();
    };

    // Start recording with data collection interval
    mediaRecorder.start(1000); // Collect data every 1 second
  } catch (error) {
    console.error("Failed to start recording:", error);
    showError("Failed to start recording: " + error.message);
    resetToReadyState();
  }
}

/**
 * Stops audio recording and begins processing
 * @returns {Promise<void>}
 */
async function stopRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      // Update state to processing immediately
      updateButtonState(RecordingState.PROCESSING);
      currentState = RecordingState.PROCESSING;

      // Stop the recording
      mediaRecorder.stop();
    } else {
      console.warn("No active recording to stop");
    }
  } catch (error) {
    console.error("Failed to stop recording:", error);
    showError("Failed to stop recording: " + error.message);
    resetToReadyState();
  }
}

/**
 * Enhanced audio processing pipeline with complete AI interaction
 * This function maintains the PROCESSING state throughout the entire AI interaction
 * @returns {Promise<void>}
 */
async function processRecordedAudio() {
  try {
    // Validate recorded audio
    if (audioChunks.length === 0) {
      throw new Error("No audio data recorded");
    }

    // Create audio blob from chunks
    const audioBlob = new Blob(audioChunks, {
      type: mediaRecorder ? mediaRecorder.mimeType : "audio/webm;codecs=opus",
    });

    if (audioBlob.size === 0) {
      throw new Error("Recorded audio is empty");
    }

    // Convert to base64 for transmission
    const audioBase64 = await blobToBase64(audioBlob);

    // Send to background script for AI transcription
    const transcriptionResponse = await chrome.runtime.sendMessage({
      action: "speechToText",
      audioBlob: audioBase64,
      mimeType: audioBlob.type,
    });

    if (!transcriptionResponse.success) {
      throw new Error(transcriptionResponse.error);
    }

    const userText = transcriptionResponse.text.trim();

    await handleUserInteraction(userText);
  } catch (error) {
    console.error("Failed to process recorded audio:", error);
    showError("Failed to process recording: " + error.message);
  } finally {
    // Reset state and cleanup
    resetToReadyState();
  }
}

/**
 * Resets the recording system to ready state
 */
function resetToReadyState() {
  // Update UI state
  updateButtonState(RecordingState.READY);
  currentState = RecordingState.READY;

  // Clean up recording data
  audioChunks = [];

  // Clean up media recorder
  if (mediaRecorder) {
    if (mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch (error) {
        console.warn("Error stopping media recorder:", error);
      }
    }
    mediaRecorder = null;
  }
}

/**
 * Gets the current recording state
 * @returns {RecordingState} Current state
 */
function getCurrentState() {
  return currentState;
}

/**
 * Checks if recording is currently active
 * @returns {boolean} Whether recording is active
 */
function isRecording() {
  return currentState === RecordingState.RECORDING;
}

/**
 * Checks if processing is currently active
 * @returns {boolean} Whether processing is active
 */
function isProcessing() {
  return (
    currentState === RecordingState.PROCESSING ||
    currentState === RecordingState.AI_SPEAKING
  );
}
