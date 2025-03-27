"use client"

import JsonViewer from "@/components/JsonViewer"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Code, FileJson, Database, History } from "lucide-react"
import { motion } from "framer-motion"
import { HistoryDialog } from "@/components/history-dialog"

// Example 1: Basic JSON with different data types
const basicJson = {
  name: "JSON Viewer",
  version: 1.0,
  isActive: true,
  features: ["Line numbers", "In-place editing", "Boolean toggles", "Responsive design"],
  settings: {
    theme: "black-white",
    autoSave: true,
    indentation: 2,
  },
  nestedObject: {
    level1: {
      level2: {
        level3: {
          value: "Deep nesting example",
          isVisible: false,
        },
      },
    },
  },
}

// Example 2: Arrays of arrays (matrix-like data)
const arrayOfArraysJson = {
  title: "Multi-dimensional Array Example",
  description: "Demonstrates nested arrays and matrices",
  matrix: [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
  ],
  coordinates: [
    { x: 10, y: 20, points: [1, 2, 3] },
    { x: 30, y: 40, points: [4, 5, 6] },
    { x: 50, y: 60, points: [7, 8, 9] },
  ],
  nestedArrays: [
    [
      ["a", "b", "c"],
      ["d", "e", "f"],
    ],
    [
      ["g", "h", "i"],
      ["j", "k", "l"],
    ],
  ],
}

// Example 3: API-like response with complex structure
const apiResponseJson = {
  status: "success",
  code: 200,
  pagination: {
    currentPage: 1,
    totalPages: 5,
    itemsPerPage: 10,
    totalItems: 42,
  },
  meta: {
    requestId: "a1b2c3d4",
    processingTime: 0.023,
    serverInfo: {
      region: "us-east-1",
      version: "2.1.0",
    },
  },
  data: [
    {
      id: "user_1",
      name: "John Doe",
      email: "john@example.com",
      isActive: true,
      roles: ["admin", "editor"],
      preferences: {
        theme: "dark",
        notifications: {
          email: true,
          push: false,
          sms: null,
        },
      },
      stats: {
        lastLogin: "2023-04-12T15:32:00Z",
        loginCount: 42,
        activities: [
          { type: "login", timestamp: "2023-04-12T15:32:00Z" },
          { type: "edit", timestamp: "2023-04-12T15:45:20Z" },
        ],
      },
    },
    {
      id: "user_2",
      name: "Jane Smith",
      email: "jane@example.com",
      isActive: false,
      roles: ["viewer"],
      preferences: {
        theme: "light",
        notifications: {
          email: false,
          push: true,
          sms: true,
        },
      },
      stats: {
        lastLogin: "2023-04-10T09:15:00Z",
        loginCount: 17,
        activities: [
          { type: "login", timestamp: "2023-04-10T09:15:00Z" },
          { type: "view", timestamp: "2023-04-10T09:22:15Z" },
        ],
      },
    },
  ],
}

export default function Home() {
  const [currentJson, setCurrentJson] = useState(basicJson)
  const [historyOpen, setHistoryOpen] = useState(false)

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    },
  }

  return (
    <motion.main
      className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-8">
        <motion.div className="mb-8 text-center" variants={container} initial="hidden" animate="show">
          <motion.h1
            className="text-3xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400"
            variants={item}
          >
            JsonLite
          </motion.h1>
          <motion.p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto" variants={item}>
            Simple JSON viewer where you can edit in-place.
          </motion.p>
        </motion.div>

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

        <motion.div
          className="w-full flex-1 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800"
          variants={item}
          initial="hidden"
          animate="show"
        >
          <JsonViewer initialJson={currentJson} />
        </motion.div>

        <motion.div
          className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600"
          variants={item}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Edit, format, and visualize JSON with ease
        </motion.div>
      </div>

      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} onSelect={setCurrentJson} />
    </motion.main>
  )
}

