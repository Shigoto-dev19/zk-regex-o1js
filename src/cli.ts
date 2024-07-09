import { RegexCompiler } from './compiler.js';
import { Command } from 'commander';

// Initialize the commander program
const program = new Command();

program
  .version('1.0.0')
  .description('CLI for Regex Compiler')
  .argument('<rawRegex>', 'Raw regex pattern to compile')
  .option('-c, --count', 'Enable count')
  .action((rawRegex, options) => {
    const countEnabled = options.count || false;

    const compiler = RegexCompiler.initialize(rawRegex, true);
    compiler.printRegexCircuit(countEnabled, false);
  });

// Parse the command-line arguments
program.parse(process.argv);
