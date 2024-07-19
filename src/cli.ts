import { RegexCompiler } from './compiler.js';
import { Command } from 'commander';

// Initialize the commander program
const program = new Command();

program
  .version('0.1.0')
  .description('CLI for ZK Regex Compiler in o1js')
  .argument('<rawRegex>', 'Raw regex pattern to compile')
  .option('-c, --count', 'Enable count for match regex pattern')
  .option('-t, --revealTransitions <values...>', 'Transitions to reveal')
  .option('-s, --revealSubpatterns <values...>', 'Regex subpatterns to reveal')
  .action((rawRegex, options) => {
    // Extract and set the options
    const countEnabled = options.count || false;
    let revealEnabled = false;

    // Initialize transitionInput to undefined
    let transitionInput: string[] | [number, number][][] | undefined =
      undefined;

    // Ensure only one of --revealTransitions or --revealSubpatterns is provided
    if (options.revealTransitions && options.revealSubpatterns) {
      console.error(
        'Error: You can only use either --revealTransitions or --revealSubpatterns, not both!'
      );
      process.exit(1);
    }

    // Set transitionInput and revealEnabled based on the provided option
    if (options.revealTransitions) {
      revealEnabled = true;
      transitionInput = parseTransitions(options.revealTransitions);
    } else if (options.revealSubpatterns) {
      revealEnabled = true;
      transitionInput = options.revealSubpatterns;
    }

    // Initialize the RegexCompiler
    const compiler = RegexCompiler.initialize(rawRegex, true);

    // Print the regex circuit based on the options
    compiler.printRegexCircuit(countEnabled, revealEnabled, transitionInput);
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
    return pairs!.map((pair) => {
      const [a, b] = pair.replace(/[[\]]/g, '').split(',').map(Number);
      if (isNaN(a) || isNaN(b)) {
        throw new Error(`Invalid number in pair: ${pair}`);
      }
      return [a, b] as [number, number];
    });
  });
}
