import { expect } from 'chai';
import Api from './Api';
import EventsRouter from './commandHandlers/EventsRouter';

describe('Api', () => {
  describe('.routeEvents', () => {
    it('delegates on EventsRouter', () => {
      expect(Api.routeEvents).to.equal(EventsRouter.execute);
    });
  });
});
