// Example 1: Basic JSON with different data types
export const basicJson = {
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
export const arrayOfArraysJson = {
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
export const apiResponseJson = {
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
