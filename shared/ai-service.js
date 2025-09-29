/**
 * AI Service Module for Google Gemini API interactions
 * Contains text-to-speech and speech-to-text functionality
 */

import { GoogleGenAI } from "https://cdn.jsdelivr.net/npm/@google/genai@1.21.0/+esm";
import { createAudioElementFromBase64, enhanceApiError } from "./utilities.js";
import { getFromStorage, setInStorage } from "./chorme-storage.js";
// API Configuration
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const STT_MODEL = "gemini-2.5-flash";

/**
 * Converts text to speech using Google's Gemini AI Text-to-Speech model
 * @param {string} text - The text to convert to speech
 * @returns {Promise<Blob>} A promise that resolves to an audio blob (WAV format)
 * @throws {Error} When API call fails or invalid response received
 */
export async function textToSpeech(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Text parameter must be a non-empty string");
  }

  try {
    const genai = new GoogleGenAI({
      apiKey: (await getFromStorage("apiKey")) || undefined,
    });

    const response = await genai.models.generateContent({
      model: TTS_MODEL,
      contents: {
        role: "user",
        parts: [
          {
            text: "Please say this: " + text + " in a clear and natural voice.",
          },
        ],
      },
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: (await getFromStorage("voiceName")) || "Kore",
            },
          },
        },
      },
    });

    // Validate API response structure
    if (!response || !response.candidates || !response.candidates[0]) {
      throw new Error("Invalid API response: missing candidates");
    }

    const candidate = response.candidates[0];
    if (
      !candidate.content ||
      !candidate.content.parts ||
      !candidate.content.parts[0]
    ) {
      throw new Error("Invalid API response: missing content parts");
    }

    const part = candidate.content.parts[0];
    if (!part.inlineData || !part.inlineData.data) {
      throw new Error("Invalid API response: missing audio data");
    }

    const audioData = part.inlineData.data;
    const mimeType = part.inlineData.mimeType || "audio/wav";

    // Create proper WAV blob from the base64 audio data
    const audioBlob = createAudioElementFromBase64(audioData, mimeType);

    if (!audioBlob) {
      throw new Error("Failed to create audio blob from received data");
    }

    return audioBlob;
  } catch (error) {
    console.error("Text-to-speech conversion failed:", error);
    throw enhanceApiError(error, "Text-to-speech");
  }
}

/**
 * Converts speech audio to text using Google's Gemini AI model
 * @param {string} audioBase64 - Base64 encoded audio data
 * @param {string} [mimeType="audio/wav"] - MIME type of the audio (e.g., "audio/wav", "audio/mp3")
 * @returns {Promise<string>} A promise that resolves to the transcribed text
 * @throws {Error} When API call fails or no text could be extracted
 */
export async function speechToText(audioBase64, mimeType = "audio/wav") {
  if (!audioBase64 || typeof audioBase64 !== "string") {
    throw new Error("Audio data parameter must be a non-empty base64 string");
  }

  try {
    const genai = new GoogleGenAI({
      apiKey: (await getFromStorage("apiKey")) || undefined,
    });

    const response = await genai.models.generateContent({
      model: STT_MODEL,
      contents: {
        role: "user",
        parts: [
          {
            text: "Tell me what this audio exactly says. Do not add any extra words from you. The response must only contain what the audio says.",
          },
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
        ],
      },
    });

    // Validate API response structure
    if (!response || !response.candidates || !response.candidates[0]) {
      throw new Error("Invalid API response: missing candidates");
    }

    const candidate = response.candidates[0];
    if (
      !candidate.content ||
      !candidate.content.parts ||
      !candidate.content.parts[0]
    ) {
      throw new Error("Invalid API response: missing content parts");
    }

    const text = candidate.content.parts[0].text;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      throw new Error("No text could be extracted from the audio");
    }

    return text.trim();
  } catch (error) {
    console.error("Speech-to-text conversion failed:", error);
    throw enhanceApiError(error, "Speech-to-text");
  }
}
