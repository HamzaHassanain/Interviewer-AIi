import { getFromStorage, setInStorage } from "../shared/chorme-storage.js";

document.addEventListener("DOMContentLoaded", async () => {
  const geminiApiKeyInput = document.getElementById("gemini-api-key");
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const statusText = document.getElementById("status-text");
  const statusIndicator = document.getElementById("status-indicator");

  // Load saved API key
  geminiApiKeyInput.value = (await getFromStorage("apiKey")) || "";

  // Load interview status
  const isInterviewActive =
    (await getFromStorage("isInterviewActive")) || false;
  updateInterviewStatus(isInterviewActive);

  // Handle API key changes
  geminiApiKeyInput.addEventListener("input", async (event) => {
    const apiKey = event.target.value;
    await setInStorage("apiKey", apiKey);
  });

  // Handle start interview button
  startBtn.addEventListener("click", async () => {
    try {
      startBtn.disabled = true;
      statusText.textContent = "Starting interview...";

      // Get current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        throw new Error("No active tab found");
      }

      // Check if tab is on supported domain
      if (!tab.url.includes("leetcode.com/problems/")) {
        throw new Error("Please navigate to a LeetCode problem page first");
      }

      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, { action: "interviewStart" });

      // Update status
      await setInStorage("isInterviewActive", true);
      updateInterviewStatus(true);

      statusText.textContent =
        "Interview started! Use the recording button on the page.";
    } catch (error) {
      console.error("Failed to start interview:", error);
      statusText.textContent = "Failed to start: " + error.message;
      startBtn.disabled = false;
    }
  });

  // Handle stop interview button
  stopBtn.addEventListener("click", async () => {
    try {
      stopBtn.disabled = true;
      statusText.textContent = "Stopping interview...";

      // Get current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab) {
        try {
          // Send message to content script (may fail if content script not loaded)
          await chrome.tabs.sendMessage(tab.id, { action: "interviewStop" });
        } catch (error) {
          // Content script might not be loaded, that's okay
          console.warn("Could not send stop message to content script:", error);
        }
      }

      // Update status
      await setInStorage("isInterviewActive", false);
      updateInterviewStatus(false);

      statusText.textContent = "Interview stopped.";
    } catch (error) {
      console.error("Failed to stop interview:", error);
      statusText.textContent = "Failed to stop: " + error.message;
      stopBtn.disabled = false;
    }
  });

  /**
   * Updates the UI based on interview status
   */
  function updateInterviewStatus(isActive) {
    if (isActive) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusText.textContent = "Interview is active";
      statusIndicator.className = "status-indicator active";
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusText.textContent = "Extension is ready!";
      statusIndicator.className = "status-indicator";
    }
  }
});
