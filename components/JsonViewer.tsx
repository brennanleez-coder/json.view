"use client";
import { XMLParser } from "fast-xml-parser";
import {
  useState,
  useEffect,
  useRef,
  type KeyboardEvent,
  ChangeEvent,
} from "react";
import { motion } from "framer-motion";
import { Save, Code, Copy, Check, FileJson, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { saveJsonToHistory } from "@/lib/json-history";
import { JsonTreeView } from "@/components/JsonTreeView";
// 1) Import Sonner's toast
import { toast } from "sonner";

interface JsonViewerProps {
  initialJson: any;
}

/** Recursively collect JSON paths for expansion */
function collectAllPaths(obj: any, currentPath: string[], paths: Set<string>) {
  if (obj === null || typeof obj !== "object") return;
  paths.add(currentPath.join("."));

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      collectAllPaths(item, [...currentPath, index.toString()], paths);
    });
  } else {
    Object.entries(obj).forEach(([key, value]) => {
      collectAllPaths(value, [...currentPath, key], paths);
    });
  }
}

export default function JsonViewer({ initialJson }: JsonViewerProps) {
  const [jsonString, setJsonString] = useState("");
  const [parsedJson, setParsedJson] = useState<any>(initialJson);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const paths = new Set<string>();
    collectAllPaths(initialJson, [], paths);
    return paths;
  });

  const isMobile = useMobile();

  // Refs for scroll-sync
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  /** Initialize the editor with formatted JSON based on initialJson */
  useEffect(() => {
    try {
      setJsonString(JSON.stringify(initialJson, null, 2));
      setParsedJson(initialJson);
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  }, [initialJson]);

  /**
   * Helper to set error message with line info if possible.
   * Then triggers a Sonner toast with that message.
   */
  const showErrorWithLineInfo = (err: unknown) => {
    let errorMessage = "Invalid JSON";
    if (err instanceof SyntaxError) {
      const match = err.message.match(/at position (\d+)/);
      if (match && match[1]) {
        // The approximate character position
        const position = Number.parseInt(match[1]);
        // Count how many lines until that position
        const lines = jsonString.substring(0, position).split("\n");
        const lineNumber = lines.length;
        errorMessage = `Invalid JSON at line ${lineNumber}: ${err.message}`;
      } else {
        errorMessage = `Invalid JSON: ${err.message}`;
      }
    }
    toast.error(errorMessage);
  };

  /** Parse and set JSON if valid, otherwise set error */
  const handleJsonChange = (value: string) => {
    setJsonString(value);
    try {
      const parsed = JSON.parse(value);
      setParsedJson(parsed);
      setError(null);
    } catch (err) {
      showErrorWithLineInfo(err);
    }
  };

  /** Insert a tab character on Tab key */
  const handleTabKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.currentTarget;
      const newValue =
        jsonString.substring(0, selectionStart) +
        "\t" +
        jsonString.substring(selectionEnd);
      setJsonString(newValue);

      // Update cursor position (next tick)
      requestAnimationFrame(() => {
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd =
          selectionStart + 1;
      });
    }
  };

  /** Pretty-print the JSON with 2 spaces of indentation */
  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonString(formatted);
      setParsedJson(parsed);
      setError(null);
    } catch (err) {
      showErrorWithLineInfo(err);
    }
  };

  /** Copy editor text to clipboard */
  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Save to local history if valid
      try {
        const parsed = JSON.parse(jsonString);
        saveJsonToHistory(parsed);
      } catch {
        // no-op
      }
    });
  };

  /** Handle file upload (JSON/XML) */
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result;
        if (typeof content !== "string") return;

        let parsed: any;
        if (file.name.endsWith(".json")) {
          parsed = JSON.parse(content);
        } else if (file.name.endsWith(".xml")) {
          const parser = new XMLParser();
          parsed = parser.parse(content);
        } else {
          setError("Unsupported file type");
          toast.error("Unsupported file type");
          return;
        }

        setJsonString(JSON.stringify(parsed, null, 2));
        setParsedJson(parsed);
        setError(null);
      } catch (err) {
        showErrorWithLineInfo(err);
      }
    };

    reader.onerror = () => {
      setError("Error reading file");
      toast.error("Error reading file");
    };

    reader.readAsText(file);
    e.target.value = ""; // reset for re-uploading same file
  };

  /** Expand/collapse items in the tree */
  const togglePath = (path: string) => {
    const newExpandedPaths = new Set(expandedPaths);
    if (newExpandedPaths.has(path)) {
      newExpandedPaths.delete(path);
    } else {
      newExpandedPaths.add(path);
    }
    setExpandedPaths(newExpandedPaths);
  };

  /** Update a nested JSON value in the tree */
  const updateValue = (path: string[], value: any) => {
    const newJson = structuredClone(parsedJson);
    let current = newJson;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setParsedJson(newJson);
    setJsonString(JSON.stringify(newJson, null, 2));
  };

  /** Re-expand all paths if we successfully parse new JSON */
  useEffect(() => {
    if (!error) {
      const paths = new Set<string>();
      collectAllPaths(parsedJson, [], paths);
      setExpandedPaths(paths);
    }
  }, [parsedJson, error]);

  // Dynamic line numbers
  const totalLines = jsonString.split("\n").length;

  /** Sync line numbers scrolling with the textarea */
  const handleScroll = () => {
    if (!lineNumbersRef.current || !textAreaRef.current) return;
    lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
  };

  return (
    <motion.div
      className={`flex ${
        isMobile ? "flex-col" : "flex-row"
      } w-full h-[calc(100vh-220px)] bg-white dark:bg-gray-950`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        type: "spring",
        stiffness: 100,
      }}
    >
      {/* JSON Editor Pane */}
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

      {/* JSON Viewer Pane */}
      <div
        className={`${
          isMobile ? "h-[40vh] w-full" : "h-full w-1/2"
        } overflow-auto`}
      >
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
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
    </motion.div>
  );
}
