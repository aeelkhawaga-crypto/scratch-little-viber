# scratch-gui

## **⚠️ NOTICE: Repository Migration to Mono-Repo ⚠️**

The Scratch Team has migrated the `scratch-gui` module into a new mono-repo,
# scratch-little-viber (Vibe Coding)

This repository is a fork of the Scratch GUI interface with a focused addition: "Little Viber" — an AI-powered
assistant that generates Scratch 3.0 XML from natural-language instructions.

The project is based on the original Scratch GUI UI components. This fork keeps the main Scratch links and
development workflow, while adding Vibe Coding features that leverage the HuggingFace Inference API.

Resources:
- Official Scratch GUI / editor: https://github.com/scratchfoundation/scratch-editor
- Original Scratch GUI package: https://www.npmjs.com/package/@scratch/scratch-gui
- This repository (fork): https://github.com/aeelkhawaga-crypto/scratch-little-viber

## What is Little Viber (Vibe Coding)?

Little Viber is a toolbox extension and modal UI in the Scratch GUI that lets you describe code changes in plain
English and have an AI produce valid Scratch 3.0 XML blocks. The flow is:

1. Click the "Little Viber" category and press "Do Magic".
2. Select an AI model from the dropdown.
3. Type your natural language prompt describing the code change you want.
4. The AI returns valid Scratch XML which you can preview and insert into the workspace.

## Key additions in this fork

- `src/components/vibe-ai-modal` — modal UI for prompts, model selection, preview and insert
- `src/lib/vibeAiService.js` — glue code to build the user payload and parse AI responses
- `src/lib/chatManager.js` — manages model selection and conversation state
- `src/lib/hf-proxy-server.js` — local proxy to route requests to HuggingFace Router (bypasses browser CORS)
- `docs/HUGGINGFACE_INTEGRATION.md` — detailed integration and setup guide

## Quick setup (developer)

Prerequisites: Node.js, npm

1. Install dependencies

```bash
cd scratch-gui
npm install
```

2. Add your HuggingFace token (recommended: fine-grained token with "Make calls to inference providers")

```bash
cp .env.example .env
# edit .env and set HF_TOKEN=hf_xxx...
```

3. Start the local proxy (required due to CORS):

```bash
node src/lib/hf-proxy-server.js
```

4. Start the GUI in development mode in a separate terminal:

```bash
npm start
```

5. Open http://localhost:8601 and use the Little Viber modal (Tools → Little Viber)

## Models

The modal contains a dropdown of models suitable for instruction/chat-style code generation. You can add models
by editing `src/components/vibe-ai-modal/vibe-ai-modal.jsx`.

## Security and tokens

- Do NOT commit tokens. This repo uses `process.env.HF_TOKEN` and provides `.env.example`.
- If a token is accidentally committed, revoke it immediately in your HuggingFace account.
- The proxy is local only; do not expose it publicly without adding server-side access controls.

## Documentation

- Detailed HuggingFace integration and API usage: `docs/HUGGINGFACE_INTEGRATION.md`

## Contributing

If you add models, improve prompts, or tweak output validation, please open a pull request. Keep in mind this is
based on the Scratch GUI codebase; changes that affect core Scratch behavior should be coordinated with the upstream
`scratch-editor` project.

## License

This fork follows the licensing of the original Scratch GUI repository. See `LICENSE` in the repository root for details.
