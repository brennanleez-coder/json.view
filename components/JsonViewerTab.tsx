"use client"

import { Dispatch, SetStateAction } from "react"
import { motion, Variants } from "framer-motion"
import { Code, FileJson, Database, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import JsonViewer from "@/components/JsonViewer"
import { HistoryDialog } from "@/components/history-dialog"
import { basicJson, arrayOfArraysJson, apiResponseJson, stringifiedJson } from "@/lib/data"

interface JsonViewerTabProps {
  currentJson: object
  setCurrentJson: Dispatch<SetStateAction<object>>
  historyOpen: boolean
  setHistoryOpen: Dispatch<SetStateAction<boolean>>
  container: Variants
  item: Variants
  onJsonChange?: (json: any) => void
}

const JsonViewerTab = ({
  currentJson,
  setCurrentJson,
  historyOpen,
  setHistoryOpen,
  container,
  item,
  onJsonChange,
}: JsonViewerTabProps) => {
  return (
    <>
      <motion.div
        className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4 justify-center"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <Button
            size="sm"
            variant={currentJson === basicJson ? "default" : "outline"}
            onClick={() => setCurrentJson(basicJson)}
            className="rounded-full transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <FileJson className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Basic JSON</span>
            <span className="xs:hidden">Basic</span>
          </Button>
        </motion.div>

        <motion.div variants={item}>
          <Button
            size="sm"
            variant={currentJson === arrayOfArraysJson ? "default" : "outline"}
            onClick={() => setCurrentJson(arrayOfArraysJson)}
            className="rounded-full transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Code className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Arrays of Arrays</span>
            <span className="sm:hidden">Arrays</span>
          </Button>
        </motion.div>

        <motion.div variants={item}>
          <Button
            size="sm"
            variant={currentJson === apiResponseJson ? "default" : "outline"}
            onClick={() => setCurrentJson(apiResponseJson)}
            className="rounded-full transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Database className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">API Response</span>
            <span className="sm:hidden">API</span>
          </Button>
        </motion.div>

        <motion.div variants={item}>
          <Button
            size="sm"
            variant={currentJson === stringifiedJson ? "default" : "outline"}
            onClick={() => setCurrentJson(stringifiedJson)}
            className="rounded-full transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <Code className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Stringified Body</span>
            <span className="sm:hidden">String</span>
          </Button>
        </motion.div>

        <motion.div variants={item}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setHistoryOpen(true)}
            className="rounded-full transition-all duration-200 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
          >
            <History className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">History</span>
            <span className="xs:hidden">Hist</span>
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="w-full flex-1 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 mx-0 sm:mx-0"
        variants={item}
        initial="hidden"
        animate="show"
      >
        <JsonViewer initialJson={currentJson} onJsonChange={onJsonChange} />
      </motion.div>

      <motion.div
        className="mt-3 sm:mt-4 text-center text-xs text-gray-400 dark:text-gray-600 px-2"
        variants={item}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Edit, format, and visualize JSON with ease
      </motion.div>

      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelect={setCurrentJson}
      />
    </>
  )
}

export default JsonViewerTab