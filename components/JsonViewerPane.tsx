"use client"

import React from "react"
import { FileJson, Expand, Shrink, Copy, Database } from "lucide-react"
import { JsonTreeView } from "@/components/JsonTreeView"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import SchemaDialog from "@/components/schema-dialog"

interface JsonViewerPaneProps {
  parsedJson: any
  expandedPaths: Set<string>
  togglePath: (path: string) => void
  updateValue: (path: string[], value: any) => void
  isMobile: boolean
  expandAll: () => void
  collapseAll: () => void
  copyToLLM?: () => void
}

const JsonViewerPane = ({
  parsedJson,
  expandedPaths,
  togglePath,
  updateValue,
  isMobile,
  expandAll,
  collapseAll,
  copyToLLM,
}: JsonViewerPaneProps) => {
  return (
    <div
      className={`${
        isMobile ? "h-[38vh] sm:h-[42vh] w-full" : "h-full w-1/2"
      } overflow-auto`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 gap-2 sm:gap-0">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <FileJson className="h-4 w-4 text-gray-500" />
          <span>JSON Viewer</span>
        </h2>
        <div className="flex items-center gap-2">
          <SchemaDialog jsonData={parsedJson} />
          {copyToLLM && (
            <Button variant="outline" size="sm" onClick={copyToLLM} className="h-7 sm:h-8 text-xs sm:text-sm">
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Copy to LLM
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={expandAll} className="h-7 sm:h-8 text-xs sm:text-sm">
            <Expand className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="h-7 sm:h-8 text-xs sm:text-sm">
            <Shrink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Collapse All
          </Button>
        </div>
      </div>
      <div className="p-2 sm:p-3 font-mono text-xs sm:text-sm bg-white dark:bg-gray-950 dark:text-gray-300">
        <JsonTreeView
          data={parsedJson}
          path={[]}
          expandedPaths={expandedPaths}
          togglePath={togglePath}
          updateValue={updateValue}
        />
      </div>
    </div>
  )
}

export default JsonViewerPane