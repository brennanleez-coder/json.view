const STORAGE_KEY = "json-viewer-history"
const MAX_HISTORY_ITEMS = 10

interface HistoryItem {
  data: any
  timestamp: number
}

export function saveJsonToHistory(json: any): void {
  try {
    // Get existing history
    const history = getJsonHistory()

    // Create new history item
    const newItem: HistoryItem = {
      data: json,
      timestamp: Date.now(),
    }

    // Check if this JSON is already in history (simple string comparison)
    const jsonStr = JSON.stringify(json)
    const exists = history.some((item) => JSON.stringify(item.data) === jsonStr)

    if (!exists) {
      // Add new item to the beginning of the array
      history.unshift(newItem)

      // Limit history to MAX_HISTORY_ITEMS
      const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS)

      // Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory))
    }
  } catch (error) {
    console.error("Error saving JSON to history:", error)
  }
}

export function getJsonHistory(): HistoryItem[] {
  try {
    const historyStr = localStorage.getItem(STORAGE_KEY)
    if (!historyStr) return []

    return JSON.parse(historyStr)
  } catch (error) {
    console.error("Error getting JSON history:", error)
    return []
  }
}

export function clearJsonHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Error clearing JSON history:", error)
  }
}

