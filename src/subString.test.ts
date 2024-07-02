/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { RegexCompiler } from './compiler';

describe('Simple Regex: 1=(a|b) (2=(b|c)+ )+d', () => {
  const entireRegex = '1=(a|b) (2=(b|c)+ )+d';
  const regexParser = RegexCompiler.initialize(entireRegex);

  it('should reject non-existant regex sub-pattern', () => {
    const partRegexArray = ['(a|c)'];

    const extractedTransitions = () =>
      regexParser.extractSubPatternTransitions(partRegexArray);

    const errorMessage =
      'Input substring is not found within the entire regex pattern!';
    expect(extractedTransitions).toThrowError(errorMessage);
  });

  it("should extract the correct transitions for '='", () => {
    const partRegexArray = ['='];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [1, 2],
        [5, 6],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for whitespace ' '", () => {
    const partRegexArray = [' '];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [3, 4],
        [7, 8],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it('should extract the correct transitions for digits', () => {
    const partRegexArray = ['1', '2'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [[0, 1]],
      [
        [4, 5],
        [8, 5],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it('should extract the correct transitions for alphabets', () => {
    const partRegexArray = ['(a|b)', '(b|c)', 'd'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [[2, 3]],
      [
        [6, 7],
        [7, 7],
      ],
      [[8, 9]],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });
});

describe('Negate Regex: a:[^abcdefghijklmnopqrstuvwxyz]+.', () => {
  const entireRegex = 'a:[^abcdefghijklmnopqrstuvwxyz]+.';
  const regexParser = RegexCompiler.initialize(entireRegex);

  it('should reject non-existant regex sub-pattern', () => {
    const partRegexArray = ['b:'];
    const extractedTransitions = () =>
      regexParser.extractSubPatternTransitions(partRegexArray);

    const errorMessage =
      'Input substring is not found within the entire regex pattern!';
    expect(extractedTransitions).toThrowError(errorMessage);
  });

  it('should extract the correct transitions for negated aphabets', () => {
    // Omitting + operator also works
    const partRegexArray = ['[^abcdefghijklmnopqrstuvwxyz]'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [1, 1],
        [4, 1],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for accepting character '.'", () => {
    const partRegexArray = ['.'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [[[1, 2]]];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for substring 'a:'", () => {
    const partRegexArray = ['a:'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [0, 3],
        [3, 4],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it('should extract the correct transitions for the entire regex', () => {
    const partRegexArray = ['a:', '[^abcdefghijklmnopqrstuvwxyz]+', '.'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [0, 3],
        [3, 4],
      ],
      [
        [1, 1],
        [4, 1],
      ],
      [[1, 2]],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });
});

describe("Fully Repated Regex Patterns: '[a-z]+' and '[^aeiou]+'", () => {
  it('should reject non-existant regex sub-pattern', () => {
    const entireRegex = '[a-z]+';
    const partRegexArray = ['abc'];
    const extractedTransitions = () =>
      RegexCompiler.initialize(entireRegex).extractSubPatternTransitions(
        partRegexArray
      );

    const errorMessage =
      'Input substring is not found within the entire regex pattern!';
    expect(extractedTransitions).toThrowError(errorMessage);
  });

  it("should extract the correct transitions for '[a-z]+'", () => {
    const entireRegex = '[a-z]+';
    const partRegexArray = ['[a-z]'];
    const extractedTransitions =
      RegexCompiler.initialize(entireRegex).extractSubPatternTransitions(
        partRegexArray
      );

    const expectedTransitions = [
      [
        [0, 1],
        [1, 1],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for '[^aeiou]+'", () => {
    const entireRegex = '[^aeiou]+';
    const partRegexArray = ['[^aeiou]'];
    const extractedTransitions =
      RegexCompiler.initialize(entireRegex).extractSubPatternTransitions(
        partRegexArray
      );

    const expectedTransitions = [
      [
        [0, 1],
        [1, 1],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });
});

describe("Mina Regex: '(mina|MINA)+'", () => {
  const entireRegex = '(mina|MINA)+';
  const regexParser = RegexCompiler.initialize(entireRegex);

  it('should reject non-existant regex sub-pattern', () => {
    const partRegexArray = ['tina'];
    const extractedTransitions = () =>
      regexParser.extractSubPatternTransitions(partRegexArray);

    const errorMessage =
      'Input substring is not found within the entire regex pattern!';
    expect(extractedTransitions).toThrowError(errorMessage);
  });

  it("should extract the correct transitions for 'mina'", () => {
    const partRegexArray = ['mina'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [0, 2],
        [7, 2],
        [2, 4],
        [4, 6],
        [6, 7],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for 'MINA'", () => {
    const partRegexArray = ['MINA'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [0, 1],
        [7, 1],
        [1, 3],
        [3, 5],
        [5, 7],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });
});

describe("Email Regex: '([a-zA-Z0-9._%-=]+@[a-zA-Z0-9-]+.[a-z]+)'", () => {
  const entireRegex = '([a-zA-Z0-9._%-=]+@[a-zA-Z0-9-]+.[a-z]+)';
  const regexParser = RegexCompiler.initialize(entireRegex);

  it('should reject non-existant regex sub-pattern', () => {
    const partRegexArray = ['.com'];
    const extractedTransitions = () =>
      regexParser.extractSubPatternTransitions(partRegexArray);

    const errorMessage =
      'Input substring is not found within the entire regex pattern!';
    expect(extractedTransitions).toThrowError(errorMessage);
  });

  it("should extract the correct transitions for substring '[a-zA-Z0-9._%-=]'", () => {
    const partRegexArray = ['[a-zA-Z0-9._%-=]'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);
    const expectedTransitions = [
      [
        [0, 1],
        [1, 1],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for character '@'", () => {
    const partRegexArray = ['@'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [[[1, 2]]];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for substring '[a-zA-Z0-9-]'", () => {
    const partRegexArray = ['[a-zA-Z0-9-]'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [2, 3],
        [3, 3],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for character '.'", () => {
    const partRegexArray = ['.'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [[[3, 4]]];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });

  it("should extract the correct transitions for substring '[a-z]+'", () => {
    const partRegexArray = ['[a-z]+'];
    const extractedTransitions =
      regexParser.extractSubPatternTransitions(partRegexArray);

    const expectedTransitions = [
      [
        [4, 5],
        [5, 5],
      ],
    ];

    expect(extractedTransitions).toEqual(expectedTransitions);
  });
});
