import { RegexCompiler } from './compiler.js';
import { Command } from 'commander';

//TODO edit to add more flexibility removing JSON.parse()
//TODO take options into considersations --> split reveal transitions/subpattern

// Initialize the commander program
const program = new Command();

program
  .version('0.1.0')
  .description('CLI for ZK Regex Compiler in o1js')
  .argument('<rawRegex>', 'Raw regex pattern to compile')
  .option('-c, --count', 'Enable count')
  .option('-r, --reveal <inputs>', 'Reveal regex pattern substring')
  .action((rawRegex, options) => {
    // Extract and set the options
    const countEnabled = options.count || false;
    const revealEnabled = options.reveal ? true : false;
    const transitionInput = revealEnabled ? options.reveal : undefined;

    // Initialize the RegexCompiler
    const compiler = RegexCompiler.initialize(rawRegex, true);

    // Print the regex circuit based on the options
    compiler.printRegexCircuit(countEnabled, revealEnabled, transitionInput);
  });

// Parse the command-line arguments
program.parse(process.argv);

// node build/src/cli.js '[a-z]' -r '[[[0, 1]]]'
// node build/src/cli.js '[a-z]' -r '["[a-z]"]'
