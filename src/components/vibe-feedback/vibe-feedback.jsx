/* eslint-disable react/jsx-handler-names, react/jsx-max-props-per-line, react/jsx-no-bind, react/jsx-no-literals */
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import {
    loadVibeExperiments,
    saveVibeFeedback,
    updateVibeExperiment
} from '../../lib/vibeFeedbackService';
import VIBE_MODELS from '../../lib/vibeModels';
import styles from './vibe-feedback.css';

const RUBRICS = {
    functional: {
        title: 'Functional correctness',
        criteria: [
            'Does not run or cannot be imported.',
            'Imports, but major behavior is broken.',
            'Partially works with noticeable bugs.',
            'Works with only minor issues.',
            'Runs reliably and all requested behavior works.'
        ]
    },
    intent: {
        title: 'Intent alignment',
        criteria: [
            'Misunderstands the request.',
            'Captures only a small part of the intent.',
            'Generally follows the request but misses details.',
            'Closely matches the intended behavior.',
            'Precisely matches the request and constraints.'
        ]
    }
};

class VibeFeedback extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            open: false,
            model: props.model || '',
            minutes: 30,
            records: [],
            selectedRequestId: '',
            selectedExperimentId: '',
            prompt: '',
            response: '',
            difficulty: 'Easy',
            functionalCorrectness: 5,
            intentAlignment: 5,
            outcome: 'Worked',
            notes: '',
            loadingRecords: false,
            saving: false,
            error: '',
            saved: false,
            inserted: false
        };
    }

    open = () => {
        this.setState({
            open: true,
            model: this.props.model || this.state.model,
            error: '',
            saved: false,
            inserted: false
        }, this.loadDataset);
    };
    close = () => this.setState({open: false});
    selectCriterion = (dimension, value, event) => {
        if (event.target.checked) this.setState({[dimension]: value});
    };
    selectRecord = record => {
        this.setState({
            selectedRequestId: record.request_id,
            selectedExperimentId: record.experiment_id || '',
            prompt: record.prompt || '',
            response: record.response || '',
            difficulty: record.difficulty || 'Easy',
            functionalCorrectness: record.functional_correctness || 5,
            intentAlignment: record.intent_alignment || 5,
            outcome: record.outcome || (record.status === 'success' ? 'Worked' : 'Did not work'),
            notes: record.feedback_notes || '',
            error: '',
            saved: false,
            inserted: false
        });
    };
    loadDataset = async () => {
        const {model, minutes} = this.state;
        if (!model) return;
        this.setState({loadingRecords: true, error: '', saved: false});
        try {
            const records = await loadVibeExperiments({model, minutes});
            this.setState({records, loadingRecords: false});
            const preferredId = this.props.requestId || this.state.selectedRequestId;
            const selected = records.find(record => record.request_id === preferredId) || records[0];
            if (selected) {
                this.selectRecord(selected);
            } else {
                this.setState({
                    selectedRequestId: '',
                    selectedExperimentId: '',
                    prompt: '',
                    response: '',
                    error: 'No experiments found for this model in that time window.'
                });
            }
        } catch (error) {
            this.setState({loadingRecords: false, error: error.message});
        }
    };
    save = async event => {
        event.preventDefault();
        const requestId = this.state.selectedRequestId || this.props.requestId;
        if (!requestId) {
            this.setState({error: 'Select an experiment before saving feedback.'});
            return;
        }
        this.setState({saving: true, error: '', saved: false});
        const feedback = {
            requestId,
            functionalCorrectness: this.state.functionalCorrectness,
            intentAlignment: this.state.intentAlignment,
            outcome: this.state.outcome,
            notes: this.state.notes,
            difficulty: this.state.difficulty
        };
        try {
            if (this.state.selectedRequestId) {
                const updated = await updateVibeExperiment({
                    ...feedback,
                    prompt: this.state.prompt,
                    response: this.state.response
                });
                this.setState(state => ({
                    records: state.records.map(record => (
                        record.request_id === updated.request_id ? updated : record
                    ))
                }));
            } else {
                await saveVibeFeedback(feedback);
            }
            this.setState({saving: false, saved: true});
        } catch (error) {
            this.setState({saving: false, error: error.message});
        }
    };
    insertCode = () => {
        const {selectedRequestId, response} = this.state;
        if (!selectedRequestId) {
            this.setState({error: 'Select an experiment before inserting code.', inserted: false});
            return;
        }
        if (!response.trim()) {
            this.setState({error: 'The selected experiment has no code to insert.', inserted: false});
            return;
        }
        const inserted = this.props.onInsert(response);
        this.setState({
            error: inserted ? '' : 'Could not insert this result. Check that it contains valid Scratch XML.',
            inserted
        });
    };

    render () {
        const {
            open, model, minutes, records, selectedRequestId, selectedExperimentId,
            prompt, response, difficulty,
            functionalCorrectness, intentAlignment, outcome, notes, loadingRecords,
            saving, error, saved, inserted
        } = this.state;
        const scores = {functional: functionalCorrectness, intent: intentAlignment};
        const modelChoices = VIBE_MODELS;
        const selectedRecordSummary = selectedRequestId ?
            ` · Experiment ${selectedExperimentId || 'Uncatalogued'} · Request ${selectedRequestId}` : '';
        return (
            <React.Fragment>
                <button
                    className={this.props.inline ? styles.feedbackInline : styles.feedbackTrigger}
                    type="button"
                    onClick={this.open}
                >
                    Submit feedback
                </button>
                {open ? (
                    <Modal
                        id="vibeFeedbackModal"
                        className={styles.feedbackModal}
                        contentLabel="Manage Viber experiment dataset"
                        fullScreen
                        onRequestClose={this.close}
                    >
                        <div className={styles.feedbackLayout}>
                            <form className={styles.feedbackBody} onSubmit={this.save}>
                                <h2>Experiment dataset</h2>
                                <div className={styles.filters}>
                                    <label htmlFor="vibeDatasetModel">
                                        Model
                                        <select
                                            id="vibeDatasetModel"
                                            value={model}
                                            onChange={event => this.setState({model: event.target.value})}
                                        >
                                            {modelChoices.map(option => (
                                                <option key={option.id} value={option.id}>{option.name}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label htmlFor="vibeDatasetMinutes">
                                        Last X minutes
                                        <input
                                            id="vibeDatasetMinutes"
                                            type="number"
                                            min="1"
                                            value={minutes}
                                            onChange={event => this.setState({minutes: Number(event.target.value)})}
                                        />
                                    </label>
                                    <button type="button" onClick={this.loadDataset} disabled={loadingRecords}>
                                        {loadingRecords ? 'Loading…' : 'Load results'}
                                    </button>
                                </div>
                                <div className={styles.recordSummary} data-testid="vibeRecordSummary">
                                    {records.length} experiment{records.length === 1 ? '' : 's'} loaded
                                    {selectedRecordSummary}
                                </div>
                                <label htmlFor="vibeDatasetPrompt">Prompt</label>
                                <textarea
                                    id="vibeDatasetPrompt"
                                    value={prompt}
                                    onChange={event => this.setState({prompt: event.target.value})}
                                    placeholder="Select a recorded experiment to edit its prompt."
                                />
                                <label htmlFor="vibeDatasetResponse">Model result</label>
                                <textarea
                                    id="vibeDatasetResponse"
                                    className={styles.responseEditor}
                                    value={response}
                                    onChange={event => this.setState({response: event.target.value})}
                                    placeholder="The raw model result, including unusable output, appears here."
                                />
                                <div className={styles.scoreFields}>
                                    <label htmlFor="vibeFunctionalCorrectness">
                                        Functional correctness
                                        <select
                                            id="vibeFunctionalCorrectness"
                                            value={functionalCorrectness}
                                            onChange={event => this.setState({
                                                functionalCorrectness: Number(event.target.value)
                                            })}
                                        >
                                            {[1, 2, 3, 4, 5].map(value => (
                                                <option key={value} value={value}>{value} / 5</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label htmlFor="vibeIntentAlignment">
                                        Intent alignment
                                        <select
                                            id="vibeIntentAlignment"
                                            value={intentAlignment}
                                            onChange={event => this.setState({
                                                intentAlignment: Number(event.target.value)
                                            })}
                                        >
                                            {[1, 2, 3, 4, 5].map(value => (
                                                <option key={value} value={value}>{value} / 5</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label htmlFor="vibeOutcome">
                                        Outcome
                                        <select
                                            id="vibeOutcome"
                                            value={outcome}
                                            onChange={event => this.setState({outcome: event.target.value})}
                                        >
                                            <option>Worked</option>
                                            <option>Partially worked</option>
                                            <option>Did not work</option>
                                        </select>
                                    </label>
                                    <label htmlFor="vibeDifficulty">
                                        Difficulty
                                        <select
                                            id="vibeDifficulty"
                                            value={difficulty}
                                            onChange={event => this.setState({difficulty: event.target.value})}
                                        >
                                            <option>Easy</option>
                                            <option>Medium</option>
                                            <option>Hard</option>
                                        </select>
                                    </label>
                                </div>
                                <label htmlFor="vibeFeedbackNotes">Notes (optional)</label>
                                <textarea
                                    id="vibeFeedbackNotes"
                                    value={notes}
                                    onChange={event => this.setState({notes: event.target.value})}
                                    placeholder="What worked or needs improvement?"
                                />
                                {error ? <div className={styles.error}>{error}</div> : null}
                                {saved ? <div className={styles.saved}>Dataset changes and feedback saved.</div> : null}
                                {inserted ? <div className={styles.saved}>Code inserted into Scratch.</div> : null}
                                <div className={styles.actions}>
                                    <button type="button" onClick={this.close}>Close</button>
                                    <button
                                        type="button"
                                        onClick={this.insertCode}
                                        disabled={!selectedRequestId || !response.trim()}
                                    >
                                        Insert code into Scratch
                                    </button>
                                    <button type="submit" disabled={saving || !selectedRequestId}>
                                        {saving ? 'Saving…' : 'Save changes & feedback'}
                                    </button>
                                </div>
                            </form>
                            <aside className={styles.criteriaPanel}>
                                <h3>Loaded experiments</h3>
                                <div className={styles.recordList} data-testid="vibeRecordList">
                                    {records.map(record => (
                                        <button
                                            key={record.request_id}
                                            type="button"
                                            className={record.request_id === selectedRequestId ?
                                                styles.selectedRecord : ''}
                                            onClick={() => this.selectRecord(record)}
                                        >
                                            <strong>
                                                Experiment {record.experiment_id || 'Uncatalogued'}
                                                {' · '}{new Date(record.created_at).toLocaleString()}
                                            </strong>
                                            <span>
                                                <b className={styles.difficulty}>{record.difficulty || 'Easy'}</b>
                                                {' · '}{record.status}{record.error ? ` · ${record.error}` : ''}
                                            </span>
                                            <span>{(record.prompt || '(empty prompt)').slice(0, 100)}</span>
                                        </button>
                                    ))}
                                </div>
                                <h3 className={styles.guideTitle}>Scoring guide</h3>
                                {Object.keys(RUBRICS).map(dimension => (
                                    <section key={dimension}>
                                        <h4>{RUBRICS[dimension].title} <span>{scores[dimension]}/5</span></h4>
                                        {RUBRICS[dimension].criteria.map((criterion, index) => {
                                            const value = index + 1;
                                            return (
                                                <label key={criterion} className={styles.criterion}>
                                                    <input
                                                        type="checkbox"
                                                        checked={scores[dimension] === value}
                                                        onChange={event => this.selectCriterion(
                                                            dimension === 'functional' ?
                                                                'functionalCorrectness' : 'intentAlignment',
                                                            value,
                                                            event
                                                        )}
                                                    />
                                                    <span><strong>{value}.</strong> {criterion}</span>
                                                </label>
                                            );
                                        })}
                                    </section>
                                ))}
                            </aside>
                        </div>
                    </Modal>
                ) : null}
            </React.Fragment>
        );
    }
}

VibeFeedback.propTypes = {
    requestId: PropTypes.string,
    inline: PropTypes.bool,
    model: PropTypes.string,
    onInsert: PropTypes.func
};

VibeFeedback.defaultProps = {
    requestId: null,
    inline: false,
    model: '',
    onInsert: () => false
};

export default VibeFeedback;
