const FEEDBACK_URL = 'http://localhost:3456/feedback';

export async function saveVibeFeedback({requestId, functionalCorrectness, intentAlignment, outcome, notes}) {
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
}
