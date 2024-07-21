import { Field } from 'o1js';
import {
  countInRangeRegex,
  excludeRegex,
  inclusionRegex,
  sequenceRegex,
} from './fieldRegex';

// field regex for matching range and certain exact values
describe('Field Regex1: inclusion in ([12345-56789101112]|19|2024|-1)', () => {
  it('should accept a single field in range [12345-56789101112]', () => {
    const input = [Field(123456)];
    expect(inclusionRegex(input).toBoolean()).toEqual(true);
  });

  it('should accept a single field=19', () => {
    const input = [Field(19)];
    expect(inclusionRegex(input).toBoolean()).toEqual(true);
  });

  it('should accept a single field=2024', () => {
    const input = [Field(2024)];
    expect(inclusionRegex(input).toBoolean()).toEqual(true);
  });

  it('should accept a single field=-1', () => {
    const input = [Field(-1)];
    expect(inclusionRegex(input).toBoolean()).toEqual(true);
  });

  it('should reject a single field=12344', () => {
    const input = [Field(12344)];
    expect(inclusionRegex(input).toBoolean()).toEqual(false);
  });

  it('should accept a field array that contains a field in range [12345-56789101112]', () => {
    // 56789101 is in range [12345-56789101112]
    const input = [3245, 56789101, 123, -2].map(Field);
    expect(inclusionRegex(input).toBoolean()).toEqual(true);
  });

  it('should reject a field array that contains any matching field', () => {
    const input = [123, -3, 11098, 225, 56789101113].map(Field);
    expect(inclusionRegex(input).toBoolean()).toEqual(false);
  });
});

describe('Field Regex2: sequence of five fields -1-2-3-4-5', () => {
  it('should accept the correct sequence', () => {
    const input = [-1, -2, -3, -4, -5, 34523525, 45252, 134324, 7853].map(
      Field
    );
    expect(sequenceRegex(input).toBoolean()).toEqual(true);
  });

  it('should accept the correct sequence in different position', () => {
    const input = [11, 45913, 76254, 132, -1, -2, -3, -4, -5].map(Field);
    expect(sequenceRegex(input).toBoolean()).toEqual(true);
  });

  it('should reject sequence with correct values but with false order', () => {
    const input = [-1, -3, -2, -4, -5, 98341, 45252, 134324].map(Field);
    expect(sequenceRegex(input).toBoolean()).toEqual(false);
  });

  it('should reject field array that with no matching sequence', () => {
    const input = [98341, 45252, 134324].map(Field);
    expect(sequenceRegex(input).toBoolean()).toEqual(false);
  });
});

describe('Field Regex2: count fields in range [55555-7777777]', () => {
  it('should count 1 correct values in range', () => {
    const input = [555556, 0, 1].map(Field);
    expect(countInRangeRegex(input)).toEqual(Field(1));
  });

  it('should count 2 correct values in range', () => {
    const input = [-9, 666666, 13, 7777776].map(Field);
    expect(countInRangeRegex(input)).toEqual(Field(2));
  });

  it('should count 5 correct values in range', () => {
    const input = [
      555556, -2, 100000, -4, -5, 237777, 0, 666666, 7853, 123123,
    ].map(Field);
    expect(countInRangeRegex(input)).toEqual(Field(5));
  });

  it('should count 0 correct values in range', () => {
    const input = [0, 12, 13, -1, 7777778, 55554, -3].map(Field);
    expect(countInRangeRegex(input)).toEqual(Field(0));
  });
});

describe('Field Regex3: exclude 123456789 OR 11223344556677', () => {
  it('should accept array with no excluded values', () => {
    const input = [12, 0, -1, -5, -10].map(Field);
    expect(excludeRegex(input).toBoolean()).toEqual(true);
  });

  it('should accept array with no excluded values (random)', () => {
    const randomFieldArray: Field[] = Array.from({ length: 100 }, () =>
      Field.random()
    );
    expect(excludeRegex(randomFieldArray).toBoolean()).toEqual(true);
  });

  it('should reject a field array that contains 123456789', () => {
    let randomFieldArray: Field[] = Array.from({ length: 100 }, () =>
      Field.random()
    );
    randomFieldArray.push(Field(123456789));
    expect(excludeRegex(randomFieldArray).toBoolean()).toEqual(false);
  });

  it('should reject a field array that contains 11223344556677', () => {
    let randomFieldArray: Field[] = Array.from({ length: 100 }, () =>
      Field.random()
    );
    randomFieldArray.push(Field(11223344556677));
    expect(excludeRegex(randomFieldArray).toBoolean()).toEqual(false);
  });
});
