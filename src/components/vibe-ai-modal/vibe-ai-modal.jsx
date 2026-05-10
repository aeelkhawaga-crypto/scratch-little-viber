import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import Box from '../box/box.jsx';

import styles from './vibe-ai-modal.css';

// Available models for code generation tasks
const AVAILABLE_MODELS = [
    { id: 'meta-llama/Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B Instruct' },
    { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B Instruct' },
    { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B Instruct' },
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct v0.3' },
    { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B Instruct' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B Instruct' },
    { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B' },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', name: 'DeepSeek R1 Distill 32B' },
    { id: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini 4K Instruct' }
];

const VibeAiModal = ({
    onCancel,
    onGenerate,
    onInsert,
    onPromptChange,
    onXmlChange,
    onTest,
    promptValue,
    xmlText,
    errorMessage,
    loading,
    selectedModel,
    onModelChange,
    blocksPreviewRef,
    onBlocksZoomIn,
    onBlocksZoomOut,
    onBlocksFit
}) => {
    const handleClose = () => onCancel();
    return (
        <Modal
            id="vibeAiModal"
            className={styles.modalContent}
            contentLabel="Ask the Viber to edit your code"
            onRequestClose={handleClose}
        >
            <Box className={styles.body}>
                <div className={styles.apiKeyRow}>
                    <label className={styles.apiKeyLabel} htmlFor="vibeAiModel">
                        Select AI Model
                    </label>
                    <select
                        id="vibeAiModel"
                        className={styles.apiKeyInput}
                        value={selectedModel}
                        onChange={onModelChange}
                    >
                        {AVAILABLE_MODELS.map(model => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>
                {loading ? (
                    <div className={styles.loadingMessage}>
                        <span className={styles.loadingText}>The viber is thinking</span>
                        <span className={styles.dots}>
                            <span className={styles.dot} />
                            <span className={styles.dot} />
                            <span className={styles.dot} />
                        </span>
                    </div>
                ) : null}
                <div className={styles.viewsRow}>
                    <div className={styles.viewPanel}>
                        <div className={styles.panelHeader}>XML</div>
                        <textarea
                            aria-label="AI response preview"
                            className={styles.outputArea}
                            value={xmlText}
                            onChange={onXmlChange}
                            disabled={loading}
                        />
                    </div>
                    <div className={styles.viewPanel}>
                        <div className={styles.panelHeader}>Blocks</div>
                        <div className={styles.blocksTab}>
                            <div
                                className={styles.blocksPreview}
                                ref={blocksPreviewRef}
                            />
                            <div className={styles.blocksControlsVertical}>
                                <button
                                    type="button"
                                    className={styles.controlButton}
                                    onClick={onBlocksZoomIn}
                                    title="Zoom in"
                                >
                                    +
                                </button>
                                <button
                                    type="button"
                                    className={styles.controlButton}
                                    onClick={onBlocksFit}
                                    title="Fit to view"
                                >
                                    <span className={styles.squareIcon} />
                                </button>
                                <button
                                    type="button"
                                    className={styles.controlButton}
                                    onClick={onBlocksZoomOut}
                                    title="Zoom out"
                                >
                                    –
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.commandRow}>
                    <textarea
                        aria-label="Your command to the AI"
                        className={styles.promptArea}
                        placeholder="Describe how you want the code to change..."
                        value={promptValue}
                        onChange={onPromptChange}
                    />
                </div>
                {errorMessage ? (
                    <div className={styles.error}>{errorMessage}</div>
                ) : null}
                <div className={styles.buttonRow}>
                    {/* <button className={styles.secondaryButton} type="button" onClick={onTest}>
                        Test
                    </button> */}
                    <button className={styles.primaryButton} type="button" onClick={onGenerate} disabled={loading}>
                        Scoopy Doo
                    </button>
                    <button className={styles.secondaryButton} type="button" onClick={onInsert} disabled={loading}>
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
    onGenerate: PropTypes.func.isRequired,
    onInsert: PropTypes.func.isRequired,
    onPromptChange: PropTypes.func.isRequired,
    onTest: PropTypes.func.isRequired,
    promptValue: PropTypes.string,
    onXmlChange: PropTypes.func.isRequired,
    selectedModel: PropTypes.string,
    onModelChange: PropTypes.func.isRequired,
    errorMessage: PropTypes.string,
    xmlText: PropTypes.string,
    loading: PropTypes.bool,
    blocksPreviewRef: PropTypes.func.isRequired,
    onBlocksZoomIn: PropTypes.func.isRequired,
    onBlocksZoomOut: PropTypes.func.isRequired,
    onBlocksFit: PropTypes.func.isRequired
};

export default VibeAiModal;
