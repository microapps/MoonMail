import validator from './validator';
import * as Joi from 'joi';


describe('Validate', () => {
  it('should return the value validated if its right', () => {
    // GIVEN
    spyOn(Joi, 'validate').and.returnValue({
      value: {property: '1'}
    });

    // WHEN
    const {error, value} = validator({property: '1'}, { property: 'string' });

    // THEN
    expect(value).toEqual({property: '1'});

    // AND
    expect(error).toBeNull();
  });

  it('should return the value validated if its right', () => {
    // GIVEN
    spyOn(Joi, 'validate').and.returnValue({
      error: {details: 'Anything could go wrong here'}
    });

    // WHEN
    const {error, value} = validator({property: '1'}, { property: 'string' });

    // THEN
    expect(error).toEqual('Anything could go wrong here');

    // AND
    expect(value).toBeUndefined();
  });
});