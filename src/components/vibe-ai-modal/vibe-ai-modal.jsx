import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import Box from '../box/box.jsx';

import styles from './vibe-ai-modal.css';

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
    activeTab,
    onTabChange,
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
            contentLabel="Ask AI to edit your code"
            onRequestClose={handleClose}
        >
            <Box className={styles.body}>
                <div className={styles.columns}>
                    <div className={styles.inputColumn}>
                        <label className={styles.label}>
                            Enter your command
                        </label>
                        <textarea
                            aria-label="Your command to the AI"
                            className={styles.textArea}
                            placeholder="Describe how you want the code to change..."
                            value={promptValue}
                            onChange={onPromptChange}
                        />
                    </div>
                    <div className={styles.outputColumn}>
                        {loading ? (
                            <div className={styles.loadingMessage}>
                                <span className={styles.loadingText}>AI agent is thinking</span>
                                <span className={styles.dots}>
                                    <span className={styles.dot} />
                                    <span className={styles.dot} />
                                    <span className={styles.dot} />
                                </span>
                            </div>
                        ) : null}
                        <div className={styles.tabsHeader}>
                            <button
                                type="button"
                                className={`${styles.tabButton} ${activeTab === 'xml' ? styles.activeTab : ''}`}
                                onClick={() => onTabChange('xml')}
                            >
                                XML
                            </button>
                            <button
                                type="button"
                                className={`${styles.tabButton} ${activeTab === 'blocks' ? styles.activeTab : ''}`}
                                onClick={() => onTabChange('blocks')}
                            >
                                Blocks
                            </button>


                        </div>
                        <div className={styles.tabBody}>
                            <div className={`${styles.tabPanel} ${activeTab === 'xml' ? styles.activePanel : styles.hiddenPanel}`}>
                                <textarea
                                    aria-label="AI response preview"
                                    className={styles.outputArea}
                                    value={xmlText}
                                    onChange={onXmlChange}
                                    disabled={loading}
                                />
                            </div>
                            <div className={`${styles.tabPanel} ${activeTab === 'blocks' ? styles.activePanel : styles.hiddenPanel}`}>
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
                    </div>
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
    errorMessage: PropTypes.string,
    xmlText: PropTypes.string,
    loading: PropTypes.bool,
    activeTab: PropTypes.oneOf(['xml', 'blocks']),
    onTabChange: PropTypes.func.isRequired,
    blocksPreviewRef: PropTypes.func.isRequired,
    onBlocksZoomIn: PropTypes.func.isRequired,
    onBlocksZoomOut: PropTypes.func.isRequired,
    onBlocksFit: PropTypes.func.isRequired
};

export default VibeAiModal;
