"use client"

import React from "react"
import { FileJson } from "lucide-react"
import { JsonTreeView } from "@/components/JsonTreeView"

interface JsonViewerPaneProps {
  parsedJson: any
  expandedPaths: Set<string>
  togglePath: (path: string) => void
  updateValue: (path: string[], value: any) => void
  isMobile: boolean
}

const JsonViewerPane = ({
  parsedJson,
  expandedPaths,
  togglePath,
  updateValue,
  isMobile,
}: JsonViewerPaneProps) => {
  return (
    <div
      className={`${
        isMobile ? "h-[40vh] w-full" : "h-full w-1/2"
      } overflow-auto`}
    >
      <div className="p-3 py-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <h2 className="font-medium text-sm flex items-center gap-2">
          <FileJson className="h-4 w-4 text-gray-500" />
          <span>JSON Viewer</span>
        </h2>
      </div>
      <div className="p-3 font-mono text-sm bg-white dark:bg-gray-950 dark:text-gray-300">
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