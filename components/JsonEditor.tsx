"use client"

import React, { ChangeEvent, KeyboardEvent, RefObject } from "react"
import { Code, Copy, Check, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface JsonEditorProps {
  jsonString: string
  setJsonString: (value: string) => void
  error: string | null
  copied: boolean
  copyToClipboard: () => void
  formatJson: () => void
  cleanEscapedJsonHandler: () => void
  expandStringifiedJsonHandler: () => void
  handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => void
  handleJsonChange: (value: string) => void
  handleTabKey: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  handleScroll: () => void
  totalLines: number
  lineNumbersRef: RefObject<HTMLDivElement | null>
  textAreaRef: RefObject<HTMLTextAreaElement | null>
  isMobile: boolean
}

const JsonEditor = ({
  jsonString,
  setJsonString,
  error,
  copied,
  copyToClipboard,
  formatJson,
  cleanEscapedJsonHandler,
  expandStringifiedJsonHandler,
  handleFileUpload,
  handleJsonChange,
  handleTabKey,
  handleScroll,
  totalLines,
  lineNumbersRef,
  textAreaRef,
  isMobile,
}: JsonEditorProps) => {
  return (
    <div
      className={`${
        isMobile ? "h-[38vh] sm:h-[42vh] w-full" : "h-full w-1/2"
      } border-b-0 md:border-b-0 md:border-r border-gray-200 dark:border-gray-800`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 gap-2 sm:gap-0">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Code className="h-4 w-4 text-gray-500" />
          <span>JSON Editor</span>
        </h2>
        <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
          <div className="relative">
            <input
              type="file"
              accept=".json,.xml"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 z-10 cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              className="relative z-0 h-7 sm:h-8 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Upload JSON</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={formatJson}
            className="h-7 sm:h-8 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs sm:text-sm px-2 sm:px-3"
          >
            <Code className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            <span className="hidden sm:inline">Format</span>
            <span className="sm:hidden">Fmt</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={cleanEscapedJsonHandler}
            className="h-7 sm:h-8 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs sm:text-sm px-2 sm:px-3"
          >
            <Code className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            <span className="hidden sm:inline">Clean Escaped</span>
            <span className="sm:hidden">Clean</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={expandStringifiedJsonHandler}
            className="h-7 sm:h-8 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs sm:text-sm px-2 sm:px-3"
          >
            <Code className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            <span className="hidden sm:inline">Expand Stringified</span>
            <span className="sm:hidden">Expand</span>
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-7 sm:h-8 px-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {copied ? (
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="relative h-[calc(100%-49px)] sm:h-[calc(100%-57px)]">
        <div className="absolute inset-0 flex overflow-hidden">
          <div
            ref={lineNumbersRef}
            className="bg-gray-100 dark:bg-gray-900 text-gray-500 p-1 sm:p-2 text-right select-none border-r border-gray-200 dark:border-gray-800 overflow-hidden"
            style={{ minWidth: "2.5rem", maxWidth: "3rem" }}
          >
            {Array.from({ length: totalLines }).map((_, i) => (
              <div key={i} className="leading-4 sm:leading-5 text-xs sm:text-sm">
                {i + 1}
              </div>
            ))}
          </div>

          <Textarea
            ref={textAreaRef}
            value={jsonString}
            onChange={(e) => handleJsonChange(e.target.value)}
            onKeyDown={handleTabKey}
            onScroll={handleScroll}
            className="flex-1 font-mono text-xs sm:text-sm p-1 sm:p-2 resize-none border-0 rounded-none focus-visible:ring-0 h-full bg-white dark:bg-gray-950 dark:text-gray-300 overflow-auto"
          />
        </div>
      </div>

      {error && (
        <div className="p-1 sm:p-2 text-red-500 text-xs bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-900/30">
          {error}
        </div>
      )}
    </div>
  )
}
export default JsonEditor