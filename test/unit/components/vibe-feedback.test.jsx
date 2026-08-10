import React from 'react';
import {shallow} from 'enzyme';

import VibeFeedback from '../../../src/components/vibe-feedback/vibe-feedback';

describe('VibeFeedback', () => {
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
