/**
 * Chrome Extension Background Script for AI-powered Text-to-Speech and Speech-to-Text
 * Handles communication between content scripts and AI services
 */

import {
  textToSpeech,
  speechToText,
  sendPromptAndHandleHistory,
} from "./ai-service.js";
import { blobToBase64 } from "./utilities.js";

/**
 * Main message listener for handling requests from content scripts
 * Supports textToSpeech and speechToText actions with proper error handling
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // Validate request structure
    if (!request || !request.action) {
      sendResponse({ status: "Error", error: "Invalid request format" });
      return false;
    }

    switch (request.action) {
      case "textToSpeech":
        handleTextToSpeech(request, sendResponse);
        return true; // Indicates asynchronous response

      case "speechToText":
        handleSpeechToText(request, sendResponse);
        return true; // Indicates asynchronous response

      case "userSpeech":
        handleUserSpeech(request, sendResponse);
        return true; // Indicates asynchronous response

      case "sendChatMessage":
        handleChatMessage(request, sendResponse);
        return true; // Indicates asynchronous response

      default:
        console.warn("Unknown action requested:", request.action);
        sendResponse({
          status: "Error",
          error: `Unknown action: ${request.action}. Supported actions: textToSpeech, speechToText`,
        });
        return false;
    }
  } catch (error) {
    console.error("Unexpected error in message listener:", error);
    sendResponse({
      status: "Error",
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
  // Validate text parameter
  if (!request.text || typeof request.text !== "string") {
    sendResponse({
      status: "Error",
      error: "Text parameter is required and must be a string",
    });
    return;
  }

  try {
    const audioBlob = await textToSpeech(request.text);

    if (!audioBlob) {
      throw new Error("Failed to generate audio blob");
    }

    // Convert blob to base64 for cross-context messaging
    const audioBase64 = await blobToBase64(audioBlob);
    sendResponse({
      status: "success",
      audioData: audioBase64,
      mimeType: audioBlob.type || "audio/wav",
      message: "Text to speech conversion completed successfully",
    });
  } catch (error) {
    console.error("Error in textToSpeech:", error);
    sendResponse({
      status: "Error",
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
      status: "Error",
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
      status: "success",
      text: text,
      message: "Speech to text conversion completed successfully",
    });
  } catch (error) {
    console.error("Error in speechToText:", error);
    sendResponse({
      status: "Error",
      error: error.message || "Speech to text failed",
    });
  }
}

/**
 * Handles user speech input requests
 * @param {Object} request - The request object containing user text
 * @param {Function} sendResponse - Function to send response back
 */
async function handleUserSpeech(request, sendResponse) {
  // Validate user text
  if (!request.text || typeof request.text !== "string") {
    sendResponse({
      status: "Error",
      error: "User text is required and must be a string",
    });
    return;
  }

  try {
    const text = await sendPromptAndHandleHistory(request.text);
    sendResponse({
      status: "success",
      text,
    });
  } catch (error) {
    console.error("Error in handleUserSpeech:", error);
    sendResponse({
      status: "Error",
      error: error.message || "User speech processing failed",
    });
  }
}

/**
 * Handles chat message requests from popup
 * @param {Object} request - The request object containing chat message
 * @param {Function} sendResponse - Function to send response back
 */
async function handleChatMessage(request, sendResponse) {
  // Validate message text
  if (!request.message || typeof request.message !== "string") {
    sendResponse({
      success: false,
      error: "Message text is required and must be a string",
    });
    return;
  }

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
