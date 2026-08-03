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
    error TEXT,
    functional_correctness INTEGER,
    intent_alignment INTEGER,
    outcome TEXT,
    feedback_notes TEXT,
    feedback_created_at TIMESTAMPTZ
);

ALTER TABLE hf_requests
    ADD COLUMN IF NOT EXISTS functional_correctness INTEGER,
    ADD COLUMN IF NOT EXISTS intent_alignment INTEGER,
    ADD COLUMN IF NOT EXISTS outcome TEXT,
    ADD COLUMN IF NOT EXISTS feedback_notes TEXT,
    ADD COLUMN IF NOT EXISTS feedback_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS hf_requests_created_at_idx ON hf_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS hf_requests_model_idx ON hf_requests (model);
CREATE INDEX IF NOT EXISTS hf_requests_status_idx ON hf_requests (status);
