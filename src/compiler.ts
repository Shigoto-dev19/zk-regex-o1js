import { assert } from 'o1js';
import {
  parseRawRegex,
  generateMinDfaGraph,
  GraphTransition,
} from './regexToDfa.js';

type RevGraph<T> = Record<number, Record<number, T>>;
type RevGraphChar = RevGraph<number[]>;
type RevGraphString = RevGraph<string>;

export class RegexCompiler {
  readonly rawRegex: string;
  readonly expandedRegex: string;
  private graphJson: GraphTransition[];

  private nodeCount: number;
  private outgoingNodes: Record<number, number[]>;
  private incomingNodes: RevGraphChar;
  private incomingStringNodes: RevGraphString;

  private initialState: null | number = null;
  private acceptState: number;

  constructor(rawRegex: string) {
    this.rawRegex = rawRegex;
    this.expandedRegex = parseRawRegex(rawRegex);
    this.graphJson = JSON.parse(generateMinDfaGraph(this.expandedRegex));

    this.nodeCount = this.graphJson.length;
    this.outgoingNodes = Array.from({ length: this.nodeCount }, () => []);
    this.incomingNodes = Array.from({ length: this.nodeCount }, () => ({}));
    this.incomingStringNodes = Array.from(
      { length: this.nodeCount },
      () => ({})
    );
  }

  static initialize(rawRegex: string) {
    const regexCompiler = new RegexCompiler(rawRegex);
    regexCompiler.sortNodes();

    return regexCompiler;
  }

  private sortNodes() {
    const acceptNodes: Set<number> = new Set();
    for (let i = 0; i < this.nodeCount; i++) {
      const currentNode = this.graphJson[i];
      for (let k in currentNode.transition) {
        const v = currentNode.transition[k];
        const charBytes = k.split(',').map((c: string) => c.charCodeAt(0));
        this.incomingNodes[v][i] = charBytes;
        this.incomingStringNodes[v][i] = k;
        if (i === 0) {
          const index = this.incomingNodes[v][i].indexOf(94);
          if (index !== -1) {
            this.initialState = v;
            this.incomingNodes[v][i][index] = 255;
          }
          for (let j = 0; j < this.incomingNodes[v][i].length; j++) {
            if (this.incomingNodes[v][i][j] == 255) {
              continue;
            }
            this.outgoingNodes[v].push(this.incomingNodes[v][i][j]);
          }
        }
      }
      if (currentNode.type === 'accept') {
        acceptNodes.add(i);
      }
    }

    if (this.initialState !== null) {
      for (const [going_state, chars] of Object.entries(this.outgoingNodes)) {
        if (chars.length === 0) {
          continue;
        }
        const goingStateIndex = parseInt(going_state);
        if (this.incomingNodes[goingStateIndex][this.initialState] == null) {
          this.incomingNodes[goingStateIndex][this.initialState] = [];
        }
        this.incomingNodes[goingStateIndex][this.initialState] =
          this.incomingNodes[goingStateIndex][this.initialState].concat(chars);
      }
    }
    const acceptNodesArray: number[] = Array.from(acceptNodes);

    if (acceptNodesArray.length !== 1) {
      throw new Error('Accept nodes length must be exactly 1.');
    }

    if (acceptNodesArray.includes(0)) {
      throw new Error('0 should not be in accept nodes');
    }

    this.acceptState = acceptNodesArray[0];
  }

  private writeDeclarationLines() {
    const declarationLines: string[] = [];

    declarationLines.push(`\tconst num_bytes = input.length;`);
    declarationLines.push(
      `let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);`
    );
    declarationLines.push(
      `let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));`
    );
    // declarationLines.push(`\n\tlet input = [...inputBytes];`);
    // declarationLines.push(`input.unshift(Field(255));`);

    declarationLines.push('');

    return declarationLines;
  }

  private writeInitLines() {
    const initLines: string[] = [];

    // initLines.push("for (let i = 0; i < num_bytes; i++) {");
    // initLines.push("\tstates[i][0] = Bool(true);");
    // initLines.push("}");

    initLines.push(`states[0][0] = Bool(true);`);
    initLines.push(`for (let i = 1; i < ${this.nodeCount}; i++) {`);
    initLines.push('\tstates[0][i] = Bool(false);');
    initLines.push('}');
    initLines.push('');

    return initLines;
  }

