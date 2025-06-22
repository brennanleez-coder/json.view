"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Download, Database } from "lucide-react"
import { generateJsonSchema } from "@/lib/utils"
import { toast } from "sonner"

interface SchemaDialogProps {
  jsonData: any
  trigger?: React.ReactNode
}

const SchemaDialog = ({ jsonData, trigger }: SchemaDialogProps) => {
  const [open, setOpen] = useState(false)
  const [schema, setSchema] = useState<any>(null)

  // Update schema whenever jsonData changes
  useEffect(() => {
    if (jsonData) {
      const generatedSchema = generateJsonSchema(jsonData)
      setSchema(generatedSchema)
    }
  }, [jsonData])

  const handleOpen = () => {
    setOpen(true)
  }

  const copySchema = () => {
    if (schema) {
      navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
      toast.success("Schema copied to clipboard!")
    }
  }

  const downloadSchema = () => {
    if (schema) {
      const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "schema.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Schema downloaded!")
    }
  }

  const renderSchemaValue = (value: any, depth: number = 0): React.ReactNode => {
    const indent = "  ".repeat(depth)
    
    if (typeof value === "string") {
      return <span className="text-green-600 dark:text-green-400">"{value}"</span>
    }
    
    if (typeof value === "number") {
      return <span className="text-blue-600 dark:text-blue-400">{value}</span>
    }
    
    if (typeof value === "boolean") {
      return <span className="text-purple-600 dark:text-purple-400">{value.toString()}</span>
    }
    
    if (value === null) {
      return <span className="text-gray-500">null</span>
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          <span className="text-gray-600 dark:text-gray-400">[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-4">
              {renderSchemaValue(item, depth + 1)}
              {index < value.length - 1 && <span className="text-gray-600 dark:text-gray-400">,</span>}
            </div>
          ))}
          <span className="text-gray-600 dark:text-gray-400">]</span>
        </div>
      )
    }
    
    if (typeof value === "object") {
      return (
        <div className="ml-4">
          <span className="text-gray-600 dark:text-gray-400">{'{'}</span>
          {Object.entries(value).map(([key, val], index) => (
            <div key={key} className="ml-4">
              <span className="text-orange-600 dark:text-orange-400">"{key}"</span>
              <span className="text-gray-600 dark:text-gray-400">: </span>
              {renderSchemaValue(val, depth + 1)}
              {index < Object.keys(value).length - 1 && <span className="text-gray-600 dark:text-gray-400">,</span>}
            </div>
          ))}
          <span className="text-gray-600 dark:text-gray-400">{'}'}</span>
        </div>
      )
    }
    
    return <span>{String(value)}</span>
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" onClick={handleOpen} className="h-7 sm:h-8 text-xs sm:text-sm">
            <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Schema
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>JSON Schema</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copySchema}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Schema
            </Button>
            <Button variant="outline" size="sm" onClick={downloadSchema}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          
          <Tabs defaultValue="formatted" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formatted">Formatted</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>
            
            <TabsContent value="formatted" className="mt-4">
              <ScrollArea className="h-[60vh] w-full border rounded-md p-4">
                <pre className="text-sm font-mono">
                  {schema && renderSchemaValue(schema)}
                </pre>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="raw" className="mt-4">
              <ScrollArea className="h-[60vh] w-full border rounded-md p-4">
                <pre className="text-sm font-mono text-gray-800 dark:text-gray-200">
                  {schema && JSON.stringify(schema, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SchemaDialog 