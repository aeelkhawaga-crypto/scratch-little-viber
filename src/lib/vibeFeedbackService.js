const API_BASE_URL = process.env.API_BASE_URL;
const FEEDBACK_URL = `${API_BASE_URL}/feedback`;
const EXPERIMENTS_URL = `${API_BASE_URL}/experiments`;
const EXPERIMENT_URL = `${API_BASE_URL}/experiment`;

const readResponse = async response => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not access the experiment dataset.');
    return data;
};

export const saveVibeFeedback = async ({requestId, functionalCorrectness, intentAlignment, outcome, notes}) => {
    const response = await fetch(FEEDBACK_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            request_id: requestId,
            functional_correctness: functionalCorrectness,
            intent_alignment: intentAlignment,
            outcome,
            notes
        })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not save feedback.');
    return data;
};

export const loadVibeExperiments = async ({model, minutes}) => {
    const query = `model=${encodeURIComponent(model)}&minutes=${encodeURIComponent(minutes)}`;
    const data = await readResponse(await fetch(`${EXPERIMENTS_URL}?${query}`));
    return data.experiments || [];
};

export const updateVibeExperiment = async ({
    requestId,
    prompt,
    response: result,
    functionalCorrectness,
    intentAlignment,
    outcome,
    notes,
    difficulty
}) => {
    const data = await readResponse(await fetch(EXPERIMENT_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            request_id: requestId,
            prompt,
            response: result,
            functional_correctness: functionalCorrectness,
            intent_alignment: intentAlignment,
            outcome,
            notes,
            difficulty
        })
    }));
    return data.experiment;
};
