"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { basicJson } from "@/lib/data"
import JsonViewerTab from "@/components/JsonViewerTab"

export default function Home() {
  const [currentJson, setCurrentJson] = useState(basicJson)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Framer Motion variants
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
      <Tabs defaultValue="json" className="flex-1">
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
            <motion.div
              className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl bg-white dark:bg-gray-900"
              variants={item}
              initial="hidden"
              animate="show"
            >
              <h2 className="text-xl font-semibold mb-4">HTTP Tester</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Coming Soon.
              </p>
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>
    </motion.main>
  )
}
