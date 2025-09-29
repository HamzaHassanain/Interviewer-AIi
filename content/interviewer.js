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
 * Handles user speech input and coordinates AI response
 * This function is called from recording-manager.js after transcription
 * @param {string} userText - The transcribed user speech
 * @returns {Promise<string>} The AI response text
 */
async function handleUserSpeech(userText) {
  try {
    // Send to background script for AI processing
    const response = await chrome.runtime.sendMessage({
      action: "userSpeech",
      text: userText,
    });

    // Validate response
    if (!response) {
      throw new Error("No response received from background script");
    }

    if (response.status === "Error") {
      throw new Error(response.error);
    }

    if (response.status !== "success" || !response.text) {
      throw new Error("Invalid response from AI service");
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
    console.log("Conversation history cleared");
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

    if (!ttsResponse) {
      throw new Error("No response received from text-to-speech service");
    }

    if (ttsResponse.status === "Error") {
      throw new Error(ttsResponse.error);
    }

    if (ttsResponse.status !== "success" || !ttsResponse.audioData) {
      throw new Error("Invalid response from text-to-speech service");
    }

    // Convert base64 audio back to blob and play it
    const audioBase64 = ttsResponse.audioData;
    const audioBlob = base64ToBlob(audioBase64, "audio/wav");

    const callback = () => {
      updateButtonState(RecordingState.READY);
    };
    await playAudioBlob(audioBlob, callback);

    console.log("AI speech completed");
  } catch (error) {
    console.error("Failed to play AI response:", error);
    showError("Failed to play AI response: " + error.message);
  }
}
