const http = require('http');
const https = require('https');
require('dotenv').config();
const {logRequest, requestId, saveFeedback} = require('./hf-telemetry');

const PORT = 3456;

const server = http.createServer((req, res) => {
    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
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
                const { token, model, messages, max_tokens, temperature, reasoning_effort } = JSON.parse(body);

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
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const providerStartedAt = Date.now();
                const proxyReq = https.request(options, proxyRes => {
                    let data = '';
                    proxyRes.on('data', chunk => { data += chunk; });
                    proxyRes.on('end', () => {
                        let responseJson = null;
                        try { responseJson = JSON.parse(data); } catch (e) { /* non-JSON error */ }
                        const promptMessage = [...(messages || [])].reverse().find(message => message.role === 'user');
                        const usage = responseJson && responseJson.usage;
                        void logRequest({
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

                proxyReq.on('error', err => {
                    void logRequest({
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
                    res.writeHead(500, { 'Content-Type': 'application/json' });
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
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 HuggingFace proxy server running at http://localhost:${PORT}`);
});
