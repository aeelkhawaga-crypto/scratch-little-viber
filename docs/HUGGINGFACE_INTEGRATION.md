# HuggingFace Integration Guide

This document describes the integration of HuggingFace Inference API with Little Viber, the AI-powered code generation feature in Scratch GUI.

## Overview

Little Viber uses HuggingFace's Inference API to convert natural language instructions into Scratch 3.0 XML blocks. Users can describe what they want their Scratch project to do, and the AI generates the corresponding code blocks.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Scratch GUI (Browser)                     │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │ Vibe Modal  │───▶│ vibeAiService│───▶│   chatManager     │   │
│  │  (UI)       │    │              │    │                   │   │
│  └─────────────┘    └──────────────┘    └─────────┬─────────┘   │
│                                                    │             │
└────────────────────────────────────────────────────┼─────────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  Proxy Server       │
                                          │  (localhost:3456)   │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  HuggingFace API    │
                                          │  router.huggingface │
                                          │  .co                │
                                          └─────────────────────┘
```

## Components

### 1. Configuration (`src/config.js`)

Contains the HuggingFace settings:

```javascript
const config = {
  huggingFaceToken: process.env.HF_TOKEN || '',
  huggingFaceModel: 'meta-llama/Llama-3.2-3B-Instruct',
  systemInstruction: `...` // AI system prompt for Scratch XML generation
};
```

**Configuration Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `huggingFaceToken` | Your HuggingFace API token | `''` (from env) |
| `huggingFaceModel` | Default model to use | `meta-llama/Llama-3.2-3B-Instruct` |
| `systemInstruction` | System prompt that instructs the AI how to generate Scratch XML | See config.js |

### 2. Chat Manager (`src/lib/chatManager.js`)

Manages the connection to HuggingFace API and maintains conversation history.

**Key Methods:**

```javascript
// Initialize or get existing chat session
getChat({ key, model, systemInstruction })

// Send a message and get AI response
async sendMessage({ message })

// Reset the conversation
reset()
```

**Features:**
- Maintains conversation history for context-aware responses
- Supports model switching on-the-fly
- Handles authentication via Bearer token
- Uses local proxy server to bypass CORS restrictions

### 3. Vibe AI Service (`src/lib/vibeAiService.js`)

High-level service for generating Scratch XML from natural language.

```javascript
export async function generateVibeXml({
  prompt,      // User's natural language request
  currentXml,  // Current workspace XML (context)
  model        // Selected AI model
})
```

**Response Processing:**
- Strips markdown code fences from AI responses
- Extracts clean XML content
- Handles various response formats

### 4. Proxy Server (`src/lib/hf-proxy-server.js`)

A local Node.js server that proxies requests to HuggingFace API to bypass browser CORS restrictions.

**Endpoint:** `POST http://localhost:3456/chat`

**Request Body:**
```json
{
  "token": "hf_xxx...",
  "model": "meta-llama/Llama-3.2-3B-Instruct",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "max_tokens": 4096,
  "temperature": 0.7
}
```

**Response:** Proxied response from HuggingFace API

### 5. UI Component (`src/components/vibe-ai-modal/vibe-ai-modal.jsx`)

The modal interface for AI code generation.

**Features:**
- Model selection dropdown with popular code-capable models
- Prompt input area
- XML output preview
- Live blocks preview
- Error display
- Loading state with animation

**Available Models:**
| Model ID | Display Name |
|----------|--------------|
| `meta-llama/Llama-3.2-3B-Instruct` | Llama 3.2 3B Instruct |
| `meta-llama/Llama-3.1-8B-Instruct` | Llama 3.1 8B Instruct |
| `meta-llama/Llama-3.1-70B-Instruct` | Llama 3.1 70B Instruct |
| `mistralai/Mistral-7B-Instruct-v0.3` | Mistral 7B Instruct v0.3 |
| `mistralai/Mixtral-8x7B-Instruct-v0.1` | Mixtral 8x7B Instruct |
| `Qwen/Qwen2.5-72B-Instruct` | Qwen 2.5 72B Instruct |
| `Qwen/Qwen2.5-Coder-32B-Instruct` | Qwen 2.5 Coder 32B |
| `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B` | DeepSeek R1 Distill 32B |
| `microsoft/Phi-3-mini-4k-instruct` | Phi-3 Mini 4K Instruct |

