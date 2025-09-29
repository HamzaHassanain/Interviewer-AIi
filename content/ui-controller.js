/**
 * UI Controller Module
 * Manages the recording button interface and user interactions
 *
 * Features:
 * - Floating recording button with state management
 * - Visual feedback for recording states
 * - Text display for transcriptions and AI responses
 * - Error handling and user notifications
 */

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
    top: 15px;
    right: 15px;
    z-index: 10000;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    padding: 2px;
    border: 1px solid #dee2e6;
    transition: all 0.3s ease;
  `;

  // Create the actual button
  recordingButton = document.createElement("button");
  recordingButton.id = "ai-interviewer-record-btn";
  recordingButton.style.cssText = `
    background: linear-gradient(135deg, #4285f4 0%, #7c4dff 100%);
    border: none;
    border-radius: 6px;
    color: white;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    position: relative;
    overflow: hidden;
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
 * @param {RecordingState} state - The new state to display
 */
function updateButtonState(state) {
  if (!recordingButton) return;

  currentState = state;

  switch (state) {
    case RecordingState.READY:
      recordingButton.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4V12C14 13.1 13.1 14 12 14S10 13.1 10 12V4C10 2.9 10.9 2 12 2M19 10V12C19 15.3 16.3 18 13 18V20H11V18C7.7 18 5 15.3 5 12V10H7V12C7 14.2 8.8 16 11 16H13C15.2 16 17 14.2 17 12V10H19Z"/>
        </svg>
        Record
      `;
      recordingButton.style.background =
        "linear-gradient(135deg, #34a853 0%, #4caf50 100%)";
      recordingButton.style.cursor = "pointer";
      recordingButton.style.transform = "translateY(0)";
      recordingButton.disabled = false;
      break;

    case RecordingState.RECORDING:
      recordingButton.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="#ff4444"/>
          <circle cx="12" cy="12" r="6" fill="white"/>
        </svg>
        Recording
      `;
      recordingButton.style.background =
        "linear-gradient(135deg, #ea4335 0%, #f44336 100%)";
      recordingButton.style.cursor = "pointer";
      recordingButton.style.transform = "translateY(0)";
      recordingButton.disabled = false;
      break;

    case RecordingState.PROCESSING:
      recordingButton.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="animate-spin">
          <path d="M12,4V2C17.5,2.5 22,6.5 22,12C22,17.5 17.5,21.5 12,22V20C16.4,19.5 20,16.1 20,12C20,7.9 16.4,4.5 12,4Z"/>
        </svg>
        Processing
      `;
      recordingButton.style.background =
        "linear-gradient(135deg, #fbbc04 0%, #ff9800 100%)";
      recordingButton.style.cursor = "not-allowed";
      recordingButton.style.transform = "none";
      recordingButton.disabled = true;
      break;

    case RecordingState.AI_SPEAKING:
      recordingButton.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="animate-pulse">
          <path d="M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.02C15.5,15.29 16.5,13.77 16.5,12M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18.01,19.86 21,16.28 21,12C21,7.72 18.01,4.14 14,3.23Z"/>
        </svg>
        AI Speaking
      `;
      recordingButton.style.background =
        "linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)";
      recordingButton.style.cursor = "not-allowed";
      recordingButton.style.transform = "none";
      recordingButton.disabled = true;
      break;
  }

  // Add animations for processing and AI speaking states
  if (
    state === RecordingState.PROCESSING ||
    state === RecordingState.AI_SPEAKING
  ) {
    ensureThemeStyles();
  }
}

/**
 * Handles recording button clicks
 */
async function handleRecordingClick() {
  // Ignore clicks when processing or AI is speaking
  if (
    currentState === RecordingState.PROCESSING ||
    currentState === RecordingState.AI_SPEAKING
  ) {
    return;
  }

  if (currentState === RecordingState.READY) {
    await startRecording();
  } else if (currentState === RecordingState.RECORDING) {
    await stopRecording();
  }
}

/**
 * Displays text with speaker indication (user or AI)
 * @param {string} text - The text to display
 * @param {string} speaker - Either 'user' or 'ai' to indicate the speaker
 */
function showTranscribedText(text, speaker = "user") {
  // Ensure theme styles are available
  ensureThemeStyles();

  // Remove any existing text notifications
  const existingNotifications = document.querySelectorAll(
    "[data-ai-interviewer-notification]"
  );
  existingNotifications.forEach((notification) => notification.remove());

  // Create the notification element
  const notification = document.createElement("div");
  notification.setAttribute("data-ai-interviewer-notification", "true");
  notification.className = "ai-notification";

  const isAI = speaker === "ai";
  const themeClass = isAI ? "ai-response" : "user-transcription";
  const speakerLabel = isAI ? "🤖 AI Interviewer" : "🎯 You";
  const badgeText = isAI ? "RESPONSE" : "TRANSCRIBED";

  notification.classList.add(themeClass);

  notification.innerHTML = `
    <div class="notification-header">
      <span class="speaker-label">${speakerLabel}</span>
      <span class="notification-badge">${badgeText}</span>
    </div>
    <div class="notification-content">
      ${text}
    </div>
    <button class="notification-dismiss" onclick="this.parentElement.remove()">
      Dismiss
    </button>
  `;

  document.body.appendChild(notification);

  // Auto-remove after appropriate time (longer for AI responses)
  const autoRemoveTime = isAI ? 15000 : 10000;
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideOut 0.3s ease-in forwards";
      setTimeout(() => notification.remove(), 300);
    }
  }, autoRemoveTime);
}

