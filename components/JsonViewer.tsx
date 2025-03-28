"use client";

import { useState, useEffect, useRef, type KeyboardEvent, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { XMLParser } from "fast-xml-parser";
import { toast } from "sonner";

import { saveJsonToHistory } from "@/lib/json-history";
import { useMobile } from "@/hooks/use-mobile";

import JsonEditor from "@/components/JsonEditor";
import JsonViewerPane from "@/components/JsonViewerPane";

interface JsonViewerProps {
  initialJson: any;
}

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

  // Track which paths in the tree are expanded
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const paths = new Set<string>();
    collectAllPaths(initialJson, [], paths);
    return paths;
  });

  const isMobile = useMobile();

  // Refs for scroll-sync
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Load up the initial JSON into the editor
  useEffect(() => {
    try {
      setJsonString(JSON.stringify(initialJson, null, 2));
      setParsedJson(initialJson);
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  }, [initialJson]);

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

  /** Show error with line info if possible (Sonner toast) */
  const showErrorWithLineInfo = (err: unknown) => {
    let errorMessage = "Invalid JSON";
    if (err instanceof SyntaxError) {
      const match = err.message.match(/at position (\d+)/);
      if (match && match[1]) {
        const position = Number.parseInt(match[1]);
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
      {/* Left Editor Pane */}
      <JsonEditor
        jsonString={jsonString}
        setJsonString={setJsonString}
        error={error}
        copied={copied}
        copyToClipboard={copyToClipboard}
        formatJson={formatJson}
        handleFileUpload={handleFileUpload}
        handleJsonChange={handleJsonChange}
        handleTabKey={handleTabKey}
        handleScroll={handleScroll}
        totalLines={totalLines}
        lineNumbersRef={lineNumbersRef}
        textAreaRef={textAreaRef}
        isMobile={isMobile}
      />

      {/* Right Viewer Pane */}
      <JsonViewerPane
        parsedJson={parsedJson}
        expandedPaths={expandedPaths}
        togglePath={togglePath}
        updateValue={updateValue}
        isMobile={isMobile}
      />
    </motion.div>
  );
}
