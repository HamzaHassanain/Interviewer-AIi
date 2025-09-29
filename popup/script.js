import { getFromStorage, setInStorage } from "../shared/chorme-storage.js";

document.addEventListener("DOMContentLoaded", async () => {
  const geminiApiKeyInput = document.getElementById("gemini-api-key");

  geminiApiKeyInput.value = (await getFromStorage("apiKey")) || "";

  geminiApiKeyInput.addEventListener("input", async (event) => {
    const apiKey = event.target.value;
    await setInStorage("apiKey", apiKey);
  });
});
