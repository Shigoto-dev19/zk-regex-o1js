#! /usr/bin/env node
import { assert } from 'o1js';
import { RegexCompiler } from './compiler.js';
import { Command } from 'commander';
import { appendFileSync, existsSync, writeFileSync } from 'fs';

// Initialize the commander program
const program = new Command();

program
  .version('0.2.0')
  .description('CLI for ZK Regex Compiler in o1js')
  .argument('<regexPattern>', 'Raw regex pattern to compile')
  .option(
    '-c, --count',
    'Count the occurrences of the pattern in the input according to the regex pattern, replacing the default boolean matcher that only checks if the input matches the pattern or not.'
  )
  .option('-t, --revealTransitions <values...>', 'State transitions to reveal')
  .option('-s, --revealSubpatterns <values...>', 'Regex subpatterns to reveal')
  .option(
    '-n, --functionName <name>',
    'Function name to give to the regex circuit'
  )
  .option(
    '-f, --filePath <path>',
    'File path to append the regex circuit. If the file does not exist, it will be created with an import statement for required types and the regex circuit will be written to it. If the file already exists, only the regex circuit will be appended. Requires --functionName to be specified.'
  )
  .action((rawRegex, options) => {
    // Extract and set the options
    const countEnabled = options.count || false;
    let revealEnabled = false;
    const functionName = options.functionName
      ? 'export function ' + options.functionName
      : '';

    let revealInput: string[] | [number, number][][] | undefined = undefined;

    // Ensure only one of --revealTransitions or --revealSubpatterns options is provided
    if (options.revealTransitions && options.revealSubpatterns) {
      console.error(
        'Error: You can only use either --revealTransitions or --revealSubpatterns, not both!'
      );
      process.exit(1);
    }

    // Initialize the RegexCompiler
    const logsEnabled = options.filePath ? false : true;
    const compiler = RegexCompiler.initialize(rawRegex, logsEnabled);

    // Set revealInput and revealEnabled based on the provided option
    if (options.revealTransitions) {
      revealEnabled = true;
      revealInput = parseTransitions(options.revealTransitions);

      assertTransitionsIncluded(
        revealInput,
        compiler.extractSubPatternTransitions([rawRegex]).flat()
      );
    } else if (options.revealSubpatterns) {
      revealEnabled = true;
      revealInput = options.revealSubpatterns;
    }

    // Generate the regex circuit string based on the options
    compiler.generateStringRegexCircuit(
      countEnabled,
      revealEnabled,
      revealInput,
      functionName
    );

    // Capture the command used to run the CLI
    const commandComment = `\n// Command used: ${process.argv
      .slice(2) // Exclude the first two arguments (node and script path)
      .map((arg) => `'${arg}'`) // Quote each argument for clarity
      .join(' ')}`; // Join arguments into a single string

    // Prepend the command comment to the regex circuit
    compiler.stringRegexCircuit = commandComment + compiler.stringRegexCircuit;

    // If filePath is provided, append the regex circuit to the specified file
    if (options.filePath) {
      // Check if functionName option is specified
      if (functionName === '') {
        console.error(
          'Error: The --functionName option must be specified to append the regex circuit to a file.'
        );
        process.exit(1);
      }

      try {
        const header = "import { Bool, Field, UInt8 } from 'o1js';\n\n";
        const contentToAppend = `${compiler.stringRegexCircuit}\n`;

        // Import required types from o1js if the file is new
        if (existsSync(options.filePath)) {
          // If the file exists, append the regex circuit
          appendFileSync(options.filePath, contentToAppend);
        } else {
          // If the file does not exist, create it with the header and then append the regex circuit
          writeFileSync(options.filePath, header + contentToAppend);
        }

        console.log(
          '\x1b[1m\x1b[32m✓\x1b[0m',
          `"${options.functionName}" o1js circuit successfully appended to ${options.filePath}`
        );
      } catch (error: any) {
        console.error(`Error appending to file: ${error.message}`);
      }
    } else {
      // If filePath is not provided, just print the regex circuit
      compiler.printRegexCircuit();
    }
  });

// Parse the command-line arguments
program.parse(process.argv);

/**
 * Parses a collection of state transition strings into a 2-dimensional array of transition pairs.
 *
 * @param inputArray - The array of input strings to parse.
 * @returns The parsed array of arrays of number pairs.
 * @throws Throws an error if the format of the input string is invalid.
 *
 * @example
 * // Example input
 * const input = ['[0,1],[1,2]', '[2,3],[3,4]'];
 *
 * // Example output
 * const output = [
 *   [[0, 1], [1, 2]],
 *   [[2, 3], [3, 4]]
 * ];
 */
function parseTransitions(inputArray: string[]): [number, number][][] {
  return inputArray.map((str: string) => {
    // Remove spaces and ensure the string matches the expected format
    const cleanedString = str.replace(/\s/g, '');
    const isValidFormat = /^\[\d+,\d+\](,\[\d+,\d+\])*$/.test(cleanedString);

    if (!isValidFormat) {
      throw new Error(`Invalid format: ${str}`);
    }

    // Extract pairs of numbers from the cleaned string
    const pairs = cleanedString.match(/\[\d+,\d+\]/g);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return pairs!.map((pair) => {
      const [a, b] = pair.replace(/[[\]]/g, '').split(',').map(Number);
      if (isNaN(a) || isNaN(b)) {
        throw new Error(`Invalid number in pair: ${pair}`);
      }
      return [a, b] as [number, number];
    });
  });
}

/**
 * Assert that all transitions to reveal are included in the full transition array.
 *
 * @param transitionsToReveal - The array of transitions to reveal.
 * @param fullTransitions - The full array of transitions.
 */
function assertTransitionsIncluded(
  transitionsToReveal: [number, number][][],
  fullTransitions: [number, number][]
): void {
  // Convert fullTransitions to a Set of strings for quick lookup
  const fullTransitionsSet = new Set(
    fullTransitions.map((transition) => JSON.stringify(transition))
  );

  // Check each transition in transitionsToReveal
  for (const group of transitionsToReveal) {
    for (const transition of group) {
      const isIncluded = fullTransitionsSet.has(JSON.stringify(transition));
      assert(
        isIncluded,
        `Transition ${JSON.stringify(transition)} not found!\n` +
          `Please enter transitions that are part of your regex pattern transitions: ` +
          `[${Array.from(fullTransitionsSet).join(', ')}]`
      );
    }
  }
}
