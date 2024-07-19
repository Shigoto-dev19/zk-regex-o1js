import { assert } from 'o1js';
import { RegexCompiler } from './compiler.js';
import { Command } from 'commander';

// Initialize the commander program
const program = new Command();

program
  .version('0.1.0')
  .description('CLI for ZK Regex Compiler in o1js')
  .argument('<rawRegex>', 'Raw regex pattern to compile')
  .option('-c, --count', 'Enable count for match regex pattern')
  .option(
    '-t, --revealTransitions <values...>',
    'Partial state transitions to reveal'
  )
  .option('-s, --revealSubpatterns <values...>', 'Regex subpatterns to reveal')
  .action((rawRegex, options) => {
    // Extract and set the options
    const countEnabled = options.count || false;
    let revealEnabled = false;

    let revealInput: string[] | [number, number][][] | undefined = undefined;

    // Ensure only one of --revealTransitions or --revealSubpatterns is provided
    if (options.revealTransitions && options.revealSubpatterns) {
      console.error(
        'Error: You can only use either --revealTransitions or --revealSubpatterns, not both!'
      );
      process.exit(1);
    }

    // Initialize the RegexCompiler
    const compiler = RegexCompiler.initialize(rawRegex, true);

    // Set transitionInput and revealEnabled based on the provided option
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

    // Print the regex circuit based on the options
    compiler.printRegexCircuit(countEnabled, revealEnabled, revealInput);
  });

// Parse the command-line arguments
program.parse(process.argv);

// Function to parse input strings into an array of arrays of number pairs
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
