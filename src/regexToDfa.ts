/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { State, regexToNfa, nfaToDfa, minDfa } from "./lexical.js";

export {
  parseRawRegex, 
  generateMinDfaGraph, 
  GraphTransition,
}

type GraphState = { 
  key?: string; 
  items?: GraphState[]; 
  symbols?: string[]; 
  type?: string; 
  edges?: [string, GraphState][]; 
  id?: string;
  trans?: Record<string, GraphState>; 
  nature?: number
  transition?: Record<string, number>
}

type GraphTransition = {
  type: string;
  transition: Record<string, number>;
};

/// Helper regex components: Contains constants can be used in your code for various purposes such as regex patterns and character validations.

function barSeparated(input: string) {
  return input.split('').join('|');
}

// Alphabetic characters (lowercase)
const alphabeticLowercase = "abcdefghijklmnopqrstuvwxyz";

// Alphabetic characters (uppercase)
const alphabeticUppercase = alphabeticLowercase.toUpperCase();

// Alphabetic characters (both lowercase and uppercase)
const alphabetic = alphabeticLowercase + alphabeticUppercase;

// Digits
const digits = "0123456789";

// Alphanumeric characters
const alphanumeric = alphabetic + digits;

// Word characters (alphabetic characters, digits, and underscore)
const wordCharacters = alphanumeric + "_";

const a2z = barSeparated(alphabeticLowercase);
const A2Z = barSeparated(alphabeticUppercase);
const r0to9 = `(${barSeparated(digits)})`;
const alphanum = barSeparated(alphanumeric);

const key_chars = `(${a2z})`;
const catch_all =
  "(0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|!|\"|#|$|%|&|'|\\(|\\)|\\*|\\+|,|-|.|/|:|;|<|=|>|\\?|@|\\[|\\\\|\\]|^|_|`|{|\\||}|~| |\t|\n|\r|\x0b|\x0c)";
const catch_all_without_semicolon =
  "(0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|!|\"|#|$|%|&|'|\\(|\\)|\\*|\\+|,|-|.|/|:|<|=|>|\\?|@|\\[|\\\\|\\]|^|_|`|{|\\||}|~| |\t|\n|\r|\x0b|\x0c)";

const email_chars = `${alphanum}|_|.|-`;
const base_64 = `(${alphanum}|\\+|/|=)`;
const word_char = `(${alphanum}|_)`;
const email_address_regex = `([a-zA-Z0-9._%\\+-=]+@[a-zA-Z0-9.-]+)`;

// TODO: Note that this is replicated code in lexical.ts as well
// Note that ^ has to be manually replaced with \x80 in the regex
const escapeMap = { n: "\n", r: "\r", t: "\t", v: "\v", f: "\f" };
let whitespace = Object.values(escapeMap);
const slash_s = `(${whitespace.join("|")})`;

/**
 * Parses the input raw regex into an expanded parsed form and displays the DFA.
 * Note: In order to specify some strings in regex, use \\ to escape \\s.
 * For instance, matching the literal + is represented as \\+, but \\r matches the literal \r character.
 * Matching \\ then an r as two characters would be represented as \\r in the JS string literal.
 * 
 * @param {string} rawRegex The raw regex string to parse.
 * @returns {string} The expanded parsed regex.
 */
function parseRawRegex(rawRegex: string, logsEnabled=true) {
  // console.log(format_regex_printable(rawRegex));
  
  // Bold blue color for console output
  const BOLD_BLUE = "\x1b[34;1m";
  
  // Print input raw regex
  if (logsEnabled)
    console.log(BOLD_BLUE, 'INPUT RAW REGEX:\x1b[0m\n', rawRegex, '\n');
  
  // Parse the raw regex
  const expandedRegex = expandRangePatterns(rawRegex);
  const parsedRegex = regexToMinDFASpec(expandedRegex);
  
  // Print input parsed regex
  if (logsEnabled)
    console.log(BOLD_BLUE, 'INPUT EXPANDED REGEX\x1b[0m\n', parsedRegex, '\n');

  return parsedRegex;
}

