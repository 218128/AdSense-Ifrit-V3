# Gemini API Reference - Ifrit Implementation Guide

Comprehensive guide based on official Google documentation and SDK reference.

---

## 1. SDK Installation & Setup

### Package
```bash
npm install @google/genai
```

> [!CAUTION]
> **DEPRECATED packages - DO NOT USE:**
> - `@google/generative-ai` (old)
> - `@google-ai/generativelanguage` (old)

### Initialization
```typescript
import { GoogleGenAI } from '@google/genai';

// With explicit API key
const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

// With environment variable (GOOGLE_API_KEY or GEMINI_API_KEY)
const ai = new GoogleGenAI({});
```

---

## 2. Core API Methods

### GoogleGenAI Submodules

| Submodule | Purpose | Key Methods |
|-----------|---------|-------------|
| `ai.models` | Text/content generation | `generateContent()`, `generateContentStream()` |
| `ai.chats` | Multi-turn conversations | `create()`, `sendMessage()` |
| `ai.interactions` | **NEW** Unified API (Preview) | `create()`, `get()` |
| `ai.files` | File upload/management | `upload()`, `delete()` |
| `ai.live` | Real-time audio/video | `connect()` |
| `ai.caches` | Context caching | `create()`, `get()` |

---

## 3. Text Generation

### Basic Generation
```typescript
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Write a poem about coffee.',
});
console.log(response.text);
```

### Streaming
```typescript
const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: 'Explain quantum physics.',
});

for await (const chunk of stream) {
    process.stdout.write(chunk.text);
}
```

### With Configuration
```typescript
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Summarize this article...',
    config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        systemInstruction: 'You are a helpful assistant.',
    },
});
```

---

## 4. Image Generation (CRITICAL FIX NEEDED)

### Method 1: Interactions API (Recommended)
```typescript
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const ai = new GoogleGenAI({ apiKey: 'YOUR_KEY' });

const interaction = await ai.interactions.create({
    model: 'gemini-3-pro-image-preview',  // or 'gemini-2.5-flash-image'
    input: 'Generate an image of a futuristic city.',
    response_modalities: ['IMAGE'],  // REQUIRED for image output
});

for (const output of interaction.outputs) {
    if (output.type === 'image') {
        // output.data is base64 encoded
        // output.mime_type is 'image/png' or similar
        const imageBuffer = Buffer.from(output.data, 'base64');
        fs.writeFileSync('output.png', imageBuffer);
    }
}
```

### Method 2: models.generateContent (Text + Image)
```typescript
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: 'Create a picture of a mountain landscape',
    config: {
        responseModalities: ['IMAGE', 'TEXT'],
    },
});

// Response parts may include both text and image
for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
        // Base64 image data
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    } else if (part.text) {
        console.log(part.text);
    }
}
```

### Image Generation Models

| Model | Use Case | Speed |
|-------|----------|-------|
| `gemini-2.5-flash-image` | Fast generation, editing | Fast |
| `gemini-3-pro-image-preview` | High quality, grounded | Slower |

> [!IMPORTANT]
> - Image generation requires `response_modalities: ['IMAGE']`
> - Output is base64 encoded, NOT a URL
> - User selects model in settings (no hardcoding)

---

## 5. Chat (Multi-turn)

```typescript
const chat = ai.chats.create({ model: 'gemini-2.5-flash' });

// First message
let response = await chat.sendMessage({ message: 'Hello!' });
console.log(response.text);

// Second message (maintains context)
response = await chat.sendMessage({ message: 'What did I just say?' });
console.log(response.text);

// Access history
const history = await chat.getHistory();
```

---

## 6. Interactions API (Preview)

The new unified API for complex interactions.

### Basic Interaction
```typescript
const interaction = await ai.interactions.create({
    model: 'gemini-3-flash-preview',
    input: 'Hello!',
});
console.log(interaction.outputs[0].text);
```

### Stateful Conversation
```typescript
// Turn 1
const turn1 = await ai.interactions.create({
    model: 'gemini-3-flash-preview',
    input: 'My name is John.',
});

// Turn 2 (references previous)
const turn2 = await ai.interactions.create({
    model: 'gemini-3-flash-preview',
    input: 'What is my name?',
    previous_interaction_id: turn1.id,  // Server-side state
});
```

### Streaming with Interactions
```typescript
const stream = await ai.interactions.create({
    model: 'gemini-3-flash-preview',
    input: 'Write a story.',
    stream: true,
});

for await (const chunk of stream) {
    if (chunk.event_type === 'content.delta') {
        if (chunk.delta.type === 'text') {
            process.stdout.write(chunk.delta.text);
        }
    }
}
```

