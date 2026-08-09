const {Pool} = require('pg');
const crypto = require('crypto');
const {getExperiment} = require('./experiment-catalog');

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/scratch_viber';
const pool = new Pool({connectionString, connectionTimeoutMillis: 1500});

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const classifyDifficulty = prompt => {
    const userRequest = String(prompt || '').split(/\nUser request:\s*/i).pop().trim().toLowerCase();
    const words = userRequest.split(/\s+/).filter(Boolean).length;
    const clauses = (userRequest.match(/\b(and|then|while|when|if|until|each|every)\b/g) || []).length;
    const actions = (userRequest.match(
        /\b(move|turn|change|set|say|play|wait|glide|show|hide|ask|create|delete|switch|increase|decrease|press|display|measure|penalise|start|pause|reset|award|report|feed|rest|attack|defend|calculate)\b/g
    ) || []).length;
    const mediumConcepts = (userRequest.match(
        /\b(variable|score|timer|time|timed|stopwatch|random|forever|continuously|repeat|loop|condition|negative|touching|collision|key|arrow|mouse|bounce|effect|costume|delay|speed)\b/g
    ) || []).length;
    const hardConcepts = (userRequest.match(
        /\b(clone|broadcast|list|custom block|recursion|multiplayer|platformer|physics|level|maze|game|inventory|enemy|enemies|state|states|cooldown|health|energy|accuracy|sequence|timing|damage|defence|hunger)\b/g
    ) || []).length;
    const score = (words > 45 ? 2 : words > 22 ? 1 : 0) +
        Math.min(clauses, 2) + Math.min(Math.max(actions - 1, 0), 2) +
        Math.min(mediumConcepts, 3) + (hardConcepts * 2);

    if (score >= 9 || hardConcepts >= 2) return 'Hard';
    if (score >= 3) return 'Medium';
    return 'Easy';
};

const backfillDifficulties = async ({reclassify = false} = {}) => {
    const result = await pool.query(`
        SELECT request_id, prompt
        FROM hf_requests
        ${reclassify ? '' : 'WHERE difficulty IS NULL'}
    `);
    const batchSize = 500;
    for (let offset = 0; offset < result.rows.length; offset += batchSize) {
        const batch = result.rows.slice(offset, offset + batchSize);
        const values = [];
        const placeholders = batch.map((row, index) => {
            values.push(row.request_id, classifyDifficulty(row.prompt));
            return `($${(index * 2) + 1}, $${(index * 2) + 2})`;
        });
        await pool.query(`
            UPDATE hf_requests AS request
            SET difficulty = classified.difficulty
            FROM (VALUES ${placeholders.join(', ')}) AS classified(request_id, difficulty)
            WHERE request.request_id = classified.request_id
        `, values);
    }
};

const backfillExperiments = async () => {
    const result = await pool.query(`
        SELECT request_id, prompt, difficulty
        FROM hf_requests
        WHERE experiment_id IS NULL
    `);
    const batchSize = 500;
    for (let offset = 0; offset < result.rows.length; offset += batchSize) {
        const batch = result.rows.slice(offset, offset + batchSize);
        const values = [];
        const placeholders = batch.map((row, index) => {
            const experiment = getExperiment(row.prompt);
            values.push(
                row.request_id,
                experiment.id,
                experiment.difficulty || row.difficulty || classifyDifficulty(row.prompt)
            );
            return `($${(index * 3) + 1}, $${(index * 3) + 2}, $${(index * 3) + 3})`;
        });
        await pool.query(`
            UPDATE hf_requests AS request
            SET experiment_id = classified.experiment_id,
                difficulty = classified.difficulty
            FROM (VALUES ${placeholders.join(', ')}) AS classified(request_id, experiment_id, difficulty)
            WHERE request.request_id = classified.request_id
        `, values);
    }
};

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
            ADD COLUMN IF NOT EXISTS feedback_created_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS difficulty TEXT,
            ADD COLUMN IF NOT EXISTS experiment_id TEXT
    `);
    await backfillDifficulties();
    await backfillExperiments();
    await pool.query('CREATE INDEX IF NOT EXISTS hf_requests_experiment_id_idx ON hf_requests (experiment_id)');
};

const schemaReady = ensureSchema().catch(error => {
    console.warn(`⚠️  Postgres telemetry unavailable: ${error.message}`);
});

const logRequest = async record => {
    try {
        await schemaReady;
        const experiment = getExperiment(record.prompt);
        await pool.query(`
            INSERT INTO hf_requests (
                request_id, task, model, provider, prompt, messages, response,
                response_json, status, http_status, latency_ms, provider_latency_ms,
                prompt_tokens, completion_tokens, total_tokens, usage, parameters, error, difficulty,
                experiment_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
            )
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
            record.error || null,
            experiment.difficulty ||
                (DIFFICULTIES.includes(record.difficulty) ? record.difficulty : classifyDifficulty(record.prompt)),
            experiment.id
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

const listExperiments = async ({model, minutes}) => {
    await schemaReady;
    const result = await pool.query(`
        SELECT request_id, created_at, model, prompt, response, status, error,
            functional_correctness, intent_alignment, outcome, feedback_notes, difficulty, experiment_id
        FROM hf_requests
        WHERE model = $1
            AND created_at >= NOW() - ($2 * INTERVAL '1 minute')
        ORDER BY created_at DESC
    `, [model, minutes]);
    return result.rows;
};

const updateExperiment = async record => {
    await schemaReady;
    const experiment = getExperiment(record.prompt);
    const result = await pool.query(`
        UPDATE hf_requests
        SET prompt = $2,
            response = $3,
            functional_correctness = $4,
            intent_alignment = $5,
            outcome = $6,
            feedback_notes = $7,
            difficulty = $8,
            experiment_id = $9,
            feedback_created_at = NOW()
        WHERE request_id = $1
        RETURNING request_id, created_at, model, prompt, response, status, error,
            functional_correctness, intent_alignment, outcome, feedback_notes, difficulty, experiment_id
    `, [
        record.requestId,
        record.prompt,
        record.response,
        record.functionalCorrectness,
        record.intentAlignment,
        record.outcome || null,
        record.notes || null,
        experiment.difficulty ||
            (DIFFICULTIES.includes(record.difficulty) ? record.difficulty : classifyDifficulty(record.prompt)),
        experiment.id
    ]);
    if (!result.rowCount) throw new Error('Experiment was not found.');
    return result.rows[0];
};

module.exports = {
    logRequest,
    requestId,
    saveFeedback,
    listExperiments,
    updateExperiment,
    classifyDifficulty,
    backfillDifficulties,
    backfillExperiments,
    schemaReady,
    pool
};
