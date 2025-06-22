"use client"

import { useState, useEffect } from "react"
import { motion, Variants } from "framer-motion"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { basicJson } from "@/lib/data"
import JsonViewerTab from "@/components/JsonViewerTab"
import { Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import HttpTester from "@/components/HttpTester"

const MAIN_TAB_STORAGE_KEY = "jsonlite-main-tab";

export default function Home() {
  const [currentJson, setCurrentJson] = useState<object>(basicJson)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("json")

  // Load active tab from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MAIN_TAB_STORAGE_KEY);
      if (saved && (saved === "json" || saved === "http")) {
        setActiveTab(saved);
      }
    } catch (error) {
      console.warn("Failed to load main tab from localStorage:", error);
    }
  }, []);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(MAIN_TAB_STORAGE_KEY, activeTab);
    } catch (error) {
      console.warn("Failed to save main tab to localStorage:", error);
    }
  }, [activeTab]);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const item: Variants = {
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-full">
          <motion.div
            className="mb-4 sm:mb-6 lg:mb-8 text-center"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400"
              variants={item}
            >
              JsonLite
            </motion.h1>
            <motion.p
              className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto px-2"
              variants={item}
            >
              Simple JSON viewer with a built-in HTTP tester.
            </motion.p>
          </motion.div>

          {/* Tabs: JSON Viewer vs. HTTP Tester */}
          <motion.div
            className="mb-4 sm:mb-6 flex justify-center"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <TabsList className="flex gap-1 sm:gap-2 text-xs sm:text-sm">
              <TabsTrigger value="json" className="px-3 sm:px-4">JSON Viewer</TabsTrigger>
              <TabsTrigger value="http" className="px-3 sm:px-4">HTTP Tester</TabsTrigger>
            </TabsList>
          </motion.div>

          {/* JSON Viewer Tab */}
          <TabsContent value="json">
            <JsonViewerTab
              currentJson={currentJson}
              setCurrentJson={setCurrentJson}
              historyOpen={historyOpen}
              setHistoryOpen={setHistoryOpen}
              container={container}
              item={item}
            />
          </TabsContent>

          
          <TabsContent value="http">
            <HttpTester />
          </TabsContent>
        </div>
      </Tabs>
    </motion.main>
  )
}
