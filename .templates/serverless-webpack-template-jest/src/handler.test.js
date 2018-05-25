import version from './handler';

describe('version', () => {
  it('executes as expected', () => {
    version({}, {}, (error) => {
      expect(error).toBeNull();
    });
  });
});