import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import {saveVibeFeedback} from '../../lib/vibeFeedbackService';
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
    constructor(props) {
        super(props);
        this.state = {
            open: false,
            functionalCorrectness: 5,
            intentAlignment: 5,
            outcome: 'Worked',
            notes: '',
            saving: false,
            error: '',
            saved: false
        };
    }

    open = () => this.setState({open: true, error: '', saved: false});
    close = () => this.setState({open: false});
    selectCriterion = (dimension, value, event) => {
        if (event.target.checked) {
            this.setState({[dimension]: value});
        }
    };
    save = async event => {
        event.preventDefault();
        this.setState({saving: true, error: ''});
        try {
            await saveVibeFeedback({
                requestId: this.props.requestId,
                functionalCorrectness: this.state.functionalCorrectness,
                intentAlignment: this.state.intentAlignment,
                outcome: this.state.outcome,
                notes: this.state.notes
            });
            this.setState({saving: false, saved: true});
        } catch (error) {
            this.setState({saving: false, error: error.message});
        }
    };

    render() {
        const {open, functionalCorrectness, intentAlignment, outcome, notes, saving, error, saved} = this.state;
        const scores = {functional: functionalCorrectness, intent: intentAlignment};
        return (
            <React.Fragment>
                <button className={styles.feedbackTrigger} type="button" onClick={this.open}>
                    Feedback
                </button>
                {open ? (
                    <Modal
                        className={styles.feedbackModal}
                        contentLabel="Rate Viber experiment"
                        onRequestClose={this.close}
                    >
                        <div className={styles.feedbackLayout}>
                            <form className={styles.feedbackBody} onSubmit={this.save}>
                                <h2>Rate this experiment</h2>
                                <label htmlFor="vibeFunctionalCorrectness">Functional correctness score</label>
                                <select
                                    id="vibeFunctionalCorrectness"
                                    value={functionalCorrectness}
                                    onChange={event => this.setState({functionalCorrectness: Number(event.target.value)})}
                                >
                                    {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}
                                </select>
                                <label htmlFor="vibeIntentAlignment">Intent alignment score</label>
                                <select
                                    id="vibeIntentAlignment"
                                    value={intentAlignment}
                                    onChange={event => this.setState({intentAlignment: Number(event.target.value)})}
                                >
                                    {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}
                                </select>
                                <label htmlFor="vibeOutcome">Outcome</label>
                                <select id="vibeOutcome" value={outcome} onChange={event => this.setState({outcome: event.target.value})}>
                                    <option>Worked</option>
                                    <option>Partially worked</option>
                                    <option>Did not work</option>
                                </select>
                                <label htmlFor="vibeFeedbackNotes">Notes (optional)</label>
                                <textarea
                                    id="vibeFeedbackNotes"
                                    value={notes}
                                    onChange={event => this.setState({notes: event.target.value})}
                                    placeholder="What worked or needs improvement?"
                                />
                                {error ? <div className={styles.error}>{error}</div> : null}
                                {saved ? <div className={styles.saved}>Feedback saved.</div> : null}
                                <div className={styles.actions}>
                                    <button type="button" onClick={this.close}>Close</button>
                                    <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save feedback'}</button>
                                </div>
                            </form>
                            <aside className={styles.criteriaPanel}>
                                <h3>Scoring guide</h3>
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
                                                            dimension === 'functional' ? 'functionalCorrectness' : 'intentAlignment',
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
    requestId: PropTypes.string.isRequired
};

export default VibeFeedback;
