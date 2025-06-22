"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface JsonTreeViewProps {
  data: any
  path: string[]
  expandedPaths: Set<string>
  togglePath: (path: string) => void
  updateValue: (path: string[], value: any) => void
  level?: number
}

export function JsonTreeView({
  data,
  path,
  expandedPaths,
  togglePath,
  updateValue,
  level = 0,
}: JsonTreeViewProps) {
  const pathString = path.join(".")
  const isExpanded = expandedPaths.has(pathString)

  if (data === null) {
    return <div className="italic text-gray-500 dark:text-gray-400">null</div>
  }

  if (typeof data === "boolean") {
    return (
      <Select
        value={data ? "true" : "false"}
        onValueChange={(val) => updateValue(path, val === "true")}
      >
        <SelectTrigger className="h-7 w-20 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (typeof data === "number") {
    return (
      <Input
        type="number"
        value={data}
        onChange={(e) => updateValue(path, Number(e.target.value))}
        className="h-7 w-32 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
      />
    )
  }

  if (typeof data === "string") {
    const isStringifiedJson = (str: string) => {
      const trimmed = str.trim();
      return (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
             (trimmed.startsWith('[') && trimmed.endsWith(']'));
    };

    const tryParseJson = (str: string) => {
      try {
        return JSON.parse(str);
      } catch {
        return null;
      }
    };

    const parsedJson = tryParseJson(data);
    const isJson = isStringifiedJson(data) && parsedJson !== null;

    return (
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={data}
          onChange={(e) => updateValue(path, e.target.value)}
          className="h-7 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        />
        {isJson && (
          <button
            onClick={() => {
              updateValue(path, parsedJson);
            }}
            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            title="Expand as JSON"
          >
            Expand JSON
          </button>
        )}
      </div>
    )
  }

  if (Array.isArray(data)) {
    return (
      <div>
        <div
          className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 py-1 rounded transition-colors"
          onClick={() => togglePath(pathString)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 mr-1 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-1 text-gray-500" />
          )}
          <span className="mr-1 text-blue-600 dark:text-blue-400">[</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{data.length} items</span>
          {!isExpanded && <span className="text-blue-600 dark:text-blue-400">]</span>}
        </div>

        {isExpanded && (
          <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-800">
            {data.map((item, index) => (
              <div key={index} className="flex">
                <div className="w-6 text-right text-gray-500 dark:text-gray-400 mr-1 text-xs pt-1.5">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <JsonTreeView
                    data={item}
                    path={[...path, index.toString()]}
                    expandedPaths={expandedPaths}
                    togglePath={togglePath}
                    updateValue={updateValue}
                    level={level + 1}
                  />
                </div>
              </div>
            ))}
            <div className="ml-0 text-blue-600 dark:text-blue-400">]</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 py-1 rounded transition-colors"
        onClick={() => togglePath(pathString)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-1 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-1 text-gray-500" />
        )}
        <span className="mr-1 text-purple-600 dark:text-purple-400">{"{"}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {Object.keys(data).length} properties
        </span>
        {!isExpanded && <span className="text-purple-600 dark:text-purple-400">{"}"}</span>}
      </div>

      {isExpanded && (
        <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-800">
          {Object.entries(data).map(([key, value], idx) => (
            <div key={key} className="flex">
              <div className="w-6 text-right text-gray-500 dark:text-gray-400 mr-1 text-xs pt-1.5">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex">
                  <span className="font-semibold mr-1 text-green-600 dark:text-green-400">{`"${key}":`}</span>
                  <JsonTreeView
                    data={value}
                    path={[...path, key]}
                    expandedPaths={expandedPaths}
                    togglePath={togglePath}
                    updateValue={updateValue}
                    level={level + 1}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="ml-0 text-purple-600 dark:text-purple-400">{"}"}</div>
        </div>
      )}
    </div>
  )
}
