import { assert } from 'o1js';
import {
  parseRawRegex,
  generateMinDfaGraph,
  GraphTransition,
} from './regexToDfa.js';

// Handle different commands based on 'countEnabled' and 'substringEnabled' boolean arguments
const rawRegex = process.argv[2];
let countEnabled = false;
let substringEnabled = false;
if (process.argv[3]) {
  if (process.argv[3] === 'true') countEnabled = true;
  else {
    if (process.argv[4] === 'true') countEnabled = true;
    else if (!process.argv[4]) countEnabled;
    else
      throw new Error(
        "Please enter 'true' if you want to activate 'countEnabled' argument!"
      );
    substringEnabled = true;
  }
}

const expandedRegex = parseRawRegex(rawRegex);
const graphJson: GraphTransition[] = JSON.parse(
  generateMinDfaGraph(expandedRegex)
);

const N = graphJson.length;

// Outgoing nodes
const graph: Record<number, number[]> = Array.from({ length: N }, () => []);

// Incoming Nodes
const revGraph: Record<number, Record<number, number[]>> = Array.from(
  { length: N },
  () => ({})
);
const revGraphString: Record<number, Record<number, string>> = Array.from(
  { length: N },
  () => ({})
);

const acceptNodes: Set<number> = new Set();

let init_going_state: null | number = null;

for (let i = 0; i < N; i++) {
  const currentNode = graphJson[i];
  for (let k in currentNode.transition) {
    const v = currentNode.transition[k];
    const charBytes = k.split(',').map((c: string) => c.charCodeAt(0));
    revGraph[v][i] = charBytes;
    revGraphString[v][i] = k;
    if (i === 0) {
      const index = revGraph[v][i].indexOf(94);
      if (index !== -1) {
        init_going_state = v;
        revGraph[v][i][index] = 255;
      }
      for (let j = 0; j < revGraph[v][i].length; j++) {
        if (revGraph[v][i][j] == 255) {
          continue;
        }
        graph[v].push(revGraph[v][i][j]);
      }
    }
  }
  if (currentNode.type === 'accept') {
    acceptNodes.add(i);
  }
}

if (init_going_state !== null) {
  for (const [going_state, chars] of Object.entries(graph)) {
    if (chars.length === 0) {
      continue;
    }
    const goingStateIndex = parseInt(going_state);
    if (revGraph[goingStateIndex][init_going_state] == null) {
      revGraph[goingStateIndex][init_going_state] = [];
    }
    revGraph[goingStateIndex][init_going_state] =
      revGraph[goingStateIndex][init_going_state].concat(chars);
  }
}

const acceptNodesArray: number[] = Array.from(acceptNodes);

if (acceptNodesArray.length !== 1) {
  throw new Error('Accept nodes length must be exactly 1.');
}

if (acceptNodesArray.includes(0)) {
  throw new Error('0 should not be in accept nodes');
}