### Deep Research Agent
```typescript
const research = await ai.interactions.create({
    input: 'Research the latest AI trends.',
    agent: 'deep-research-pro-preview-12-2025',
    background: true,  // Long-running task
});

// Poll for completion
let status;
do {
    await sleep(10000);
    const result = await ai.interactions.get(research.id);
    status = result.status;
} while (status !== 'completed' && status !== 'failed');
```

---

## 7. Multimodal Input

### Image Input
```typescript
const interaction = await ai.interactions.create({
    model: 'gemini-3-flash-preview',
    input: [
        { type: 'text', text: 'Describe this image.' },
        { type: 'image', data: base64ImageData, mime_type: 'image/png' },
    ],
});
```

### Audio Input
```typescript
const interaction = await ai.interactions.create({
    model: 'gemini-3-flash-preview',
    input: [
        { type: 'text', text: 'Transcribe this audio.' },
        { type: 'audio', data: base64AudioData, mime_type: 'audio/wav' },
    ],
});
```

### Video/PDF Input
```typescript
// Video
{ type: 'video', data: base64Video, mime_type: 'video/mp4' }

// PDF
{ type: 'document', data: base64Pdf, mime_type: 'application/pdf' }
```

---

## 8. Error Handling

```typescript
import { ApiError } from '@google/genai';

try {
    const response = await ai.models.generateContent({...});
} catch (error) {
    if (error instanceof ApiError) {
        console.error('API Error:', error.message);
        console.error('Status:', error.status);  // HTTP status code
        
        if (error.status === 429) {
            // Rate limited - rotate key or wait
        }
    }
}
```

---

## 9. Available Models

### Text/Reasoning
| Model | Best For |
|-------|----------|
| `gemini-3-pro-preview` | Complex reasoning, multimodal |
| `gemini-3-flash-preview` | Fast, cost-effective |
| `gemini-2.5-pro` | Coding, complex reasoning |
| `gemini-2.5-flash` | Balanced performance |
| `gemini-2.5-flash-lite` | High volume, lowest cost |

### Image Generation
| Model | Best For |
|-------|----------|
| `gemini-2.5-flash-image` | Fast generation, editing |
| `gemini-3-pro-image-preview` | High quality, grounded |

### Agents
| Model | Best For |
|-------|----------|
| `deep-research-pro-preview-12-2025` | Deep research tasks |

---

## 10. Ifrit Implementation Fixes

### Current Issues

1. **Image generation uses wrong method**
   - Current: `executeProviderDirect` → `provider.chat()`
   - Should: Use `ai.interactions.create()` or `ai.models.generateContent()` with `responseModalities`

2. **Missing response_modalities**
   - Image generation requires explicit `response_modalities: ['IMAGE']`

3. **Model selection hardcoded**
   - User should select model in settings
   - App should list available models after key validation

### Fix Pattern for Image Generation Handler

```typescript
// lib/ai/handlers/geminiImageHandler.ts
export async function generateImage(
    apiKey: string,
    prompt: string,
    model: string  // User-selected model
): Promise<{ success: boolean; imageData?: string; mimeType?: string; error?: string }> {
    const ai = new GoogleGenAI({ apiKey });

    try {
        const interaction = await ai.interactions.create({
            model: model || 'gemini-2.5-flash-image',
            input: prompt,
            response_modalities: ['IMAGE'],
        });

        for (const output of interaction.outputs || []) {
            if (output.type === 'image') {
                return {
                    success: true,
                    imageData: output.data,  // base64
                    mimeType: output.mime_type,
                };
            }
        }

        return { success: false, error: 'No image in response' };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}
```

### Key Flow Pattern
```
User Settings → Model Selection → Handler receives model → API call with model
```

---

## 11. Quick Reference

| Task | Method | Model |
|------|--------|-------|
| Text generation | `ai.models.generateContent()` | gemini-2.5-flash |
| Streaming text | `ai.models.generateContentStream()` | gemini-2.5-flash |
| Chat | `ai.chats.create()` | gemini-2.5-flash |
| Image generation | `ai.interactions.create()` + `response_modalities` | gemini-2.5-flash-image |
| Image understanding | `ai.interactions.create()` + image input | gemini-3-flash-preview |
| Research | `ai.interactions.create()` + agent | deep-research-pro |