  private writeBodyLines() {
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

    let bodyLines: string[] = [];

    bodyLines.push('for (let i = 0; i < num_bytes; i++) {');
    // bodyLines.push(`\tstate_changed[i] = Bool(false)`);

    for (let i = 1; i < this.nodeCount; i++) {
      const outputs: number[] = [];
      for (let prev_i of Object.keys(this.incomingNodes[i])) {
        const k = this.incomingNodes[i][Number(prev_i)];
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
          for (let another_i = 1; another_i < this.nodeCount; another_i++) {
            if (i === another_i) {
              continue;
            }
            if (this.incomingNodes[another_i][Number(prev_i)] === null) {
              continue;
            }
            const another_vals = new Set(
              this.incomingNodes[another_i][Number(prev_i)]
            );
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
            bodyLines.push(
              `\tconst lt${lt_i} = new UInt8(${min}).lessThanOrEqual(input[i]);`
            );

            bodyLines.push(
              `\tconst lt${lt_i + 1} = input[i].lessThanOrEqual(${max});`
            );

            bodyLines.push(
              `\tconst and${and_i} = lt${lt_i}.and(lt${lt_i + 1});`
            );

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
            bodyLines.push(
              `\tconst eq${eq_i} = input[i].value.equals(${code});`
            );

            eq_outputs.push(['eq', eq_i]);
            eq_checks[code] = eq_i;
            eq_i += 1;
          } else {
            eq_outputs.push(['eq', eq_checks[code]]);
          }
        }
        if (eq_outputs.length === 1) {
          if (is_negate) {
            bodyLines.push(
              `\tconst and${and_i} = states[i][${prev_i}].and(${eq_outputs[0][0]}${eq_outputs[0][1]}.not());`
            );
          } else {
            bodyLines.push(
              `\tconst and${and_i} = states[i][${prev_i}].and(${eq_outputs[0][0]}${eq_outputs[0][1]});`
            );
          }
        } else if (eq_outputs.length > 1) {
          const eq_outputs_key = JSON.stringify(eq_outputs);
          if (multi_or_checks1[eq_outputs_key] === undefined) {
            bodyLines.push(`\tlet multi_or${multi_or_i} = Bool(false);`);

            for (let output_i = 0; output_i < eq_outputs.length; output_i++) {
              bodyLines.push(
                `\tmulti_or${multi_or_i} = multi_or${multi_or_i}.or(${eq_outputs[output_i][0]}${eq_outputs[output_i][1]});`
              );
            }
            if (is_negate) {
              bodyLines.push(
                `\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_i}.not());`
              );
            } else {
              bodyLines.push(
                `\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_i});`
              );
            }
            multi_or_checks1[eq_outputs_key] = multi_or_i.toString();
            multi_or_i += 1;
          } else {
            if (is_negate) {
              bodyLines.push(
                `\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_checks1[eq_outputs_key]}.not());`
              );
            } else {
              bodyLines.push(
                `\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_checks1[eq_outputs_key]});`
              );
            }
          }
        }

        outputs.push(and_i);
        and_i += 1;
      }

      if (outputs.length === 1) {
        bodyLines.push(`\tstates[i+1][${i}] = and${outputs[0]};`);
      } else if (outputs.length > 1) {
        const outputs_key = JSON.stringify(outputs);
        if (multi_or_checks2[outputs_key] === undefined) {
          bodyLines.push(`\tlet multi_or${multi_or_i} = Bool(false);`);
          for (let output_i = 0; output_i < outputs.length; output_i++) {
            bodyLines.push(
              `\tmulti_or${multi_or_i} = multi_or${multi_or_i}.or(and${outputs[output_i]});`
            );
          }
          bodyLines.push(`\tstates[i+1][${i}] = multi_or${multi_or_i};`);
          multi_or_checks2[outputs_key] = multi_or_i.toString();
          multi_or_i += 1;
        } else {
          bodyLines.push(
            `\tstates[i+1][${i}] = multi_or${multi_or_checks2[outputs_key]};`
          );
        }
      }
      bodyLines.push(
        `\tstate_changed[i] = state_changed[i].or(states[i+1][${i}]);`
      );
    }

    bodyLines.push(`\tstates[i+1][0] = state_changed[i].not();`);
    bodyLines.push('}');