function writeBodyLines() {
  let eq_i = 0;
  let lt_i = 0;
  let and_i = 0;
  let multi_or_i = 0;

  const range_checks = new Array(256);
  for (let i = 0; i < 256; i++) {
    range_checks[i] = new Array(256);
  }
  const eq_checks = new Array(256);
  const multi_or_checks1: Record<string, string> = {};
  const multi_or_checks2: Record<string, string> = {};

  let lines: string[] = [];

  lines.push('for (let i = 0; i < num_bytes; i++) {');
  // lines.push(`\tstate_changed[i] = Bool(false)`);

  for (let i = 1; i < N; i++) {
    const outputs: number[] = [];
    for (let prev_i of Object.keys(revGraph[i])) {
      const k = revGraph[i][Number(prev_i)];
      k.sort((a, b) => a - b);
      const eq_outputs: Array<[string, number]> = [];
      let vals = new Set(k);
      let is_negate = false;
      if (vals.has(0xff)) {
        vals.delete(0xff);
        is_negate = true;
      }
      if (vals.size === 0) {
        continue;
      }
      if (is_negate === true) {
        for (let another_i = 1; another_i < N; another_i++) {
          if (i === another_i) {
            continue;
          }
          if (revGraph[another_i][Number(prev_i)] === null) {
            continue;
          }
          const another_vals = new Set(revGraph[another_i][Number(prev_i)]);
          if (another_vals.size === 0) {
            continue;
          }
          for (let another_val of another_vals) {
            vals.add(another_val);
          }
        }
      }

      const min_maxes: [number, number][] = [];
      let cur_min = k[0];
      let cur_max = k[0];
      for (let idx = 1; idx < k.length; ++idx) {
        if (cur_max + 1 === k[idx]) {
          cur_max += 1;
        } else {
          if (cur_max - cur_min >= 16) {
            min_maxes.push([cur_min, cur_max]);
          }
          cur_min = k[idx];
          cur_max = k[idx];
        }
      }

      if (cur_max - cur_min >= 16) {
        min_maxes.push([cur_min, cur_max]);
      }
      for (const min_max of min_maxes) {
        for (let code = min_max[0]; code <= min_max[1]; ++code) {
          vals.delete(code);
        }
      }

      // refactored the code from below when handling lower & upper alphabetic and digits
      for (let min_max of min_maxes) {
        const min = min_max[0];
        const max = min_max[1];
        if (range_checks[min][max] === undefined) {
          lines.push(
            `\tconst lt${lt_i} = new UInt8(${min}).lessThanOrEqual(input[i]);`
          );

          lines.push(
            `\tconst lt${lt_i + 1} = input[i].lessThanOrEqual(${max});`
          );

          lines.push(`\tconst and${and_i} = lt${lt_i}.and(lt${lt_i + 1});`);

          eq_outputs.push(['and', and_i]);
          range_checks[min][max] = [lt_i, and_i];
          lt_i += 2;
          and_i += 1;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          let [_, and_i] = range_checks[min][max];
          eq_outputs.push(['and', and_i]);
        }
      }

      for (let code of vals) {
        if (eq_checks[code] === undefined) {
          lines.push(`\tconst eq${eq_i} = input[i].value.equals(${code});`);

          eq_outputs.push(['eq', eq_i]);
          eq_checks[code] = eq_i;
          eq_i += 1;
        } else {
          eq_outputs.push(['eq', eq_checks[code]]);
        }
      }
      if (eq_outputs.length === 1) {
        if (is_negate) {
          lines.push(
            `\tconst and${and_i} = states[i][${prev_i}].and(${eq_outputs[0][0]}${eq_outputs[0][1]}.not());`
          );
        } else {
          lines.push(
            `\tconst and${and_i} = states[i][${prev_i}].and(${eq_outputs[0][0]}${eq_outputs[0][1]});`
          );
        }
      } else if (eq_outputs.length > 1) {
        const eq_outputs_key = JSON.stringify(eq_outputs);
        if (multi_or_checks1[eq_outputs_key] === undefined) {
          lines.push(`\tlet multi_or${multi_or_i} = Bool(false);`);

          for (let output_i = 0; output_i < eq_outputs.length; output_i++) {
            lines.push(
              `\tmulti_or${multi_or_i} = multi_or${multi_or_i}.or(${eq_outputs[output_i][0]}${eq_outputs[output_i][1]});`
            );
          }
          if (is_negate) {
            lines.push(
              `\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_i}.not());`
            );
          } else {
            lines.push(
              `\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_i});`
            );
          }
          multi_or_checks1[eq_outputs_key] = multi_or_i.toString();
          multi_or_i += 1;
        } else {
          if (is_negate) {
            lines.push(
              `\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_checks1[eq_outputs_key]}.not());`
            );
          } else {
            lines.push(
              `\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_checks1[eq_outputs_key]});`
            );
          }
        }
      }

      outputs.push(and_i);
      and_i += 1;
    }

    if (outputs.length === 1) {
      lines.push(`\tstates[i+1][${i}] = and${outputs[0]};`);
    } else if (outputs.length > 1) {
      const outputs_key = JSON.stringify(outputs);
      if (multi_or_checks2[outputs_key] === undefined) {
        lines.push(`\tlet multi_or${multi_or_i} = Bool(false);`);
        for (let output_i = 0; output_i < outputs.length; output_i++) {
          lines.push(
            `\tmulti_or${multi_or_i} = multi_or${multi_or_i}.or(and${outputs[output_i]});`
          );
        }
        lines.push(`\tstates[i+1][${i}] = multi_or${multi_or_i};`);
        multi_or_checks2[outputs_key] = multi_or_i.toString();
        multi_or_i += 1;
      } else {
        lines.push(
          `\tstates[i+1][${i}] = multi_or${multi_or_checks2[outputs_key]};`
        );
      }
    }
    lines.push(`\tstate_changed[i] = state_changed[i].or(states[i+1][${i}]);`);
  }

  lines.push(`\tstates[i+1][0] = state_changed[i].not();`);
  lines.push('}');

  return lines;
}

