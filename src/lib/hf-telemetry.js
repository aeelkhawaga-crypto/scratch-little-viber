const {Pool} = require('pg');
const crypto = require('crypto');

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/scratch_viber';
const pool = new Pool({connectionString, connectionTimeoutMillis: 1500});

const ensureSchema = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS hf_requests (
            request_id TEXT PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            task TEXT NOT NULL DEFAULT 'chat_completion',
            model TEXT,
            provider TEXT,
            prompt TEXT,
            messages JSONB,
            response TEXT,
            response_json JSONB,
            status TEXT NOT NULL,
            http_status INTEGER,
            latency_ms INTEGER,
            provider_latency_ms INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            usage JSONB,
            parameters JSONB,
            error TEXT
        )
    `);
    await pool.query(`
        ALTER TABLE hf_requests
            ADD COLUMN IF NOT EXISTS functional_correctness INTEGER,
            ADD COLUMN IF NOT EXISTS intent_alignment INTEGER,
            ADD COLUMN IF NOT EXISTS outcome TEXT,
            ADD COLUMN IF NOT EXISTS feedback_notes TEXT,
            ADD COLUMN IF NOT EXISTS feedback_created_at TIMESTAMPTZ
    `);
};

const schemaReady = ensureSchema().catch(error => {
    console.warn(`⚠️  Postgres telemetry unavailable: ${error.message}`);
});

const logRequest = async record => {
    try {
        await schemaReady;
        await pool.query(`
            INSERT INTO hf_requests (
                request_id, task, model, provider, prompt, messages, response,
                response_json, status, http_status, latency_ms, provider_latency_ms,
                prompt_tokens, completion_tokens, total_tokens, usage, parameters, error
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (request_id) DO NOTHING
        `, [
            record.requestId,
            record.task || 'chat_completion',
            record.model || null,
            record.provider || null,
            record.prompt || null,
            JSON.stringify(record.messages || []),
            record.response || null,
            record.responseJson ? JSON.stringify(record.responseJson) : null,
            record.status,
            record.httpStatus || null,
            record.latencyMs || null,
            record.providerLatencyMs || null,
            record.usage && record.usage.prompt_tokens || null,
            record.usage && record.usage.completion_tokens || null,
            record.usage && record.usage.total_tokens || null,
            record.usage ? JSON.stringify(record.usage) : null,
            record.parameters ? JSON.stringify(record.parameters) : null,
            record.error || null
        ]);
    } catch (error) {
        console.warn(`⚠️  Could not write Postgres telemetry: ${error.message}`);
    }
};

const requestId = () => crypto.randomUUID();

const saveFeedback = async ({requestId: id, functionalCorrectness, intentAlignment, outcome, notes}) => {
    await schemaReady;
    const result = await pool.query(`
        UPDATE hf_requests
        SET functional_correctness = $2,
            intent_alignment = $3,
            outcome = $4,
            feedback_notes = $5,
            feedback_created_at = NOW()
        WHERE request_id = $1
        RETURNING request_id
    `, [id, functionalCorrectness, intentAlignment, outcome || null, notes || null]);
    if (!result.rowCount) throw new Error('Experiment was not found.');
};

module.exports = {logRequest, requestId, saveFeedback, pool};