// Escapes and prints regexes (might be buggy)
function format_regex_printable(s: string) {
  const escaped_string_json = JSON.stringify(s);
  const escaped_string = escaped_string_json.slice(1, escaped_string_json.length - 1);
  return escaped_string
    .replaceAll("\\\\\\\\", "\\")
    .replaceAll("\\\\", "\\")
    .replaceAll("\\|", "\\\\|")
    .replaceAll("/", "\\/")
    .replaceAll("\u000b", "\\♥")
    .replaceAll("|[|", "|\\[|")
    .replaceAll("|]|", "|\\]|")
    .replaceAll("|.|", "|\\.|")
    .replaceAll("|$|", "|\\$|")
    .replaceAll("|^|", "|\\^|");
  //   let escaped = escape_whitespace(escape_whitespace(s.replaceAll("\\\\", "ZZZZZZZ")));
  //   let fixed = escaped.replaceAll("\\(", "(").replaceAll("\\)", ")").replaceAll("\\+", "+").replaceAll("\\*", "*").replaceAll("\\?", "?");
}

/**
 * Expands [] sections in a regex string to convert values for https://zkregex.com/min_dfa.
 * 
 * @param str The input regex with [] and special characters (i.e., the first line of min_dfa tool).
 * @returns {string} The expanded regex without any special characters.
 */
function regexToMinDFASpec(str: string) {
  //TODO Upstream this to min_dfa
  
  let combined_nosep = str
    .replaceAll("\\w", word_char)
    .replaceAll("\\d", r0to9)
    .replaceAll("\\s", slash_s);

  /**
   * Adds a pipe inside brackets in the string.
   * 
   * @param {string} str The input string to process.
   * @returns {string} The string with pipes added inside brackets.
   */
  function addPipeInsideBrackets(str: string) {
    let result = "";
    let insideBrackets = false;
    let negateBracket = false;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === "[") {
        if (str[i + 1] === "^") {
          negateBracket = true;
          result += str[i];
          continue;
        }
        result += "(";
        insideBrackets = true;
        continue;
      } else if (str[i] === "]" || str[i] === ")") {
        if (negateBracket) {
          result += str[i];
          negateBracket = false;
          continue;
        }
        result += ")";
        
        insideBrackets = false;
      }
      else {
        let str_to_add = str[i];
        if (str[i] === "\\") {
          i++;
          str_to_add += str[i];
        }
        result += insideBrackets ? "|" + str_to_add : str_to_add;
      }
    }
    return result.replaceAll("[|", "[").replaceAll("(|", "(");
  }

  //   function makeCurlyBracesFallback(str) {
  //     let result = "";
  //     let insideBrackets = false;
  //     for (let i = 0; i < str.length; i++) {
  //       if (str[i] === "{") {
  //         result += str[i];
  //         insideBrackets = true;
  //         continue;
  //       } else if (str[i] === "}") {
  //         insideBrackets = false;
  //       }
  //       result += insideBrackets ? "|" + str[i] : str[i];
  //     }
  //     return result.replaceAll("[|", "[").replaceAll("[", "(").replaceAll("]", ")");
  //   }

  /**
   * Checks if brackets have pipes inside them.
   * 
   * @param {string} str The input string to check.
   * @returns {boolean} True if brackets have pipes inside them, false otherwise.
   */
  function checkIfBracketsHavePipes(str: string) {
    let result = true;
    let insideBrackets = false;
    let negateBracket = false;
    let insideParens = 0;
    let indexAt = 0;
    for (let i = 0; i < str.length; i++) {
      if (indexAt >= str.length) break;
      if (str[indexAt] === "[") {
        if (str[i + 1] === "^") negateBracket = true;
        insideBrackets = !negateBracket;
        indexAt++;
        continue;
      } else if (str[indexAt] === "]") {
        if (negateBracket) negateBracket = false;
        insideBrackets = false;
      }
      if (str[indexAt] === "(") {
        insideParens++;
      } else if (str[indexAt] === ")") {
        insideParens--;
      }
      if (insideBrackets) {
        if (str[indexAt] === "|") {
          indexAt++;
        } else {
          result = false;
          return result;
        }
      }
      if (!insideParens && str[indexAt] === "|") {
        console.log("Error: | outside of parens!");
      }
      if (str[indexAt] === "\\") {
        indexAt++;
      }
      indexAt++;
    }
    return result;
  }

  let combined;
  if (!checkIfBracketsHavePipes(combined_nosep)) {
    // console.log("Adding pipes within brackets between everything!");
    combined = addPipeInsideBrackets(combined_nosep);
    if (!checkIfBracketsHavePipes(combined)) {
      console.log("Did not add brackets correctly!");
    }
  } else {
    combined = combined_nosep;
  }

  return combined;
}