function writeDeclarationLines() {
  const declarations: string[] = [];

  declarations.push(`\tconst num_bytes = input.length;`);
  declarations.push(
    `let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);`
  );
  declarations.push(
    `let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));`
  );
  // declarations.push(`\n\tlet input = [...inputBytes];`);
  // declarations.push(`input.unshift(Field(255));`);

  declarations.push('');

  return declarations;
}

function writeInitLines() {
  const init_code: string[] = [];

  // init_code.push("for (let i = 0; i < num_bytes; i++) {");
  // init_code.push("\tstates[i][0] = Bool(true);");
  // init_code.push("}");
  // ---
  init_code.push(`states[0][0] = Bool(true);`);
  init_code.push(`for (let i = 1; i < ${N}; i++) {`);
  init_code.push('\tstates[0][i] = Bool(false);');
  init_code.push('}');
  init_code.push('');

  return init_code;
}

let lines: string[] = [];
lines = writeDeclarationLines()
  .concat(writeInitLines())
  .concat(writeBodyLines());

const accept_node: number = acceptNodesArray[0];

function writeAcceptLines() {
  const accept_lines = [''];

  if (countEnabled) {
    accept_lines.push('let final_state_sum: Field[] = [];');
    accept_lines.push(
      `final_state_sum[0] = states[0][${accept_node}].toField();`
    );
    accept_lines.push('for (let i = 1; i <= num_bytes; i++) {');
    accept_lines.push(
      `\tfinal_state_sum[i] = final_state_sum[i-1].add(states[i][${accept_node}].toField());`
    );
    accept_lines.push('}');
    accept_lines.push('const out = final_state_sum[num_bytes];\n');
    // accept_lines.push("\n\treturn out;");
  } else {
    // when the regex pattern is fully repeated using the + operator - example: [a-z]+
    if (graphJson.length === 2 && Object.keys(revGraph[1]).length === 2) {
      accept_lines.push('let final_state_result = Bool(true);');
      accept_lines.push('for (let i = 1; i <= num_bytes; i++) {');
      accept_lines.push(
        `\tfinal_state_result = final_state_result.and(states[i][${accept_node}]);`
      );
      accept_lines.push('}');
    } else {
      accept_lines.push('let final_state_result = Bool(false);');
      accept_lines.push('for (let i = 0; i <= num_bytes; i++) {');
      accept_lines.push(
        `\tfinal_state_result = final_state_result.or(states[i][${accept_node}]);`
      );
      accept_lines.push('}');
    }
    accept_lines.push('const out = final_state_result;\n');
  }

  return accept_lines;
}

lines = lines.concat(writeAcceptLines());

