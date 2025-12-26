# Gemini API Coding Guidelines (JavaScript/TypeScript)

> **This is the authoritative reference for Gemini API usage in this project.**

You are a Gemini API coding expert. Help me with writing code using the Gemini
API calling the official libraries and SDKs.

Please follow the following guidelines when generating code.

**Official Documentation:** [https://googleapis.github.io/js-genai/](https://googleapis.github.io/js-genai/)

## Golden Rule: Use the Correct and Current SDK

Always use the **Google Gen AI SDK** (`@google/genai`), which is the unified
standard library for all Gemini API interactions (AI Studio and Vertex AI) as of
2025. Do not use legacy libraries and SDKs.

-   **Library Name:** Google Gen AI SDK
-   **NPM Package:** `@google/genai`
-   **Legacy Libraries**: (`@google/generative-ai`, `@google-ai/generativelanguage`) are deprecated.

**Installation:**

-   **Incorrect:** `npm install @google/generative-ai`
-   **Incorrect:** `npm install @google-ai/generativelanguage`
-   **Correct:** `npm install @google/genai`

**APIs and Usage:**

-   **Incorrect:** `const { GenerativeModel } = require('@google/generative-ai')` -> **Correct:** `import { GoogleGenAI } from '@google/genai'`
-   **Incorrect:** `const model = genai.getGenerativeModel(...)` -> **Correct:** `const ai = new GoogleGenAI({apiKey: "..."})`
-   **Incorrect:** `await model.generateContent(...)` -> **Correct:** `await ai.models.generateContent(...)`
-   **Incorrect:** `await model.generateContentStream(...)` -> **Correct:** `await ai.models.generateContentStream(...)`
-   **Incorrect:** `const generationConfig = { ... }` -> **Correct:** Pass configuration directly: `config: { safetySettings: [...] }`
-   **Incorrect** `GoogleGenerativeAI`
-   **Incorrect** `google.generativeai`
-   **Incorrect** `generationConfig`
-   **Incorrect** `GoogleGenAIError` -> **Correct** `ApiError`

## Initialization and API Key

```javascript
import { GoogleGenAI } from '@google/genai';

// Best practice: implicitly use GEMINI_API_KEY env variable
const ai = new GoogleGenAI({});

// Alternative: explicit key (avoid hardcoding in production)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

## Models

**Recommended Models (Dec 2025):**

| Use Case | Model |
|----------|-------|
| General Text & Multimodal | `gemini-3-flash-preview` |
| Coding & Complex Reasoning | `gemini-3-pro-preview` |
| Low Latency & High Volume | `gemini-2.5-flash-lite` |
| Fast Image Generation | `gemini-2.5-flash-image` |
| High-Quality Image Generation | `gemini-3-pro-image-preview` |
| Video Generation | `veo-3.0-generate-001` |

**Acceptable Models (if user requests):**
- `gemini-2.0-flash`, `gemini-2.0-flash-lite`
- `gemini-2.5-flash`, `gemini-2.5-pro`

**Prohibited (deprecated):**
- ❌ `gemini-1.5-flash`
- ❌ `gemini-1.5-pro`
- ❌ `gemini-pro`

## Basic Inference

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: 'Why is the sky blue?',
});

console.log(response.text);
```

## Streaming

```javascript
const responseStream = await ai.models.generateContentStream({
  model: "gemini-3-flash-preview",
  contents: ["Write a long story about a space pirate."],
});

for await (const chunk of responseStream) {
  process.stdout.write(chunk.text);
}
```

## Chat (Multi-turn)

```javascript
const chat = ai.chats.create({model: "gemini-3-flash-preview"});

let response = await chat.sendMessage({message: "Hello!"});
console.log(response.text);

response = await chat.sendMessage({message: "What did I just say?"});
console.log(response.text);
```

## System Instructions

```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: "Explain quantum physics.",
  config: {
    systemInstruction: "You are a helpful assistant",
  }
});
```

## Thinking (Reasoning)

```javascript
// Gemini 3 - use thinkingLevel
const response = await ai.models.generateContent({
  model: "gemini-3-pro-preview",
  contents: "Solve this math problem...",
  config: {
    thinkingConfig: {
      thinkingLevel: 'HIGH', // MINIMAL, LOW, MEDIUM, HIGH
    },
  },
});

// Gemini 2.5 - use thinkingBudget
const response = await ai.models.generateContent({
  model: "gemini-2.5-pro",
  contents: "What is AI?",
  config: {
    thinkingConfig: {
      thinkingBudget: 1024 // 0 to disable, min 128 for 2.5-pro
    },
  },
});
```

## Structured Outputs (JSON Schema)

```javascript
import { GoogleGenAI, Type } from "@google/genai";

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "List cookie recipes",
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  },
});

const recipes = JSON.parse(response.text);
```

## Grounding (Google Search)

```javascript
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "What's the latest news about...",
  config: {
    tools: [{ googleSearch: {} }],
  },
});
```

## Useful Links

- [Documentation](https://ai.google.dev/gemini-api/docs)
- [API Keys](https://ai.google.dev/gemini-api/docs/api-key)
- [Models](https://ai.google.dev/models)
- [Pricing](https://ai.google.dev/pricing)
- [Rate Limits](https://ai.google.dev/rate-limits)
