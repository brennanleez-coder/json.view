"use client"

import { Dispatch, SetStateAction } from "react"
import { motion } from "framer-motion"
import { Code, FileJson, Database, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import JsonViewer from "@/components/JsonViewer"
import { HistoryDialog } from "@/components/history-dialog"
import { basicJson, arrayOfArraysJson, apiResponseJson } from "@/lib/data"

interface JsonViewerTabProps {
  currentJson: object
  setCurrentJson: Dispatch<SetStateAction<object>>
  historyOpen: boolean
  setHistoryOpen: Dispatch<SetStateAction<boolean>>
  container: object
  item: object
}

const JsonViewerTab = ({
  currentJson,
  setCurrentJson,
  historyOpen,
  setHistoryOpen,
  container,
  item,
}: JsonViewerTabProps) => {
  return (
    <>
      {/* Buttons to switch among various JSON examples */}
      <motion.div
        className="flex flex-wrap gap-2 mb-6 justify-center"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <Button
            size="sm"
            variant={currentJson === basicJson ? "default" : "outline"}
            onClick={() => setCurrentJson(basicJson)}
            className="rounded-full transition-all duration-200 flex items-center gap-1.5"
          >
            <FileJson className="h-4 w-4" />
            Basic JSON
          </Button>
        </motion.div>

        <motion.div variants={item}>
          <Button
            size="sm"
            variant={currentJson === arrayOfArraysJson ? "default" : "outline"}
            onClick={() => setCurrentJson(arrayOfArraysJson)}
            className="rounded-full transition-all duration-200 flex items-center gap-1.5"
          >
            <Code className="h-4 w-4" />
            Arrays of Arrays
          </Button>
        </motion.div>

        <motion.div variants={item}>
          <Button
            size="sm"
            variant={currentJson === apiResponseJson ? "default" : "outline"}
            onClick={() => setCurrentJson(apiResponseJson)}
            className="rounded-full transition-all duration-200 flex items-center gap-1.5"
          >
            <Database className="h-4 w-4" />
            API Response
          </Button>
        </motion.div>

        <motion.div variants={item}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setHistoryOpen(true)}
            className="rounded-full transition-all duration-200 flex items-center gap-1.5"
          >
            <History className="h-4 w-4" />
            History
          </Button>
        </motion.div>
      </motion.div>

      {/* The JSON viewer container */}
      <motion.div
        className="w-full flex-1 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800"
        variants={item}
        initial="hidden"
        animate="show"
      >
        <JsonViewer initialJson={currentJson} />
      </motion.div>

      {/* A small footer text */}
      <motion.div
        className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600"
        variants={item}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Edit, format, and visualize JSON with ease
      </motion.div>

      {/* History Dialog */}
      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelect={setCurrentJson}
      />
    </>
  )
}

export default JsonViewerTab