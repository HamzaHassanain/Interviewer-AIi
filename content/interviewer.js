/**
 * Interview Manager Module
 * Handles AI interviewer interactions and conversation flow
 *
 * Features:
 * - User speech processing and AI response generation
 * - Interview context management
 * - Conversation history tracking
 */

/**
 * Starts the interview session by creating the recording interface
 * @returns {Promise<void>}
 */
async function startInterview(firstTime = false) {
  try {
    createRecordingButton();

    updateButtonState(RecordingState.PROCESSING);

    destroyAllLeetcodeWidgetsExceptCode();

    if (firstTime) {
      await clearConversationHistory();
      await firstInterviewPrompt();
    }

    await setInStorage("isInterviewActive", true);

    await requestMicrophonePermission();

    showSuccess(
      "AI Interviewer is ready! Click the recording button to start."
    );

    resetToReadyState();
  } catch (error) {
    console.error("Failed to start interview:", error);
    showError("Failed to start interview: " + error.message);

    // Clean up on error
    await setInStorage("isInterviewActive", false);
  }
}

/**
 * Stops the interview session and cleans up all resources
 * @returns {Promise<void>}
 */
async function stopInterview() {
  try {
    // Store interview state
    await setInStorage("isInterviewActive", false);

    // Remove the recording button UI
    removeRecordingButton();

    showSuccess("Interview session ended.");
  } catch (error) {
    console.error("Failed to stop interview:", error);
    showError("Failed to stop interview: " + error.message);
  }
}

/**
 * Handles user speech input and coordinates AI response
 * This function is called from recording-manager.js after transcription
 * @param {string} userText - The transcribed user speech
 * @returns {Promise<string>} The AI response text
 */
async function handleUserInteraction(userText) {
  try {
    // Send to background script for AI processing
    const response = await chrome.runtime.sendMessage({
      action: "sendChatMessage",
      message: userText,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    const aiResponse = response.text.trim();

    showTranscribedText(userText);

    await handleAIResponse(aiResponse);
  } catch (error) {
    console.error("Failed to handle user speech:", error);
    throw new Error("Failed to get AI response: " + error.message);
  }
}

/**
 * Handles AI response processing and follow-up actions
 * @param {string} aiText - The AI response text
 * @returns {Promise<void>}
 */
async function handleAIResponse(aiText) {
  try {
    showTranscribedText(aiText, "ai");
    await playAIResponse(aiText);
  } catch (error) {
    console.error("Failed to handle AI response:", error);
    showError("Failed to process AI response: " + error.message);
  }
}

/**
 * Gets the current conversation history
 * @returns {Promise<Array>} The conversation history
 */
async function getConversationHistory() {
  try {
    return (await getFromStorage("conversationHistory")) || [];
  } catch (error) {
    console.error("Failed to get conversation history:", error);
    return [];
  }
}

/**
 * Clears the current conversation history
 * @returns {Promise<void>}
 */
async function clearConversationHistory() {
  try {
    await setInStorage("conversationHistory", []);
    await setInStorage("interviewStats", {
      totalQuestions: 0,
      totalResponses: 0,
      sessionStartTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to clear conversation history:", error);
  }
}

/**
 * Converts AI response text to speech and plays it
 * @param {string} aiText - The AI response to convert to speech
 * @returns {Promise<void>}
 */
async function playAIResponse(aiText) {
  try {
    // Update UI to AI speaking state
    updateButtonState(RecordingState.AI_SPEAKING);
    currentState = RecordingState.AI_SPEAKING;

    // Send to background script for text-to-speech conversion
    const ttsResponse = await chrome.runtime.sendMessage({
      action: "textToSpeech",
      text: aiText,
    });

    if (!ttsResponse.success) {
      throw new Error(ttsResponse.error);
    }

    if (!ttsResponse.audioData) {
      throw new Error(
        "Invalid response from text-to-speech service, audioData missing"
      );
    }

    const pcmData = Uint8Array.from(atob(ttsResponse.audioData), (c) =>
      c.charCodeAt(0)
    );
    createAndPlayWAVBuffer(
      pcmData,
      (err) => {
        if (err) {
          console.error("Error playing audio:", err);
          showError("Error playing AI response audio: " + err.message);
        }
        resetToReadyState();
      },
      () => {
        resetToReadyState();
      }
    );
  } catch (error) {
    console.error("Failed to play AI response:", error);
    showError("Failed to play AI response: " + error.message);
  }
}

async function firstInterviewPrompt() {
  try {
    const message = `
        You are an expert coding interviewer.
        I want you to act as an interviewer for coding interviews.
        I will be the candidate, the interview will be about this problem: ${getLeetcodeProblemTitleAndLink()}.
        I want you to ask me one question at a time, wait for my answer, then give me feedback and ask the next question.
        The questions should be relevant to the problem and test my understanding of algorithms, data structures, and problem-solving skills.
        Start by introducing the problem as I do not know what it is about.

        NOTE, DO NOTE START INTRODUCE THE PROBLEM YET, the interviewee will ask you to introduce the problem, to start the interview
      `;
    const response = await chrome.runtime.sendMessage({
      action: "sendChatMessage",
      message,
    });

    if (!response.success) {
      throw new Error(response.message);
    }
  } catch (error) {
    showError("Failed to send first prompt: " + error.message);
    console.error("Failed to send first prompt:", error);
  }
}
