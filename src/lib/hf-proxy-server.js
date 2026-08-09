const http = require('http');
const https = require('https');
require('dotenv').config();
const {logRequest, requestId, saveFeedback, listExperiments, updateExperiment} = require('./hf-telemetry');

const PORT = Number(process.env.PORT || 3456);
const HOST = process.env.HOST || '127.0.0.1';
const HF_TOKEN = process.env.HF_TOKEN || '';
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const ALLOWED_ORIGINS = new Set(
    String(process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
);
const ALLOWED_MODELS = new Set([
    'meta-llama/Llama-3.3-70B-Instruct:groq',
    'Qwen/Qwen3-Next-80B-A3B-Instruct:novita',
    'moonshotai/Kimi-K3:together',
    'deepseek-ai/DeepSeek-V4-Flash-0731:novita',
    'google/gemma-4-31B-it:novita',
    'openai/gpt-oss-120b:groq'
]);

const server = http.createServer((req, res) => {
    // Handle CORS preflight
    const origin = req.headers.origin;
    if (origin && (LOCAL_ORIGIN.test(origin) || ALLOWED_ORIGINS.has(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ok: true}));
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/experiments?')) {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const model = url.searchParams.get('model');
        const minutes = Number(url.searchParams.get('minutes'));
        if (!model || !Number.isSafeInteger(minutes) || minutes < 1) {
            res.writeHead(400, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Choose a model and a positive whole-number time window.'}));
            return;
        }
        void listExperiments({model, minutes}).then(experiments => {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({experiments}));
        }).catch(err => {
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: err.message}));
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/experiment') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const record = JSON.parse(body);
                const functionalCorrectness = Number(record.functional_correctness);
                const intentAlignment = Number(record.intent_alignment);
                if (!record.request_id || !Number.isInteger(functionalCorrectness) ||
                    functionalCorrectness < 1 || functionalCorrectness > 5 ||
                    !Number.isInteger(intentAlignment) || intentAlignment < 1 || intentAlignment > 5) {
                    throw new Error('An experiment and ratings from 1 to 5 are required.');
                }
                const updated = await updateExperiment({
                    requestId: record.request_id,
                    prompt: typeof record.prompt === 'string' ? record.prompt : '',
                    response: typeof record.response === 'string' ? record.response : '',
                    functionalCorrectness,
                    intentAlignment,
                    outcome: record.outcome,
                    notes: record.notes,
                    difficulty: record.difficulty
                });
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({experiment: updated}));
            } catch (err) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: err.message}));
            }
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/feedback') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const feedback = JSON.parse(body);
                const functionalCorrectness = Number(feedback.functional_correctness);
                const intentAlignment = Number(feedback.intent_alignment);
                if (!feedback.request_id || !Number.isInteger(functionalCorrectness) ||
                    functionalCorrectness < 1 || functionalCorrectness > 5 ||
                    !Number.isInteger(intentAlignment) || intentAlignment < 1 || intentAlignment > 5) {
                    throw new Error('Feedback requires ratings from 1 to 5.');
                }
                await saveFeedback({
                    requestId: feedback.request_id,
                    functionalCorrectness,
                    intentAlignment,
                    outcome: feedback.outcome,
                    notes: feedback.notes
                });
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ok: true}));
            } catch (err) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: err.message}));
            }
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/chat') {
        const startedAt = Date.now();
        const id = requestId();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const {model, messages, max_tokens, temperature, reasoning_effort} = JSON.parse(body);
                if (!HF_TOKEN) {
                    res.writeHead(503, {'Content-Type': 'application/json', 'X-Request-ID': id});
                    res.end(JSON.stringify({error: 'The server Hugging Face token is not configured.'}));
                    return;
                }
                if (!ALLOWED_MODELS.has(model)) {
                    res.writeHead(400, {'Content-Type': 'application/json', 'X-Request-ID': id});
                    res.end(JSON.stringify({error: 'The requested model is not part of this experiment.'}));
                    return;
                }

                const requestPayload = {
                    model,
                    messages,
                    max_tokens: max_tokens || 2048,
                    temperature: temperature || 0.7,
                    stream: false
                };
                if (reasoning_effort) requestPayload.reasoning_effort = reasoning_effort;
                const postData = JSON.stringify(requestPayload);

                const options = {
                    hostname: 'router.huggingface.co',
                    path: '/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${HF_TOKEN}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const providerStartedAt = Date.now();
                const proxyReq = https.request(options, proxyRes => {
                    let data = '';
                    proxyRes.on('data', chunk => { data += chunk; });
                    proxyRes.on('end', async () => {
                        let responseJson = null;
                        try { responseJson = JSON.parse(data); } catch (e) { /* non-JSON error */ }
                        const promptMessage = [...(messages || [])].reverse().find(message => message.role === 'user');
                        const usage = responseJson && responseJson.usage;
                        await logRequest({
                            requestId: id,
                            model,
                            provider: responseJson && responseJson.provider,
                            prompt: promptMessage && promptMessage.content,
                            messages,
                            response: responseJson && responseJson.choices && responseJson.choices[0] &&
                                responseJson.choices[0].message && responseJson.choices[0].message.content,
                            responseJson,
                            status: proxyRes.statusCode >= 200 && proxyRes.statusCode < 300 ? 'success' : 'error',
                            httpStatus: proxyRes.statusCode,
                            latencyMs: Date.now() - startedAt,
                            providerLatencyMs: Date.now() - providerStartedAt,
                            usage,
                            parameters: {max_tokens, temperature, reasoning_effort}
                        });
                        res.writeHead(proxyRes.statusCode, {
                            'Content-Type': 'application/json',
                            'X-Request-ID': id,
                            'Access-Control-Expose-Headers': 'X-Request-ID'
                        });
                        res.end(data);
                    });
                });

                proxyReq.on('error', async err => {
                    await logRequest({
                        requestId: id,
                        model,
                        prompt: messages && [...messages].reverse().find(message => message.role === 'user')?.content,
                        messages,
                        status: 'error',
                        httpStatus: 502,
                        latencyMs: Date.now() - startedAt,
                        error: err.message,
                        parameters: {max_tokens, temperature, reasoning_effort}
                    });
                    res.writeHead(500, {
                        'Content-Type': 'application/json',
                        'X-Request-ID': id,
                        'Access-Control-Expose-Headers': 'X-Request-ID'
                    });
                    res.end(JSON.stringify({ error: err.message }));
                });

                proxyReq.write(postData);
                proxyReq.end();
            } catch (err) {
                void logRequest({
                    requestId: id,
                    status: 'error',
                    httpStatus: 400,
                    latencyMs: Date.now() - startedAt,
                    error: err.message
                });
                res.writeHead(400, {
                    'Content-Type': 'application/json',
                    'X-Request-ID': id,
                    'Access-Control-Expose-Headers': 'X-Request-ID'
                });
                res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 HuggingFace proxy server running at http://${HOST}:${PORT}`);
});
