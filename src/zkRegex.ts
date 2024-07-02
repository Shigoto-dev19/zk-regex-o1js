import { RegexCompiler } from './compiler.js';

// Handle different commands based on 'countEnabled' and 'revealEnabled' boolean arguments
const rawRegex = process.argv[2];
let countEnabled = false;
let revealEnabled = false;
if (process.argv[3]) {
  if (process.argv[3] === 'true') countEnabled = true;
  else {
    if (process.argv[4] === 'true') countEnabled = true;
    else if (!process.argv[4]) countEnabled;
    else
      throw new Error(
        "Please enter 'true' if you want to activate 'countEnabled' argument!"
      );
    revealEnabled = true;
  }
}

const compiler = RegexCompiler.initialize(rawRegex, true);
compiler.printRegexCircuit(countEnabled, revealEnabled);

//TODO Declare state_changed outside of the loop declaration
//TODO Fix occurence compiler code when regex ends with repetition operator +
//TODO Add the option to reveal substrings based on search functions .i.e. isDigit, isNumber etc...