function toNature(col: string) {
  let i,
    j,
    base = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    result = 0;
  if (1 <= parseInt(col[0]) && parseInt(col[0]) <= 9) {
    result = parseInt(col, 10);
  } else {
    for (i = 0, j = col.length - 1; i < col.length; i += 1, j -= 1) {
      result += Math.pow(base.length, j) * (base.indexOf(col[i]) + 1);
    }
  }
  return result;
}

/**
 * Generates a minimum DFA graph from the given regular expression.
 * 
 * @param {string} regex The (expanded) regular expression to generate the minimum DFA graph from.
 * @returns {string} The JSON representation of the minimum DFA graph.
 */
function generateMinDfaGraph(regex: string, logsEnabled=true) {
  // Generate NFA from parsed regex
  const nfa = regexToNfa(regex);

  // Generate min-DFA from NFA
  const dfa = minDfa(nfaToDfa(nfa as State));
  let i: number,
    states: Record<string, GraphState> = {},
    nodes: GraphState[] = [],
    stack = [dfa as GraphState],
    symbols: string[] = [],
    top: GraphState;

  // Depth-first search to build the graph
  while (stack.length > 0) {
    top = stack.pop()!;
    if (!Object.prototype.hasOwnProperty.call(states, top!.id!)) {
      states[top.id!] = top;
      top.nature = toNature(top.id!);
      nodes.push(top);
      for (i = 0; i < top.edges!.length; i += 1) {
        if (top.edges![i][0] !== "ϵ" && symbols.indexOf(top.edges![i][0]) < 0) {
          symbols.push(top.edges![i][0]);
        }
        stack.push(top.edges![i][1]);
      }
    }
  }

  // Sort nodes by nature
  nodes.sort((a, b) => a.nature! - b.nature!);
  symbols.sort();

  // Build the graph
  let graph = [];
  for (i = 0; i < nodes.length; i += 1) {
    let curr: GraphState = {};
    curr.type = nodes[i].type;
    curr.transition = {};
    for (let j = 0; j < symbols.length; j += 1) {
      if (Object.prototype.hasOwnProperty.call(nodes[i].trans, symbols[j])) {
        curr.transition![symbols[j]] = nodes[i].trans![symbols[j]].nature! - 1;
      }
    }
    graph[nodes[i].nature! - 1] = curr;
  }

  const BOLD_PINK = "\x1b[35;1m";
  if (logsEnabled)
    console.log(BOLD_PINK, 'Min-DFA JSON GRAPH\x1b[0m\n', JSON.stringify(graph), '\n');

  return JSON.stringify(graph);
}

/**
 * Expands range patterns in a given string into their full forms.
 *
 * @param regexPattern - The input string containing range patterns.
 * 
 * @returns The expanded string with all ranges fully enumerated.
 * @throws Throws an error if the range is invalid or has inconsistent types.
 */
function expandRangePatterns(pattern: string): string {
  return pattern.replace(/\[(.*?)\]/g, (_, p1) => {
    let expanded = p1.replace(
      /([a-zA-Z0-9])-([a-zA-Z0-9])/g,
      (rangeMatch: string, start: string, end: string) => {
        // Assert that start < end
        if (start.charCodeAt(0) >= end.charCodeAt(0)) {
          throw new Error(`Invalid range: ${rangeMatch}`);
        }

        // Assert that both are digits, or both are lowercase letters, or both are uppercase letters
        if (
          !(
            (/[a-z]/.test(start) && /[a-z]/.test(end)) ||
            (/[A-Z]/.test(start) && /[A-Z]/.test(end)) ||
            (/[0-9]/.test(start) && /[0-9]/.test(end))
          )
        ) {
          throw new Error(`Inconsistent range types: ${rangeMatch}`);
        }

        // Generate the regex group for the range
        let range = '';
        for (let i = start.charCodeAt(0); i <= end.charCodeAt(0); i++) {
          range += String.fromCharCode(i);
        }

        // Return the expanded range
        return range;
      }
    );

    // Wrap expanded characters in parentheses separated by '|'
    return `(${expanded.split('').join('|')})`;
  });
}