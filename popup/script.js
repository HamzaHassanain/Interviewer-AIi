import { getFromStorage, setInStorage } from "../shared/chorme-storage.js";

document.addEventListener("DOMContentLoaded", async () => {
  const geminiApiKeyInput = document.getElementById("gemini-api-key");
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const statusText = document.getElementById("status-text");
  const statusIndicator = document.getElementById("status-indicator");
  const chatHistory = document.getElementById("chat-history");
  const chatInput = document.getElementById("chat-input");
  const sendChatBtn = document.getElementById("send-chat-btn");
  const clearChatBtn = document.getElementById("clear-chat-btn");

  // Load saved API key
  geminiApiKeyInput.value = (await getFromStorage("apiKey")) || "";

  // Load interview status
  const isInterviewActive =
    (await getFromStorage("isInterviewActive")) || false;
  updateInterviewStatus(isInterviewActive);

  // Load and display conversation history
  await loadConversationHistory();

  // Handle API key changes
  geminiApiKeyInput.addEventListener("input", async (event) => {
    const apiKey = event.target.value;
    await setInStorage("apiKey", apiKey);
  });

  // Handle clear chat button
  clearChatBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear the conversation history?")) {
      await clearConversationHistory();
    }
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

  // Handle chat input
  chatInput.addEventListener("keypress", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendChatMessage();
    }
  });

  // Handle send chat button
  sendChatBtn.addEventListener("click", async () => {
    await sendChatMessage();
  });

  /**
   * Loads and displays conversation history from storage
   */
  async function loadConversationHistory() {
    try {
      const history = (await getFromStorage("conversationHistory")) || [];
      chatHistory.innerHTML = "";
      if (history.length === 0) {
        chatHistory.innerHTML = `
          <div class="chat-message system">
            <div class="message-content">
              <p>No conversation history yet. Start an interview to begin!</p>
            </div>
          </div>
        `;
        return;
      }

      history.forEach((message) => {
        addMessageToChat(message.role, message.text, false);
      });

      // Scroll to bottom
      chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch (error) {
      console.error("Failed to load conversation history:", error);
      chatHistory.innerHTML = `
        <div class="chat-message system error">
          <div class="message-content">
            <p>Failed to load conversation history</p>
          </div>
        </div>
      `;
    }
  }

  /**
   * Sends a chat message and handles the response
   */
  async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    const apiKey = geminiApiKeyInput.value.trim();
    if (!apiKey) {
      addMessageToChat(
        "system",
        "Please enter your Google AI API key first.",
        true
      );
      return;
    }

    // Clear input and disable send button
    chatInput.value = "";
    sendChatBtn.disabled = true;
    chatInput.disabled = true;

    // Add user message to chat
    addMessageToChat("user", message, true);

    // Add thinking indicator
    const thinkingId = addThinkingIndicator();

    try {
      // Send message to background script for AI processing
      const response = await chrome.runtime.sendMessage({
        action: "sendChatMessage",
        message: message,
      });

      // Remove thinking indicator
      removeThinkingIndicator(thinkingId);

      if (response.success) {
        // Add AI response to chat
        addMessageToChat("model", response.text, true);
      } else {
        throw new Error(response.error || "Failed to get AI response");
      }
    } catch (error) {
      console.error("Chat message failed:", error);
      removeThinkingIndicator(thinkingId);
      addMessageToChat("system", `Error: ${error.message}`, true);
    } finally {
      // Re-enable input
      sendChatBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  /**
   * Adds a message to the chat display
   * @param {string} role - The role of the message sender (user, model, system)
   * @param {string} text - The message text
   * @param {boolean} updateStorage - Whether to update the conversation history in storage
   */
  async function addMessageToChat(role, text, updateStorage = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${role}`;

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    const messageText = document.createElement("p");
    messageText.textContent = text;

    messageContent.appendChild(messageText);
    messageDiv.appendChild(messageContent);

    // Add timestamp for non-system messages
    if (role !== "system") {
      const timestamp = document.createElement("div");
      timestamp.className = "message-timestamp";
      timestamp.textContent = new Date().toLocaleTimeString();
      messageDiv.appendChild(timestamp);
    }

    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  /**
   * Adds a thinking indicator to the chat
   * @returns {string} The ID of the thinking indicator element
   */
  function addThinkingIndicator() {
    const thinkingId = `thinking-${Date.now()}`;
    const thinkingDiv = document.createElement("div");
    thinkingDiv.id = thinkingId;
    thinkingDiv.className = "chat-message model thinking";
    thinkingDiv.innerHTML = `
      <div class="message-content">
        <div class="thinking-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p>AI is thinking...</p>
      </div>
    `;
    chatHistory.appendChild(thinkingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return thinkingId;
  }

  /**
   * Removes the thinking indicator from the chat
   * @param {string} thinkingId - The ID of the thinking indicator to remove
   */
  function removeThinkingIndicator(thinkingId) {
    const thinkingElement = document.getElementById(thinkingId);
    if (thinkingElement) {
      thinkingElement.remove();
    }
  }

  /**
   * Clears the conversation history
   */
  async function clearConversationHistory() {
    try {
      await setInStorage("conversationHistory", []);
      await loadConversationHistory();
    } catch (error) {
      console.error("Failed to clear conversation history:", error);
    }
  }

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
