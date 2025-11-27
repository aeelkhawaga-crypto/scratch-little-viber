import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import Box from '../box/box.jsx';

import styles from './vibe-ai-modal.css';

const VibeAiModal = ({onCancel, xmlText, onXmlChange, onTest, onInsert}) => {
    const handleClose = () => onCancel();
    return (
        <Modal
            id="vibeAiModal"
            className={styles.modalContent}
            contentLabel="Ask AI to edit your code"
            onRequestClose={handleClose}
        >
            <Box className={styles.body}>
                <div className={styles.columns}>
                    <div className={styles.inputColumn}>
                        <label className={styles.label} htmlFor="vibe-ai-command">
                            Enter your command
                        </label>
                        <textarea
                            id="vibe-ai-command"
                            className={styles.textArea}
                            placeholder="Describe how you want the code to change..."
                        />
                    </div>
                    <div className={styles.outputColumn}>
                        <div className={styles.label}>AI response</div>
                        <textarea
                            aria-label="AI response preview"
                            className={styles.outputArea}
                            value={xmlText}
                            onChange={onXmlChange}
                        />
                    </div>
                </div>
                <div className={styles.buttonRow}>
                    <button className={styles.secondaryButton} type="button" onClick={onTest}>
                        Test
                    </button>
                    <button className={styles.primaryButton} type="button">
                        Generate Code
                    </button>
                    <button className={styles.secondaryButton} type="button" onClick={onInsert}>
                        Insert Code
                    </button>
                    <button className={styles.cancelButton} type="button" onClick={handleClose}>
                        Cancel
                    </button>
                </div>
            </Box>
        </Modal>
    );
};

VibeAiModal.propTypes = {
    onCancel: PropTypes.func.isRequired,
    onInsert: PropTypes.func.isRequired,
    onTest: PropTypes.func.isRequired,
    onXmlChange: PropTypes.func.isRequired,
    xmlText: PropTypes.string
};

export default VibeAiModal;
