import { expect } from 'chai';
import notifiers from './index';
import KinesisNotifier from './KinesisNotifier';

describe('notifiers', () => {
  it('should map to the correct notifiers', () => {
    expect(notifiers.kinesis).to.equal(KinesisNotifier);
  });
});
