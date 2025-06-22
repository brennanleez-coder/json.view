"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Copy, Plus, X, Save, ChevronDown, ChevronRight, GitCompare } from "lucide-react"
import JsonViewer from "./JsonViewer"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface Header {
  key: string;
  value: string;
}

interface HeaderSet {
  id: string;
  name: string;
  headers: Header[];
  enabled: boolean;
}

interface RequestTab {
  id: string;
  name: string;
  url: string;
  method: string;
  requestBody: string;
  headerSets: HeaderSet[];
  response: any;
  loading: boolean;
}

const DEFAULT_HEADER_SETS: HeaderSet[] = [
  {
    id: "1",
    name: "Default",
    headers: [{ key: "Content-Type", value: "application/json" }],
    enabled: true
  },
  {
    id: "2", 
    name: "Bearer Auth",
    headers: [
      { key: "Content-Type", value: "application/json" },
      { key: "Authorization", value: "Bearer your-token-here" }
    ],
    enabled: false
  },
  {
    id: "3",
    name: "API Key",
    headers: [
      { key: "Content-Type", value: "application/json" },
      { key: "X-API-Key", value: "your-api-key-here" }
    ],
    enabled: false
  }
];

const STORAGE_KEY = "http-tester-tabs";

const HttpTester = () => {
  const [tabs, setTabs] = useState<RequestTab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [headersExpanded, setHeadersExpanded] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [compareTab1, setCompareTab1] = useState("");
  const [compareTab2, setCompareTab2] = useState("");

  // Load tabs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tabs && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          setActiveTabId(parsed.activeTabId || parsed.tabs[0].id);
        } else {
          // Fallback to default if saved data is invalid
          setTabs([{
            id: "1",
            name: "Request 1",
            url: "https://jsonplaceholder.typicode.com/todos/1",
            method: "GET",
            requestBody: "",
            headerSets: DEFAULT_HEADER_SETS,
            response: null,
            loading: false
          }]);
          setActiveTabId("1");
        }
      } else {
        // No saved data, use default
        setTabs([{
          id: "1",
          name: "Request 1",
          url: "https://jsonplaceholder.typicode.com/todos/1",
          method: "GET",
          requestBody: "",
          headerSets: DEFAULT_HEADER_SETS,
          response: null,
          loading: false
        }]);
        setActiveTabId("1");
      }
    } catch (error) {
      console.warn("Failed to load tabs from localStorage:", error);
      // Fallback to default on error
      setTabs([{
        id: "1",
        name: "Request 1",
        url: "https://jsonplaceholder.typicode.com/todos/1",
        method: "GET",
        requestBody: "",
        headerSets: DEFAULT_HEADER_SETS,
        response: null,
        loading: false
      }]);
      setActiveTabId("1");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save tabs to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (isLoaded && tabs.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          tabs,
          activeTabId
        }));
      } catch (error) {
        console.warn("Failed to save tabs to localStorage:", error);
      }
    }
  }, [tabs, activeTabId, isLoaded]);

  const addTab = () => {
    const newId = Date.now().toString();
    const newTab: RequestTab = {
      id: newId,
      name: `Request ${tabs.length + 1}`,
      url: "https://jsonplaceholder.typicode.com/todos/1",
      method: "GET",
      requestBody: "",
      headerSets: DEFAULT_HEADER_SETS,
      response: null,
      loading: false
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const removeTab = (tabId: string) => {
    if (tabs.length === 1) {
      toast.error("Cannot remove the last tab");
      return;
    }
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const updateTab = (tabId: string, updates: Partial<RequestTab>) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    ));
  };

  const updateTabName = (tabId: string, name: string) => {
    updateTab(tabId, { name });
  };

  const getActiveTab = () => tabs.find(tab => tab.id === activeTabId) || tabs[0];

  const addHeaderSet = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const newId = Date.now().toString();
    const newHeaderSet: HeaderSet = {
      id: newId,
      name: `Header Set ${tab.headerSets.length + 1}`,
      headers: [{ key: "", value: "" }],
      enabled: false
    };

    updateTab(tabId, {
      headerSets: [...tab.headerSets, newHeaderSet]
    });
  };

  const removeHeaderSet = (tabId: string, setId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    updateTab(tabId, {
      headerSets: tab.headerSets.filter(set => set.id !== setId)
    });
  };

  const updateHeaderSetName = (tabId: string, setId: string, name: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    updateTab(tabId, {
      headerSets: tab.headerSets.map(set => 
        set.id === setId ? { ...set, name } : set
      )
    });
  };

  const toggleHeaderSet = (tabId: string, setId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    updateTab(tabId, {
      headerSets: tab.headerSets.map(set => 
        set.id === setId ? { ...set, enabled: !set.enabled } : set
      )
    });
  };

  const addHeader = (tabId: string, setId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    updateTab(tabId, {
      headerSets: tab.headerSets.map(set => 
        set.id === setId 
          ? { ...set, headers: [...set.headers, { key: "", value: "" }] }
          : set
      )
    });
  };

  const removeHeader = (tabId: string, setId: string, headerIndex: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    updateTab(tabId, {
      headerSets: tab.headerSets.map(set => 
        set.id === setId 
          ? { ...set, headers: set.headers.filter((_, i) => i !== headerIndex) }
          : set
      )
    });
  };

  const updateHeader = (tabId: string, setId: string, headerIndex: number, field: 'key' | 'value', value: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    updateTab(tabId, {
      headerSets: tab.headerSets.map(set => 
        set.id === setId 
          ? {
              ...set,
              headers: set.headers.map((header, i) => 
                i === headerIndex ? { ...header, [field]: value } : header
              )
            }
          : set
      )
    });
  };

  const getActiveHeaders = (tabId: string): Record<string, string> => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return {};

    const headerObj: Record<string, string> = {};
    tab.headerSets
      .filter(set => set.enabled)
      .forEach(set => {
        set.headers.forEach(header => {
          if (header.key.trim()) {
            headerObj[header.key.trim()] = header.value.trim();
          }
        });
      });
    return headerObj;
  };

  const sendRequest = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    updateTab(tabId, { loading: true, response: null });

    try {
      const options: RequestInit = {
        method: tab.method,
        headers: getActiveHeaders(tabId),
      };

      if (tab.method !== "GET" && tab.method !== "HEAD") {
        options.body = tab.requestBody;
      }

      const res = await fetch(tab.url, options);
      const data = await res.json();
      
      updateTab(tabId, {
        response: {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          data,
        },
        loading: false
      });
      toast.success("Request successful!");
    } catch (error: any) {
      updateTab(tabId, {
        response: {
          error: true,
          message: error.message,
        },
        loading: false
      });
      toast.error(`Request failed: ${error.message}`);
    }
  };

  const copyToLLM = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.response) return;

    const activeHeaders = getActiveHeaders(tabId);
    const headerText = Object.entries(activeHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const context = `HTTP Request Context:

URL: ${tab.url}
Method: ${tab.method}
Headers:
${headerText}
${tab.method !== "GET" && tab.method !== "HEAD" ? `Body: ${tab.requestBody}\n` : ""}

Response:
Status: ${tab.response?.status} ${tab.response?.statusText}
Headers: ${JSON.stringify(tab.response?.headers)}
Data: ${JSON.stringify(tab.response?.data)}`;

    navigator.clipboard.writeText(context);
    toast.success("Context copied to clipboard!");
  };

  const RequestTabContent = ({ tab }: { tab: RequestTab }) => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={tab.method} onValueChange={(method) => updateTab(tab.id, { method })}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Input 
          value={tab.url}
          onChange={(e) => updateTab(tab.id, { url: e.target.value })}
          placeholder="https://api.example.com/data"
        />
        <Button onClick={() => sendRequest(tab.id)} disabled={tab.loading}>
          {tab.loading ? "Sending..." : "Send"}
        </Button>
      </div>

      <div>
        <div 
          className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
          onClick={() => setHeadersExpanded(!headersExpanded)}
        >
          <div className="flex items-center gap-2">
            {headersExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Header Groups
            </label>
            <span className="text-xs text-gray-500">
              ({tab.headerSets.filter(set => set.enabled).length} active)
            </span>
          </div>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              addHeaderSet(tab.id);
            }} 
            size="sm" 
            variant="outline"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Header Set
          </Button>
        </div>
        
        {headersExpanded && (
          <div className="space-y-3">
            {tab.headerSets.map((headerSet) => (
              <div key={headerSet.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={headerSet.enabled}
                        onCheckedChange={() => toggleHeaderSet(tab.id, headerSet.id)}
                      />
                      <Input
                        value={headerSet.name}
                        onChange={(e) => updateHeaderSetName(tab.id, headerSet.id, e.target.value)}
                        className="w-40 text-sm font-medium bg-white dark:bg-gray-900"
                        placeholder="Group name"
                      />
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        headerSet.enabled 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {headerSet.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addHeader(tab.id, headerSet.id)}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Header
                      </Button>
                      {tab.headerSets.length > 1 && (
                        <Button
                          onClick={() => removeHeaderSet(tab.id, headerSet.id)}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-white dark:bg-gray-950">
                  {headerSet.headers.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                      No headers in this group. Click "Add Header" to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {headerSet.headers.map((header, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <div className="flex-1">
                            <Input
                              value={header.key}
                              onChange={(e) => updateHeader(tab.id, headerSet.id, index, 'key', e.target.value)}
                              placeholder="Header name"
                              className="text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              value={header.value}
                              onChange={(e) => updateHeader(tab.id, headerSet.id, index, 'value', e.target.value)}
                              placeholder="Header value"
                              className="text-sm"
                            />
                          </div>
                          <Button
                            onClick={() => removeHeader(tab.id, headerSet.id, index)}
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {(tab.method === "POST" || tab.method === "PUT" || tab.method === "PATCH") && (
        <div>
          <label className="text-sm font-medium mb-1 block">Body (JSON)</label>
          <Textarea
            value={tab.requestBody}
            onChange={(e) => updateTab(tab.id, { requestBody: e.target.value })}
            placeholder='{ "key": "value" }'
            className="font-mono h-32"
          />
        </div>
      )}
      
      {tab.response && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Response</h3>
              <span className={`font-bold ${tab.response.status >= 200 && tab.response.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                Status: {tab.response.status} {tab.response.statusText}
              </span>
            </div>
            <Button onClick={() => copyToLLM(tab.id)} size="sm" variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy to LLM
            </Button>
          </div>
          {tab.response.error ? (
            <div className="p-4 text-red-500">{tab.response.message}</div>
          ) : (
            <div className="h-96">
              <JsonViewer 
                initialJson={tab.response.data} 
                copyToLLM={() => copyToLLM(tab.id)}
                hideEditingButtons={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const getComparisonTabs = () => {
    const tab1 = tabs.find(t => t.id === compareTab1);
    const tab2 = tabs.find(t => t.id === compareTab2);
    return { tab1, tab2 };
  };

  const ComparisonView = () => {
    const { tab1, tab2 } = getComparisonTabs();
    
    const resetComparison = () => {
      setCompareTab1("");
      setCompareTab2("");
    };
    
    if (!tab1 || !tab2) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Select two tabs to compare</p>
            <div className="flex gap-4 mb-4">
              <Select value={compareTab1} onValueChange={setCompareTab1}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select first tab" />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((tab) => (
                    <SelectItem key={tab.id} value={tab.id}>
                      {tab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={compareTab2} onValueChange={setCompareTab2}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select second tab" />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((tab) => (
                    <SelectItem key={tab.id} value={tab.id}>
                      {tab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={resetComparison} size="sm" variant="outline">
              Reset Selection
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Comparison Controls */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Comparing:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{tab1.name}</span>
              <span className="text-gray-400">vs</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{tab2.name}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setComparisonMode(false)} 
              size="sm" 
              variant="outline"
            >
              Exit Compare
            </Button>
            <Button onClick={resetComparison} size="sm" variant="outline">
              Reset
            </Button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-2 gap-4 h-[calc(100vh-300px)]">
          {/* Left Panel */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">{tab1.name}</h3>
                <Select value={compareTab1} onValueChange={setCompareTab1}>
                  <SelectTrigger className="w-32 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tabs.map((tab) => (
                      <SelectItem key={tab.id} value={tab.id}>
                        {tab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 h-full overflow-auto">
              <RequestTabContent tab={tab1} />
            </div>
          </div>

          {/* Right Panel */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">{tab2.name}</h3>
                <Select value={compareTab2} onValueChange={setCompareTab2}>
                  <SelectTrigger className="w-32 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tabs.map((tab) => (
                      <SelectItem key={tab.id} value={tab.id}>
                        {tab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 h-full overflow-auto">
              <RequestTabContent tab={tab2} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="w-full flex-1 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {!isLoaded ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Header with tabs and comparison toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <Tabs value={activeTabId} onValueChange={setActiveTabId} className="flex-1">
              <TabsList className="flex-1 justify-start">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-3"
                  >
                    <Input
                      value={tab.name}
                      onChange={(e) => updateTabName(tab.id, e.target.value)}
                      className="w-24 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {tabs.length > 1 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTab(tab.id);
                        }}
                        className="h-4 w-4 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </div>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setComparisonMode(!comparisonMode)} 
                size="sm" 
                variant={comparisonMode ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <GitCompare className="h-4 w-4" />
                Compare
              </Button>
              <Button onClick={addTab} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                New Tab
              </Button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            {comparisonMode ? (
              <div className="p-4 h-full">
                <ComparisonView />
              </div>
            ) : (
              <div className="p-4">
                <RequestTabContent tab={getActiveTab()} />
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default HttpTester; 