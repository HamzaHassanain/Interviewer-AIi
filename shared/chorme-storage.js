function getFromStorage(key) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(result[key]);
      });
    } catch (error) {
      reject(new Error("Failed to access chrome.storage: " + error.message));
    }
  });
}

function setInStorage(key, value) {
  return new Promise((resolve, reject) => {
    try {
      const item = {};
      item[key] = value;
      chrome.storage.sync.set(item, () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      });
    } catch (error) {
      reject(new Error("Failed to access chrome.storage: " + error.message));
    }
  });
}

// check if the type is module then export functions

export { getFromStorage, setInStorage };
