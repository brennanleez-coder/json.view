"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect } from "react"
import { getJsonHistory, clearJsonHistory } from "@/lib/json-history"
import { motion } from "framer-motion"
import { Trash2 } from "lucide-react"

interface HistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (json: any) => void
}

export function HistoryDialog({ open, onOpenChange, onSelect }: HistoryDialogProps) {
  const [history, setHistory] = useState<Array<{ data: any; timestamp: number }>>([])

  useEffect(() => {
    if (open) {
      setHistory(getJsonHistory())
    }
  }, [open])

  const handleSelect = (item: any) => {
    onSelect(item.data)
    onOpenChange(false)
  }

  const handleClearHistory = () => {
    clearJsonHistory()
    setHistory([])
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getPreviewText = (json: any) => {
    // You can keep or remove this function. If you want to rely entirely
    // on CSS for truncation/wrapping, remove the substring logic.
    const str = JSON.stringify(json)
    return str.length > 100 ? str.substring(0, 100) + "..." : str
  }

  const getJsonType = (json: any) => {
    if (Array.isArray(json)) {
      return "Array"
    } else if (json === null) {
      return "Null"
    } else {
      return typeof json === "object" ? "Object" : typeof json
    }
  }

  const getItemCount = (json: any) => {
    if (Array.isArray(json)) {
      return `${json.length} items`
    } else if (json && typeof json === "object") {
      return `${Object.keys(json).length} properties`
    }
    return ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Use responsive sizing
        className="w-[90vw] sm:max-w-[600px] max-h-[80vh] h-auto overflow-auto"
      >
        <DialogHeader>
          <DialogTitle>JSON History</DialogTitle>
          <DialogDescription>Your recently copied JSON objects. Click on one to load it.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No history found. Copy JSON to save it here.</div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear History
                </Button>
              </div>

              {/* If you prefer the entire area scrollable, wrap everything in ScrollArea.
                  But for better control, you might keep it here. */}
              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-4 space-y-4">
                  {history.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      onClick={() => handleSelect(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{getJsonType(item.data)}</div>
                        <div className="text-xs text-gray-500">{formatDate(item.timestamp)}</div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">{getItemCount(item.data)}</div>
                      {/* 
                        Use whitespace-pre-wrap + break-words to wrap text nicely.
                        If you want multi-line clamp, e.g. 3 lines, replace with:
                          className="text-xs font-mono whitespace-pre-wrap break-words line-clamp-3 ..."
                        and remove the manual substring logic in getPreviewText.
                      */}
                      <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded whitespace-pre-wrap break-words">
                        {getPreviewText(item.data)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
