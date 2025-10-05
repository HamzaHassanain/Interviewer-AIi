/**
 * Chrome Extension Background Script for AI-powered Text-to-Speech and Speech-to-Text
 * Handles communication between content scripts and AI services
 */

import {
  textToSpeech,
  speechToText,
  sendPromptAndHandleHistory,
} from "./ai-service.js";

/**
 * Main message listener for handling requests from content scripts
 * Supports textToSpeech and speechToText actions with proper error handling
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // Validate request structure
    if (!request || !request.action) {
      sendResponse({ success: false, error: "Invalid request format" });
      return false;
    }

    switch (request.action) {
      case "textToSpeech":
        handleTextToSpeech(request, sendResponse);
        return true;

      case "speechToText":
        handleSpeechToText(request, sendResponse);
        return true;

      case "sendChatMessage":
        handleChatMessage(request, sendResponse);
        return true;

      default:
        console.warn("Unknown action requested:", request.action);
        sendResponse({
          success: false,
          error: `Unknown action: ${request.action}. Supported actions: textToSpeech, speechToText`,
        });
        return false;
    }
  } catch (error) {
    console.error("Unexpected error in message listener:", error);
    sendResponse({
      success: false,
      error: "Internal error: " + error.message,
    });
    return false;
  }
});

/**
 * Handles text-to-speech requests
 * @param {Object} request - The request object containing text
 * @param {Function} sendResponse - Function to send response back
 */
async function handleTextToSpeech(request, sendResponse) {
  if (!request.text || typeof request.text !== "string") {
    sendResponse({
      success: false,
      error: "Text parameter is required and must be a string",
    });
    return;
  }

  try {
    const audioData = await textToSpeech(request.text);

    sendResponse({
      success: true,
      audioData,
      message: "Text to speech conversion completed successfully",
    });
  } catch (error) {
    console.error("Error in textToSpeech:", error);
    sendResponse({
      success: false,
      error: error.message || "Text to speech failed",
    });
  }
}

/**
 * Handles speech-to-text requests
 * @param {Object} request - The request object containing audio data
 * @param {Function} sendResponse - Function to send response back
 */
async function handleSpeechToText(request, sendResponse) {
  // Validate audio parameters
  if (!request.audioBlob) {
    sendResponse({
      success: false,
      error: "Audio blob parameter is required",
    });
    return;
  }

  try {
    const text = await speechToText(request.audioBlob, request.mimeType);

    if (!text) {
      throw new Error("No text could be extracted from audio");
    }

    sendResponse({
      success: true,
      text: text,
      message: "Speech to text conversion completed successfully",
    });
  } catch (error) {
    console.error("Error in speechToText:", error);
    sendResponse({
      success: false,
      error: error.message || "Speech to text failed",
    });
  }
}

/**
 * Handles chat message requests from popup
 * @param {Object} request - The request object containing chat message
 * @param {Function} sendResponse - Function to send response back
 */
async function handleChatMessage(request, sendResponse) {
  try {
    const text = await sendPromptAndHandleHistory(request.message);
    sendResponse({
      success: true,
      text,
    });
  } catch (error) {
    console.error("Error in handleChatMessage:", error);
    sendResponse({
      success: false,
      error: error.message || "Chat message processing failed",
    });
  }
}
