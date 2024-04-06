//TODO Declare state_changed outside of the loop declaration

import { 
    parseRawRegex, 
    generateMinDfaGraph, 
} from "./regexToDfa.js";

type StateTransition = {
    type: string;
    transition: Record<string, number>;
};

class ExtendedSet<T> extends Set<T> {
    isSuperset(subset: Set<T>): boolean {
        if (this.size === 0) {
            return false;
        }
        for (let elem of subset) {
            if (!this.has(elem)) {
                return false;
            }
        }
        return true;
    }

    difference(setB: Set<T>): void {
        for (let elem of setB) {
            this.delete(elem);
        }
    }
}

const rawRegex = process.argv[2] ?? "[^aeiou]+";
const expandedRegex = parseRawRegex(rawRegex);
const graphJson: StateTransition[] = JSON.parse(generateMinDfaGraph(expandedRegex));

const N = graphJson.length;

// Outgoing nodes
const graph: Record<number, number[]>  = Array.from({ length: N }, () => ([]));

// Incoming Nodes
const revGraph: Record<number, Record<number, number[]>> = Array.from({ length: N }, () => ({}));

const acceptNodes: Set<number> = new Set();

let init_going_state = null;

for (let i = 0; i < N; i++) {
    const currentNode = graphJson[i];
    for (let k in currentNode.transition) {
        const v = currentNode.transition[k];
        const charBytes = k.split(',').map((c: string) => c.charCodeAt(0));
        revGraph[v][i] = charBytes;
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
        revGraph[goingStateIndex][init_going_state] = revGraph[goingStateIndex][init_going_state].concat(chars);
    }
}

const acceptNodesArray: number[] = Array.from(acceptNodes);

if (acceptNodesArray.length !== 1) {
    throw new Error("Accept nodes length must be exactly 1.");
}

if (acceptNodesArray.includes(0)) {
    throw new Error('0 should not be in accept nodes');
}

let eq_i = 0;
let lt_i = 0;
let and_i = 0;
let multi_or_i = 0;

const uppercase = new Set(Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map(c => c.charCodeAt(0)));
const lowercase = new Set(Array.from("abcdefghijklmnopqrstuvwxyz").map(c => c.charCodeAt(0)));
const digits = new Set(Array.from("0123456789").map(c => c.charCodeAt(0)));
const symbols1 = new Set([":", ";", "<", "=", ">", "?", "@"].map(c => c.charCodeAt(0)));
const symbols2 = new Set(["[", "\\", "]", "^", "_", "`"].map(c => c.charCodeAt(0)));
const symbols3 = new Set(["{", "|", "}", "~"].map(c => c.charCodeAt(0)));

let lines: string[] = [];

lines.push("for (let i = 0; i < num_bytes; i++) {");
// lines.push(`\tstate_changed[i] = Bool(false)`);

