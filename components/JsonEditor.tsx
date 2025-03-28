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
  handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => void
  handleJsonChange: (value: string) => void
  handleTabKey: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  handleScroll: () => void
  totalLines: number
  lineNumbersRef: RefObject<HTMLDivElement>
  textAreaRef: RefObject<HTMLTextAreaElement>
  isMobile: boolean
}

const JsonEditor = ({
  jsonString,
  setJsonString,
  error,
  copied,
  copyToClipboard,
  formatJson,
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
        isMobile ? "h-[40vh] w-full" : "h-full w-1/2"
      } border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800`}
    >
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <Code className="h-4 w-4 text-gray-500" />
          <span>JSON Editor</span>
        </h2>
        <div className="flex gap-2 items-center">
          {/* Upload button */}
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
              className="relative z-0 h-8 px-3 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload JSON
            </Button>
          </div>

          {/* Copy button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-8 px-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Format button */}
          <Button
            variant="outline"
            size="sm"
            onClick={formatJson}
            className="h-8 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Code className="h-3.5 w-3.5 mr-1" />
            Format
          </Button>
        </div>
      </div>

      {/* Editor + line numbers */}
      <div className="relative h-[calc(100%-49px)]">
        <div className="absolute inset-0 flex overflow-hidden">
          {/* Line numbers */}
          <div
            ref={lineNumbersRef}
            className="bg-gray-100 dark:bg-gray-900 text-gray-500 p-2 text-right select-none border-r border-gray-200 dark:border-gray-800 overflow-hidden"
            style={{ minWidth: "3rem" }}
          >
            {Array.from({ length: totalLines }).map((_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* The <Textarea> itself */}
          <Textarea
            ref={textAreaRef}
            value={jsonString}
            onChange={(e) => handleJsonChange(e.target.value)}
            onKeyDown={handleTabKey}
            onScroll={handleScroll}
            className="flex-1 font-mono text-sm p-2 resize-none border-0 rounded-none focus-visible:ring-0 h-full bg-white dark:bg-gray-950 dark:text-gray-300 overflow-auto"
          />
        </div>
      </div>

      {error && (
        <div className="p-2 text-red-500 text-xs bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-900/30">
          {error}
        </div>
      )}
    </div>
  )
}
export default JsonEditor