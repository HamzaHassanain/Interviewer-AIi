/**
 * Creates the floating recording button interface
 */
function createRecordingButton() {
  // Remove existing button if it exists
  removeRecordingButton();

  // Create button container
  const buttonContainer = document.createElement("div");
  buttonContainer.id = "ai-interviewer-recorder";
  buttonContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: white;
    border-radius: 50px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 8px;
    border: 2px solid #e0e0e0;
    transition: all 0.3s ease;
  `;

  // Create the actual button
  recordingButton = document.createElement("button");
  recordingButton.id = "ai-interviewer-record-btn";
  recordingButton.style.cssText = `
    background: #4CAF50;
    border: none;
    border-radius: 50px;
    color: white;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  `;

  // Set initial state
  updateButtonState(RecordingState.READY);

  // Add click event listener
  recordingButton.addEventListener("click", handleRecordingClick);

  // Append to container and page
  buttonContainer.appendChild(recordingButton);
  document.body.appendChild(buttonContainer);
}

/**
 * Removes the recording button from the page
 */
function removeRecordingButton() {
  const existingButton = document.getElementById("ai-interviewer-recorder");
  if (existingButton) {
    existingButton.remove();
  }
  recordingButton = null;
}

/**
 * Updates the button appearance based on current state
 */
function updateButtonState(state) {
  if (!recordingButton) return;

  currentState = state;

  switch (state) {
    case RecordingState.READY:
      recordingButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4V12C14 13.1 13.1 14 12 14S10 13.1 10 12V4C10 2.9 10.9 2 12 2M19 10V12C19 15.3 16.3 18 13 18V20H11V18C7.7 18 5 15.3 5 12V10H7V12C7 14.2 8.8 16 11 16H13C15.2 16 17 14.2 17 12V10H19Z"/>
        </svg>
        Ready to Record
      `;
      recordingButton.style.background = "#4CAF50";
      recordingButton.style.cursor = "pointer";
      recordingButton.disabled = false;
      break;

    case RecordingState.RECORDING:
      recordingButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="#ff4444"/>
          <circle cx="12" cy="12" r="6" fill="white"/>
        </svg>
        Recording...
      `;
      recordingButton.style.background = "#f44336";
      recordingButton.style.cursor = "pointer";
      recordingButton.disabled = false;
      break;

    case RecordingState.PROCESSING:
      recordingButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="animate-spin">
          <path d="M12,4V2C17.5,2.5 22,6.5 22,12C22,17.5 17.5,21.5 12,22V20C16.4,19.5 20,16.1 20,12C20,7.9 16.4,4.5 12,4Z"/>
        </svg>
        Processing...
      `;
      recordingButton.style.background = "#FF9800";
      recordingButton.style.cursor = "not-allowed";
      recordingButton.disabled = true;
      break;
  }

  // Add spinning animation for processing state
  if (state === RecordingState.PROCESSING) {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .animate-spin {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Handles recording button clicks
 */
async function handleRecordingClick() {
  if (currentState === RecordingState.PROCESSING) {
    return; // Ignore clicks when processing
  }

  if (currentState === RecordingState.READY) {
    await startRecording();
  } else if (currentState === RecordingState.RECORDING) {
    await stopRecording();
  }
}

/**
 * Requests microphone permission from the user
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
 * Starts audio recording
 */
async function startRecording() {
  try {
    updateButtonState(RecordingState.RECORDING);

    // Get audio stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    });

    // Create MediaRecorder
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    audioChunks = [];

    // Handle data available
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    // Handle recording stop
    mediaRecorder.onstop = async () => {
      // Stop all tracks to release microphone
      stream.getTracks().forEach((track) => track.stop());

      // Process the recorded audio
      await processRecordedAudio();
    };

    // Start recording
    mediaRecorder.start(1000); // Collect data every 1 second
  } catch (error) {
    console.error("Failed to start recording:", error);
    updateButtonState(RecordingState.READY);
    showError("Failed to start recording: " + error.message);
  }
}

/**
 * Stops audio recording
 */
async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    updateButtonState(RecordingState.PROCESSING);
    mediaRecorder.stop();
    // manually stop all the tracks to release the microphone
  }
}

/**
 * Displays the transcribed text to the user
 */
function showTranscribedText(text) {
  // Create a temporary notification showing the transcribed text
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    max-width: 300px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    color: #333;
  `;

  notification.innerHTML = `
    <div style="font-weight: bold; color: #2196F3; margin-bottom: 8px;">
      🎯 Transcribed Text:
    </div>
    <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
      ${text}
    </div>
    <button onclick="this.parentElement.remove()" style="
      background: #2196F3; 
      color: white; 
      border: none; 
      padding: 6px 12px; 
      border-radius: 4px; 
      font-size: 12px; 
      cursor: pointer;
    ">
      Dismiss
    </button>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

/**
 * Shows an error message to the user
 */
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    max-width: 300px;
    background: #ffebee;
    border: 1px solid #f44336;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #c62828;
  `;

  errorDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Error:</div>
    <div>${message}</div>
    <button onclick="this.parentElement.remove()" style="
      background: #f44336; 
      color: white; 
      border: none; 
      padding: 6px 12px; 
      border-radius: 4px; 
      font-size: 12px; 
      cursor: pointer; 
      margin-top: 8px;
    ">
      Dismiss
    </button>
  `;

  document.body.appendChild(errorDiv);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 8000);
}

/**
 * Processes the recorded audio and sends it to AI for transcription
 */
async function processRecordedAudio() {
  try {
    if (audioChunks.length === 0) {
      throw new Error("No audio data recorded");
    }

    // Create audio blob from chunks
    const audioBlob = new Blob(audioChunks, { type: "audio/webm;codecs=opus" });

    if (audioBlob.size === 0) {
      throw new Error("Recorded audio is empty");
    }

    // Convert to base64 for transmission
    const audioBase64 = await blobToBase64(audioBlob);

    // Send to background script for AI processing
    const response = await chrome.runtime.sendMessage({
      action: "speechToText",
      audioBlob: audioBase64,
      mimeType: audioBlob.type,
    });

    // Handle response
    if (!response) {
      throw new Error("No response received from background script");
    }

    if (response.status === "Error") {
      throw new Error(response.error);
    }

    if (response.status !== "success" || !response.text) {
      throw new Error("Invalid response from AI service");
    }

    // Show the transcribed text
    showTranscribedText(response.text);
  } catch (error) {
    console.error("Failed to process recorded audio:", error);
    showError("Failed to process recording: " + error.message);
  } finally {
    // Reset to ready state
    updateButtonState(RecordingState.READY);
    audioChunks = [];
  }
}