for (let i = 1; i < N; i++) {
    const outputs: number[] = [];
    for (let prev_i of Object.keys(revGraph[i])) {
        const k = revGraph[i][Number(prev_i)];
        const eq_outputs: Array<[string, number]> = [];
        let vals = new ExtendedSet(k);
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
        const min_maxs: [number, number][] = [];
        for (let subsets of [
            [digits, 47, 58],
            [symbols1, 57, 65],
            [uppercase, 64, 91],
            [symbols2, 90, 97],
            [lowercase, 96, 123],
            [symbols3, 122, 127]
        ]) {
            const subset = subsets[0] as Set<number>;
            const min = subsets[1] as number;
            const max = subsets[2] as number;
            if (vals.isSuperset(subset)) {
                vals.difference(subset);
                if (min_maxs.length == 0) {
                    min_maxs.push([min, max]);
                } else {
                    const last = min_maxs[min_maxs.length - 1];
                    if (last[1] - 1 == min) {
                        min_maxs[min_maxs.length - 1][1] = max;
                    } else {
                        min_maxs.push([min, max]);
                    }
                }
            }
        }
        
        // refactored the code from below when handling lower & upper alphabetic and digits
        for (let min_max of min_maxs) {
            lines.push(`\tconst lt${lt_i} = Field(${min_max[0]}).lessThan(input[i]);`);

            lines.push(`\tconst lt${lt_i+1} = input[i].lessThan(${min_max[1]});`);

            lines.push(`\tconst and${and_i} = lt${lt_i}.and(lt${lt_i+1})`);

            eq_outputs.push(['and', and_i]);
            lt_i += 2
            and_i += 1
        }

        for (let code of vals) {
            lines.push(`\tconst eq${eq_i} = input[i].equals(${code});`);
            
            eq_outputs.push(['eq', eq_i]);
            eq_i += 1;
        }

        if (eq_outputs.length === 1) {
            if (is_negate) {
                lines.push(`\tconst and${and_i} = states[i][${prev_i}].and(${eq_outputs[0][0]}${eq_outputs[0][1]}.not());`);
            } else {
                lines.push(`\tconst and${and_i} = states[i][${prev_i}].and(${eq_outputs[0][0]}${eq_outputs[0][1]});`);            }
        } else if (eq_outputs.length > 1) {
            lines.push(`\tlet multi_or${multi_or_i} = Bool(false);`);

            for (let output_i = 0; output_i < eq_outputs.length; output_i++) {
                lines.push(`\tmulti_or${multi_or_i} = multi_or${multi_or_i}.or(${eq_outputs[output_i][0]}${eq_outputs[output_i][1]});`);
            }
            if (is_negate) {
                lines.push(`\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_i}.not());`);
            } else {
                lines.push(`\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_i});`);
            }
            multi_or_i += 1;
        }

        outputs.push(and_i);
        and_i += 1;
    }

    if (outputs.length === 1) {    
        lines.push(`\tstates[i+1][${i}] = and${outputs[0]};`);
    } else if (outputs.length > 1) {
        lines.push(`\tlet multi_or${multi_or_i} = Bool(false);`);
        for (let output_i = 0; output_i < outputs.length; output_i++) {
            lines.push(`\tmulti_or${multi_or_i} = multi_or${multi_or_i}.or(and${outputs[output_i]});`);                            
        }
        lines.push(`\tstates[i+1][${i}] = multi_or${multi_or_i};`);
        multi_or_i += 1
    }
    lines.push(`\tstate_changed[i] = state_changed[i].or(states[i+1][${i}]);`);
}

lines.push(`\tstates[i+1][0] = state_changed[i].not();`);
lines.push("}");

const declarations: string[] = [];

declarations.push(`\tconst num_bytes = input.length;`);
declarations.push(`let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);`);
declarations.push(`let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));`);
// declarations.push(`\nlet input = [...inputBytes];`);
// declarations.push(`input.unshift(Field(255));`);

declarations.push("");

const init_code: string[] = [];

// init_code.push("for (let i = 0; i < num_bytes; i++) {");
// init_code.push("\tstates[i][0] = Bool(true);");
// init_code.push("}");
// ---
init_code.push(`states[0][0] = Bool(true);`);
init_code.push(`for (let i = 1; i < ${N}; i++) {`);
init_code.push("\tstates[0][i] = Bool(false);");
init_code.push("}");
init_code.push("");

// lines = [...declarations, ...init_code, ...lines];
lines = declarations.concat(init_code).concat(lines);

const accept_node: number = acceptNodesArray[0];
const accept_lines = [""];

const occurence = true;
if (occurence) {
    accept_lines.push("let final_state_sum: Field[] = [];");
    accept_lines.push(`final_state_sum[0] = states[0][${accept_node}].toField();`);
    accept_lines.push("for (let i = 1; i <= num_bytes; i++) {");
    accept_lines.push(`\tfinal_state_sum[i] = final_state_sum[i-1].add(states[i][${accept_node}].toField());`);
    accept_lines.push("}");
    accept_lines.push("const out = final_state_sum[num_bytes];");
    accept_lines.push("\n\treturn out;")
} else {
    accept_lines.push("let final_state_result = Bool(false);");
    accept_lines.push("for (let i = 0; i <= num_bytes; i++) {");
    accept_lines.push(`\tfinal_state_result = final_state_result.or(states[i][${accept_node}]);`);
    accept_lines.push("}");
    accept_lines.push("\n\treturn final_state_result;");
}


lines.push(...accept_lines);

export const functionString = 
    "\n(input: Field[]) {\n" +
    lines.join('\n\t') + 
    "\n}";

const BOLD_GREEN = "\x1b[32;1m";
console.log(BOLD_GREEN, "-------------------- YOU CAN COPY THE O1JS ZK REGEX CIRCUIT BELOW --------------------\x1b[0m")
console.log(functionString);