## Setup Instructions

### 1. Get a HuggingFace Token

1. Create an account at [huggingface.co](https://huggingface.co)
2. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
3. Click **"Create new token"**
4. Select **"Fine-grained"** token type
5. Enable the permission: **"Make calls to inference providers"**
6. Click **Create token** and copy it

### 2. Configure Environment

Create a `.env` file in the `scratch-gui` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your token:

```
HF_TOKEN=hf_your_token_here
```

### 3. Start the Proxy Server

The proxy server is required to bypass CORS restrictions:

```bash
# In the scratch-gui directory
node src/lib/hf-proxy-server.js
```

You should see:
```
🚀 HuggingFace proxy server running at http://localhost:3456
```

### 4. Start Scratch GUI

In a separate terminal:

```bash
npm start
```

### 5. Accept Model Licenses (if required)

Some models (like Llama) require you to accept their license:

1. Visit the model page on HuggingFace (e.g., [meta-llama/Llama-3.2-3B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct))
2. Click **"Agree and access repository"**
3. Wait for approval (usually instant for Llama models)

## Usage

1. Open Scratch GUI in your browser
2. Click the **"Little Viber"** category in the block palette
3. Click the **"Do Magic"** button
4. In the modal:
   - Select an AI model from the dropdown
   - Type your request (e.g., "Make the cat move 10 steps when green flag clicked")
   - Click **"Scoopy Doo"** to generate
5. Review the generated XML and blocks preview
6. Click **"Insert Code"** to add blocks to your workspace

## Troubleshooting

### Error: "Failed to fetch"
- **Cause:** Proxy server not running or CORS issue
- **Solution:** Start the proxy server with `node src/lib/hf-proxy-server.js`

### Error: "Missing huggingFaceToken in config"
- **Cause:** Token not configured
- **Solution:** Create `.env` file with `HF_TOKEN=your_token`

### Error: "HTTP 401 Unauthorized"
- **Cause:** Invalid or expired token
- **Solution:** Generate a new token on HuggingFace

### Error: "HTTP 403 Forbidden" or "Insufficient permissions"
- **Cause:** Token lacks "Make calls to inference providers" permission
- **Solution:** Create a new Fine-grained token with the correct permission

### Error: "HTTP 404 Not Found"
- **Cause:** Model not available or incorrect model ID
- **Solution:** Check the model exists on HuggingFace and is available for inference

### Error: "Model requires Pro subscription"
- **Cause:** Some large models require HuggingFace Pro
- **Solution:** Use a smaller model or upgrade your HuggingFace plan

## API Reference

### HuggingFace Router API

**Endpoint:** `https://router.huggingface.co/v1/chat/completions`

**Method:** POST

**Headers:**
```
Authorization: Bearer <HF_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "model": "meta-llama/Llama-3.2-3B-Instruct",
  "messages": [
    {
      "role": "system",
      "content": "You are an engine that converts natural-language instructions into Scratch 3.0 XML..."
    },
    {
      "role": "user",
      "content": "{\"prompt\": \"<current xml>\", \"request\": \"user's request\"}"
    }
  ],
  "max_tokens": 4096,
  "temperature": 0.7,
  "stream": false
}
```

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "<xml>...</xml>"
      }
    }
  ]
}
```

## Security Considerations

1. **Never commit tokens to Git** - Use environment variables
2. **Revoke exposed tokens immediately** - If a token is accidentally committed, revoke it on HuggingFace
3. **Use Fine-grained tokens** - Only grant necessary permissions
4. **Proxy server** - The proxy only runs locally and doesn't expose your token to the browser

## Contributing

When adding new models to the dropdown:

1. Edit `src/components/vibe-ai-modal/vibe-ai-modal.jsx`
2. Add the model to the `AVAILABLE_MODELS` array:
   ```javascript
   { id: 'owner/model-name', name: 'Display Name' }
   ```
3. Test that the model works with the Inference API

## License

This integration is part of the Scratch GUI project. See the main LICENSE file for details.