function substring_lines(substrDefsArray: [number, number][][]): string {
  let reveal = '';
  reveal += '\n';
  reveal += '\tconst msg_bytes = num_bytes - 1;\n';
  reveal +=
    '\tconst is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);\n';
  reveal += '\tis_consecutive[msg_bytes][1] = Bool(true);\n';
  reveal += '\tfor (let i = 0; i < msg_bytes; i++) {\n';
  reveal += `\t\tis_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][${accept_node}].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);\n`;
  reveal +=
    '\t\tis_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);\n';
  reveal += '\t}\n\n';
  reveal += `\t// revealed transitions: ${JSON.stringify(substrDefsArray)}\n`;
  reveal += `\tlet reveal: Field[][] = [];`;

  for (let idx = 0; idx < substrDefsArray.length; idx++) {
    const defs = substrDefsArray[idx];
    const numDefs = defs.length;

    let includes_accept = defs.flat().includes(accept_node);
    let bound_accept = includes_accept ? '' : ' - 1';
    let includes_start = defs.flat().includes(0);
    const startIndex = defs.find((sub) => sub.includes(0))?.[1];

    reveal += `\n\n\t// the ${idx}-th substring transitions: ${JSON.stringify(
      defs
    )}\n`;
    reveal += `\tconst is_reveal${idx}: Bool[] = [];\n`;
    reveal += `\tlet is_substr${idx}: Bool[][] = Array.from({ length: msg_bytes }, () => []);\n`;
    reveal += `\tconst reveal${idx}: Field[] = [];\n`;
    reveal += `\tfor (let i = 0; i < msg_bytes${bound_accept}; i++) {\n`;
    reveal += `\t\tis_substr${idx}[i][0] = Bool(false);\n`;

    for (let j = 0; j < defs.length; j++) {
      const [cur, next] = defs[j];
      reveal += `\t\tis_substr${idx}[i][${
        j + 1
      }] = is_substr${idx}[i][${j}].or(`;
      reveal += `states[i+1][${cur}].and(states[i+2][${next}]));\n`;
    }

    reveal += `\t\tis_reveal${idx}[i] = is_substr${idx}[i][${numDefs}].and(is_consecutive[i][1]);\n`;
    reveal += `\t\treveal${idx}[i] = input[i+1].value.mul(is_reveal${idx}[i].toField());\n`;
    reveal += '\t}\n';
    reveal += includes_start
      ? `\treveal${idx}.unshift(input[0].value.mul(states[1][${startIndex}].toField()));\n`
      : '';
    reveal += `\treveal.push(reveal${idx});`;
  }

  return reveal;
}

function writeRevealLines() {
  let reveal_lines: string;
  if (substringEnabled) {
    const parsedInput: string[] | [number, number][][] = JSON.parse(
      process.argv[3]
    );

    let revealedTransitions: [number, number][][];
    // Type guard to check if parsedInput is an array of strings
    try {
      revealedTransitions = extractSubstrTransitions(parsedInput as string[]);
    } catch (error) {
      revealedTransitions = parsedInput as [number, number][][];
    }

    reveal_lines =
      substring_lines(revealedTransitions) + '\n\n\treturn { out, reveal };';
  } else {
    reveal_lines = '\n\treturn out;';
  }

  return reveal_lines;
}

export const functionString =
  '\n(input: UInt8[]) {\n' + lines.join('\n\t') + writeRevealLines() + '\n}';

const BOLD_GREEN = '\x1b[32;1m';
console.log(
  BOLD_GREEN,
  '-------------------- YOU CAN COPY THE O1JS ZK REGEX CIRCUIT BELOW --------------------\x1b[0m'
);
console.log(functionString);

function extractSubstrTransitions(partRegexArray: string[]) {
  let substrDefsArray: [number, number][][] = [];
  for (const partRegex of partRegexArray) {
    assert(
      rawRegex.includes(partRegex),
      'Input substring is not found within the entire regex pattern!'
    );
    const parsedPartRegex = parseRawRegex(partRegex, false);
    const expandedPartRegex: GraphTransition[] = JSON.parse(
      generateMinDfaGraph(parsedPartRegex, false)
    );
    let extractedInputs = expandedPartRegex
      .filter((node) => node.type === '')
      .map((x) => Object.keys(x.transition))
      .flat();

    extractedInputs = Array.from(new Set(extractedInputs));
    let partSubstrDefsArray: [number, number][] = [];
    for (const extractedInput of extractedInputs) {
      for (let key of Object.keys(revGraphString)) {
        const toState = parseInt(key);
        const incomingStates = Object.keys(revGraphString[toState]).map((x) =>
          parseInt(x)
        );
        for (const fromState of incomingStates) {
          if (revGraphString[toState][fromState] === extractedInput)
            partSubstrDefsArray.push([fromState, toState]);
        }
      }
    }
    substrDefsArray.push(partSubstrDefsArray);
  }

  return substrDefsArray;
}

//TODO Declare state_changed outside of the loop declaration
//TODO Refactor is_substr calculation
//TODO Fix occurence compiler code when regex ends with repetition operator +
//TODO Organize zkRegex compiler into a class
//TODO Add the option to reveal substrings based on search functions .i.e. isDigit, isNumber etc...
//TODO Refine notations for both compile and compiled code
