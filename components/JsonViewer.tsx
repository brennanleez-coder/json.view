"use client";

import { useState, useEffect, useRef, type KeyboardEvent, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { XMLParser } from "fast-xml-parser";
import { toast } from "sonner";

import { saveJsonToHistory } from "@/lib/json-history";
import { useMobile } from "@/hooks/use-mobile";
import { cleanEscapedJson } from "@/lib/utils";

import JsonEditor from "@/components/JsonEditor";
import JsonViewerPane from "@/components/JsonViewerPane";

interface JsonViewerProps {
  initialJson: any;
  copyToLLM?: (json: any) => void;
  hideEditingButtons?: boolean;
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

export default function JsonViewer({ initialJson, copyToLLM, hideEditingButtons }: JsonViewerProps) {
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

  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      setJsonString(JSON.stringify(initialJson, null, 2));
      setParsedJson(initialJson);
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  }, [initialJson]);

  const handleTabKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.currentTarget;
      const newValue =
        jsonString.substring(0, selectionStart) +
        "\t" +
        jsonString.substring(selectionEnd);
      setJsonString(newValue);

      requestAnimationFrame(() => {
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd =
          selectionStart + 1;
      });
    }
  };

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

  const cleanEscapedJsonHandler = () => {
    try {
      const cleaned = cleanEscapedJson(jsonString, true);
      setJsonString(cleaned);
      
      const parsed = JSON.parse(cleaned);
      setParsedJson(parsed);
      setError(null);
      toast.success("Escaped JSON cleaned and expanded successfully");
    } catch (err) {
      showErrorWithLineInfo(err);
    }
  };

  const expandStringifiedJsonHandler = () => {
    try {
      const expanded = cleanEscapedJson(jsonString, true);
      setJsonString(expanded);
      
      const parsed = JSON.parse(expanded);
      setParsedJson(parsed);
      setError(null);
      toast.success("Stringified JSON fields expanded successfully");
    } catch (err) {
      showErrorWithLineInfo(err);
    }
  };

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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      try {
        const parsed = JSON.parse(jsonString);
        saveJsonToHistory(parsed);
      } catch {
        // no-op
      }
    });
  };

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
    e.target.value = "";
  };

  const togglePath = (path: string) => {
    const newExpandedPaths = new Set(expandedPaths);
    if (newExpandedPaths.has(path)) {
      newExpandedPaths.delete(path);
    } else {
      newExpandedPaths.add(path);
    }
    setExpandedPaths(newExpandedPaths);
  };

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

  const expandAll = () => {
    try {
      const cleanedString = cleanEscapedJson(jsonString, true);
      const newParsedJson = JSON.parse(cleanedString);
      
      setJsonString(JSON.stringify(newParsedJson, null, 2));
      setParsedJson(newParsedJson);

      const paths = new Set<string>();
      collectAllPaths(newParsedJson, [], paths);
      setExpandedPaths(paths);
      toast.success("Expanded all nodes and stringified JSON");
    } catch (err) {
      showErrorWithLineInfo(err);
    }
  };

  const collapseAll = () => {
    setExpandedPaths(new Set([""]));
  };

  useEffect(() => {
    if (!error) {
      const paths = new Set<string>();
      collectAllPaths(parsedJson, [], paths);
      setExpandedPaths(paths);
    }
  }, [parsedJson, error]);

  const totalLines = jsonString.split("\n").length;

  const handleScroll = () => {
    if (!lineNumbersRef.current || !textAreaRef.current) return;
    lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
  };

  const handleCopyToLLM = () => {
    if (copyToLLM) {
      copyToLLM(parsedJson);
    } else {
      const minifiedJson = JSON.stringify(parsedJson);
      navigator.clipboard.writeText(minifiedJson);
      toast.success("Minified JSON copied to clipboard!");
    }
  };

  return (
    <motion.div
      className={`flex ${
        isMobile ? "flex-col gap-2" : "flex-row"
      } w-full h-[calc(100vh-200px)] sm:h-[calc(100vh-220px)] lg:h-[calc(100vh-240px)] bg-white dark:bg-gray-950`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        type: "spring",
        stiffness: 100,
      }}
    >
      <JsonEditor
        jsonString={jsonString}
        setJsonString={setJsonString}
        error={error}
        copied={copied}
        copyToClipboard={copyToClipboard}
        formatJson={formatJson}
        cleanEscapedJsonHandler={cleanEscapedJsonHandler}
        expandStringifiedJsonHandler={expandStringifiedJsonHandler}
        handleFileUpload={handleFileUpload}
        handleJsonChange={handleJsonChange}
        handleTabKey={handleTabKey}
        handleScroll={handleScroll}
        totalLines={totalLines}
        lineNumbersRef={lineNumbersRef}
        textAreaRef={textAreaRef}
        isMobile={isMobile}
        hideEditingButtons={hideEditingButtons}
      />

      {isMobile && (
        <div className="h-px bg-gray-200 dark:bg-gray-800 mx-2" />
      )}

      <JsonViewerPane
        parsedJson={parsedJson}
        expandedPaths={expandedPaths}
        togglePath={togglePath}
        updateValue={updateValue}
        isMobile={isMobile}
        expandAll={expandAll}
        collapseAll={collapseAll}
        copyToLLM={handleCopyToLLM}
      />
    </motion.div>
  );
}