    return bodyLines;
  }

  private writeAcceptLines(countEnabled: boolean) {
    const acceptLines = [''];

    if (countEnabled) {
      acceptLines.push('let final_state_sum: Field[] = [];');
      acceptLines.push(
        `final_state_sum[0] = states[0][${this.acceptState}].toField();`
      );
      acceptLines.push('for (let i = 1; i <= num_bytes; i++) {');
      acceptLines.push(
        `\tfinal_state_sum[i] = final_state_sum[i-1].add(states[i][${this.acceptState}].toField());`
      );
      acceptLines.push('}');
      acceptLines.push('const out = final_state_sum[num_bytes];\n');
      // acceptLines.push("\n\treturn out;");
    } else {
      // when the regex pattern is fully repeated using the + operator - example: [a-z]+
      if (
        this.graphJson.length === 2 &&
        Object.keys(this.incomingNodes[1]).length === 2
      ) {
        acceptLines.push('let final_state_result = Bool(true);');
        acceptLines.push('for (let i = 1; i <= num_bytes; i++) {');
        acceptLines.push(
          `\tfinal_state_result = final_state_result.and(states[i][${this.acceptState}]);`
        );
        acceptLines.push('}');
      } else {
        acceptLines.push('let final_state_result = Bool(false);');
        acceptLines.push('for (let i = 0; i <= num_bytes; i++) {');
        acceptLines.push(
          `\tfinal_state_result = final_state_result.or(states[i][${this.acceptState}]);`
        );
        acceptLines.push('}');
      }
      acceptLines.push('const out = final_state_result;\n');
    }

    return acceptLines;
  }

  extractSubPatternTransitions(partRegexArray: string[]) {
    let subPatternDefsArray: [number, number][][] = [];
    for (const partRegex of partRegexArray) {
      assert(
        this.rawRegex.includes(partRegex),
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
        for (let key of Object.keys(this.incomingStringNodes)) {
          const toState = parseInt(key);
          const incomingStates = Object.keys(
            this.incomingStringNodes[toState]
          ).map((x) => parseInt(x));
          for (const fromState of incomingStates) {
            if (this.incomingStringNodes[toState][fromState] === extractedInput)
              partSubstrDefsArray.push([fromState, toState]);
          }
        }
      }
      subPatternDefsArray.push(partSubstrDefsArray);
    }

    return subPatternDefsArray;
  }

  private generateRevealLines(
    subPatternDefsArray: [number, number][][]
  ): string {
    let revealLines = '';
    revealLines += '\n';
    revealLines += '\tconst msg_bytes = num_bytes - 1;\n';
    revealLines +=
      '\tconst is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);\n';
    revealLines += '\tis_consecutive[msg_bytes][1] = Bool(true);\n';
    revealLines += '\tfor (let i = 0; i < msg_bytes; i++) {\n';
    revealLines += `\t\tis_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][${this.acceptState}].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);\n`;
    revealLines +=
      '\t\tis_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);\n';
    revealLines += '\t}\n\n';
    revealLines += `\t// revealed transitions: ${JSON.stringify(
      subPatternDefsArray
    )}\n`;
    revealLines += `\tlet reveal: Field[][] = [];`;

    for (let idx = 0; idx < subPatternDefsArray.length; idx++) {
      const defs = subPatternDefsArray[idx];
      const numDefs = defs.length;

      let includes_accept = defs.flat().includes(this.acceptState);
      let bound_accept = includes_accept ? '' : ' - 1';
      let includes_start = defs.flat().includes(0);
      const startIndex = defs.find((sub) => sub.includes(0))?.[1];

      revealLines += `\n\n\t// the ${idx}-th substring transitions: ${JSON.stringify(
        defs
      )}\n`;
      revealLines += `\tconst is_reveal${idx}: Bool[] = [];\n`;
      revealLines += `\tlet is_substr${idx}: Bool[][] = Array.from({ length: msg_bytes }, () => []);\n`;
      revealLines += `\tconst reveal${idx}: Field[] = [];\n`;
      revealLines += `\tfor (let i = 0; i < msg_bytes${bound_accept}; i++) {\n`;
      revealLines += `\t\tis_substr${idx}[i][0] = Bool(false);\n`;

      for (let j = 0; j < defs.length; j++) {
        const [cur, next] = defs[j];
        revealLines += `\t\tis_substr${idx}[i][${
          j + 1
        }] = is_substr${idx}[i][${j}].or(`;
        revealLines += `states[i+1][${cur}].and(states[i+2][${next}]));\n`;
      }

      revealLines += `\t\tis_reveal${idx}[i] = is_substr${idx}[i][${numDefs}].and(is_consecutive[i][1]);\n`;
      revealLines += `\t\treveal${idx}[i] = input[i+1].value.mul(is_reveal${idx}[i].toField());\n`;
      revealLines += '\t}\n';
      revealLines += includes_start
        ? `\treveal${idx}.unshift(input[0].value.mul(states[1][${startIndex}].toField()));\n`
        : '';
      revealLines += `\treveal.push(reveal${idx});`;
    }

    return revealLines;
  }

  private writeRevealLines(revealEnabled: boolean) {
    let revealLines: string;
    if (revealEnabled) {
      const parsedInput: string[] | [number, number][][] = JSON.parse(
        process.argv[3]
      );

      let revealedTransitions: [number, number][][];
      // Type guard to check if parsedInput is an array of strings
      try {
        revealedTransitions = this.extractSubPatternTransitions(
          parsedInput as string[]
        );
      } catch (error) {
        revealedTransitions = parsedInput as [number, number][][];
      }

      revealLines =
        this.generateRevealLines(revealedTransitions) +
        '\n\n\treturn { out, reveal };';
    } else {
      revealLines = '\n\treturn out;';
    }

    return revealLines;
  }

  printRegexCircuit(countEnabled: boolean, revealEnabled: boolean) {
    let circuitLines: string[] = [];
    circuitLines = this.writeDeclarationLines()
      .concat(this.writeInitLines())
      .concat(this.writeBodyLines())
      .concat(this.writeAcceptLines(countEnabled));

    const stringRegexCircuit =
      '\n(input: UInt8[]) {\n' +
      circuitLines.join('\n\t') +
      this.writeRevealLines(revealEnabled) +
      '\n}';

    const BOLD_GREEN = '\x1b[32;1m';
    console.log(
      BOLD_GREEN,
      '-------------------- YOU CAN COPY THE O1JS ZK REGEX CIRCUIT BELOW --------------------\x1b[0m'
    );

    console.log(stringRegexCircuit);
  }
}
