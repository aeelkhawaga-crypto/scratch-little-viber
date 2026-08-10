import React from 'react';
import {shallow} from 'enzyme';

import VibeFeedback from '../../../src/components/vibe-feedback/vibe-feedback';
import Modal from '../../../src/containers/modal';

describe('VibeFeedback', () => {
    test('shows experiment numbers for the selected record and right-panel links', () => {
        const wrapper = shallow(<VibeFeedback />);
        const record = {
            request_id: 'saved-request',
            experiment_id: 'EXP-019',
            created_at: '2026-08-10T00:00:00.000Z',
            status: 'success',
            prompt: 'Make the cat move.'
        };

        wrapper.setState({open: true, records: [record]});
        wrapper.instance().selectRecord(record);
        const modalBody = shallow(wrapper.find(Modal).prop('children'));

        expect(modalBody.find('[data-testid="vibeRecordSummary"]').text()).toContain('Experiment EXP-019');
        expect(modalBody.find('[data-testid="vibeRecordList"] button').first().text())
            .toContain('Experiment EXP-019');
    });

    test('inserts the response from the selected historical record', () => {
        const onInsert = jest.fn(() => true);
        const wrapper = shallow(<VibeFeedback onInsert={onInsert} />);

        wrapper.setState({
            selectedRequestId: 'saved-request',
            response: '```xml\n<xml><block type="event_whenflagclicked" /></xml>\n```'
        });
        wrapper.instance().insertCode();

        expect(onInsert).toHaveBeenCalledWith(
            '```xml\n<xml><block type="event_whenflagclicked" /></xml>\n```'
        );
        expect(wrapper.state('inserted')).toBe(true);
        expect(wrapper.state('error')).toBe('');
    });

    test('shows an error when the selected response cannot be inserted', () => {
        const onInsert = jest.fn(() => false);
        const wrapper = shallow(<VibeFeedback onInsert={onInsert} />);

        wrapper.setState({selectedRequestId: 'invalid-request', response: 'not Scratch XML'});
        wrapper.instance().insertCode();

        expect(onInsert).toHaveBeenCalledWith('not Scratch XML');
        expect(wrapper.state('inserted')).toBe(false);
        expect(wrapper.state('error')).toMatch(/valid Scratch XML/);
    });
});