/**
 * Shows an error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
  ensureThemeStyles();

  const errorDiv = document.createElement("div");
  errorDiv.className = "ai-notification error";

  errorDiv.innerHTML = `
    <div class="notification-header">
      <span class="speaker-label">⚠️ Error</span>
      <span class="notification-badge">SYSTEM</span>
    </div>
    <div class="notification-content">
      ${message}
    </div>
    <button class="notification-dismiss" onclick="this.parentElement.remove()">
      Dismiss
    </button>
  `;

  document.body.appendChild(errorDiv);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.style.animation = "slideOut 0.3s ease-in forwards";
      setTimeout(() => errorDiv.remove(), 300);
    }
  }, 8000);
}

/**
 * Shows a success message to the user
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
  ensureThemeStyles();

  const successDiv = document.createElement("div");
  successDiv.className = "ai-notification success";

  successDiv.innerHTML = `
    <div class="notification-header">
      <span class="speaker-label">✅ Success</span>
      <span class="notification-badge">SYSTEM</span>
    </div>
    <div class="notification-content">
      ${message}
    </div>
    <button class="notification-dismiss" onclick="this.parentElement.remove()">
      Dismiss
    </button>
  `;

  document.body.appendChild(successDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (successDiv.parentElement) {
      successDiv.style.animation = "slideOut 0.3s ease-in forwards";
      setTimeout(() => successDiv.remove(), 300);
    }
  }, 5000);
}

/**
 * Ensures basic styles and animations are available in the document
 */
function ensureThemeStyles() {
  if (!document.getElementById("ai-interviewer-styles")) {
    const style = document.createElement("style");
    style.id = "ai-interviewer-styles";
    style.textContent = `
      .ai-notification {
        position: fixed;
        top: 60px;
        right: 15px;
        max-width: 280px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        color: #333;
        animation: slideIn 0.3s ease-out;
      }

      .ai-notification.user-transcription {
        border-color: #4285f4;
        background: #f0f8ff;
      }

      .ai-notification.ai-response {
        border-color: #4CAF50;
        background: #e8f5e8;
      }

      .ai-notification.error {
        border-color: #f44336;
        background: #ffebee;
        z-index: 10002;
      }

      .ai-notification.success {
        border-color: #4CAF50;
        background: #e8f5e8;
      }

      .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-weight: bold;
        font-size: 11px;
      }

      .notification-badge {
        font-size: 9px;
        padding: 1px 4px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.1);
      }

      .user-transcription .speaker-label { color: #4285f4; }
      .ai-response .speaker-label { color: #4CAF50; }
      .error .speaker-label { color: #f44336; }
      .success .speaker-label { color: #4CAF50; }

      .notification-content {
        background: white;
        padding: 8px;
        border-radius: 6px;
        margin-bottom: 8px;
        border-left: 3px solid #e0e0e0;
        font-size: 12px;
      }

      .user-transcription .notification-content { border-left-color: #4285f4; }
      .ai-response .notification-content { border-left-color: #4CAF50; }
      .error .notification-content { border-left-color: #f44336; }
      .success .notification-content { border-left-color: #4CAF50; }

      .notification-dismiss {
        background: #4285f4;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        width: 100%;
      }

      .notification-dismiss:hover {
        opacity: 0.8;
      }

      .error .notification-dismiss { background: #f44336; }
      .success .notification-dismiss { background: #4CAF50; }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .animate-spin { animation: spin 1s linear infinite; }
      .animate-pulse { animation: pulse 2s ease-in-out infinite; }

      /* Recording Button Styles */
      #ai-interviewer-record-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }

      #ai-interviewer-record-btn:hover::before {
        left: 100%;
      }

      #ai-interviewer-record-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
      }

      #ai-interviewer-record-btn:active:not(:disabled) {
        transform: translateY(0);
      }

      #ai-interviewer-recorder:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
      }
    `;
    document.head.appendChild(style);
  }
}
