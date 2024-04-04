import { 
    parseRawRegex, 
    generateMinDfaGraph, 
} from "./regexToDfa.js";

type RegexGraph = {
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

const regex = parseRawRegex("1=(a|b) (2=(b|c)+ )+d");
const graphJson: RegexGraph[] = JSON.parse(generateMinDfaGraph(regex));
console.log('graphJson: ', graphJson);

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
                revGraph[v][i][index] = 128;
            }
            for (let j = 0; j < revGraph[v][i].length; j++) {
                if (revGraph[v][i][j] == 128) {
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

lines.push("\tfor (var i = 0; i < num_bytes; i++) {");
lines.push(`\t\tstate_changed[i] = MultiOR(${N - 1});`);

for (let i = 1; i < N; i++) {
    const outputs: number[] = [];
    let is_negates = [];
    for (let prev_i of Object.keys(revGraph[i])) {
        const k = revGraph[i][Number(prev_i)];
        const eq_outputs: Array<[string, number]> = [];
        let vals = new ExtendedSet(k);
        if (vals.has(0xff)) {
            vals.delete(0xff);
            is_negates.push(true);
        } else {
            is_negates.push(false);
        }
        if (vals.size === 0) {
            continue;
        }
        if (is_negates[is_negates.length - 1] === true) {
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
        
        // refactored the code from below when handling lower, upper, and digits
        for (let min_max of min_maxs) {
            lines.push(`\t\tlt[${lt_i}][i] = LessThan(8);`);
            lines.push(`\t\tlt[${lt_i}][i].in[0] <== ${min_max[0]};`);
            lines.push(`\t\tlt[${lt_i}][i].in[1] <== in[i];`);

            lines.push(`\t\tlt[${lt_i + 1}][i] = LessThan(8);`);
            lines.push(`\t\tlt[${lt_i + 1}][i].in[0] <== in[i];`);
            lines.push(`\t\tlt[${lt_i + 1}][i].in[1] <== ${min_max[1]};`);

            lines.push(`\t\tand[${and_i}][i] = AND();`);
            lines.push(`\t\tand[${and_i}][i].a <== lt[${lt_i}][i].out;`);
            lines.push(`\t\tand[${and_i}][i].b <== lt[${lt_i + 1}][i].out;`);

            eq_outputs.push(['and', and_i]);
            lt_i += 2
            and_i += 1
        }

        for (let code of vals) {
            lines.push(`\t\teq[${eq_i}][i] = IsEqual();`);
            lines.push(`\t\teq[${eq_i}][i].in[0] <== in[i];`);
            lines.push(`\t\teq[${eq_i}][i].in[1] <== ${code};`);
            
            eq_outputs.push(['eq', eq_i]);
            eq_i += 1;
        }

        lines.push(`\t\tand[${and_i}][i] = AND();`);
        lines.push(`\t\tand[${and_i}][i].a <== states[i][${prev_i}];`);

        if (eq_outputs.length === 1) {
            lines.push(`\t\tand[${and_i}][i].b <== ${eq_outputs[0][0]}[${eq_outputs[0][1]}][i].out;`);
        } else if (eq_outputs.length > 1) {
            lines.push(`\t\tmulti_or[${multi_or_i}][i] = MultiOR(${eq_outputs.length});`);
            for (let output_i = 0; output_i < eq_outputs.length; output_i++) {
                lines.push(`\t\tmulti_or[${multi_or_i}][i].in[${output_i}] <== ${eq_outputs[output_i][0]}[${eq_outputs[output_i][1]}][i].out;`);
            }
            lines.push(`\t\tand[${and_i}][i].b <== multi_or[${multi_or_i}][i].out;`);
            multi_or_i += 1;
        }

        outputs.push(and_i);
        and_i += 1;
    }

    if (outputs.length === 1) {
        if (is_negates[0]) {
            lines.push(`\t\tstates[i+1][${i}] <== 1 - and[${outputs[0]}][i].out;`);
        } else {
            lines.push(`\t\tstates[i+1][${i}] <== and[${outputs[0]}][i].out;`);
        }
    } else if (outputs.length > 1) {
        lines.push(`\t\tmulti_or[${multi_or_i}][i] = MultiOR(${outputs.length});`);
        for (let output_i = 0; output_i < outputs.length; output_i++) {
            if (is_negates[output_i]) {
                lines.push(`\t\tmulti_or[${multi_or_i}][i].in[${output_i}] <== 1 - and[${outputs[output_i]}][i].out;`);
            } else {
                lines.push(`\t\tmulti_or[${multi_or_i}][i].in[${output_i}] <== and[${outputs[output_i]}][i].out;`);
            }
        }
        lines.push(`\t\tstates[i+1][${i}] <== multi_or[${multi_or_i}][i].out;`);
        multi_or_i += 1
    }
    lines.push(`\t\tstate_changed[i].in[${i - 1}] <== states[i+1][${i}];`);
}

lines.push(`\t\tstates[i+1][0] <== 1 - state_changed[i].out;`);
lines.push("\t}");

const declarations: string[] = [];
declarations.push(`pragma circom 2.1.5;\n`);
declarations.push(`include "zk-regex-circom/circuits/regex_helpers.circom";\n`);
declarations.push(`template zk-regex(msg_bytes) {`);
declarations.push(`\tsignal input msg[msg_bytes];`);
declarations.push(`\tsignal output out;\n`);
declarations.push(`\tvar num_bytes = msg_bytes+1;`);
declarations.push(`\tsignal in[num_bytes];`);
declarations.push(`\tin[0] <== 128;`);
declarations.push(`\tfor (var i = 0; i < msg_bytes; i++) {`);
declarations.push(`\t\tin[i+1] <== msg[i];`);
declarations.push(`\t}\n`);
if (eq_i > 0) {
    declarations.push(`\tcomponent eq[${eq_i}][num_bytes];`);
}
if (lt_i > 0) {
    declarations.push(`\tcomponent lt[${lt_i}][num_bytes];`);
}
if (and_i > 0) {
    declarations.push(`\tcomponent and[${and_i}][num_bytes];`);
}
if (multi_or_i > 0) {
    declarations.push(`\tcomponent multi_or[${multi_or_i}][num_bytes];`);
}
declarations.push(`\tsignal states[num_bytes+1][${N}];`);
declarations.push(`\tcomponent state_changed[num_bytes];`);
declarations.push("");

const init_code: string[] = [];

init_code.push(`\tstates[0][0] <== 1;`);
init_code.push(`\tfor (var i = 1; i < ${N}; i++) {`);
init_code.push(`\t\tstates[0][i] <== 0;`);
init_code.push("\t}");
init_code.push("");

// lines = [...declarations, ...init_code, ...lines];
lines = declarations.concat(init_code).concat(lines);

const accept_node = acceptNodesArray[0];
const accept_lines = [""];
accept_lines.push("\tcomponent final_state_result = MultiOR(num_bytes+1);");
accept_lines.push("\tfor (var i = 0; i <= num_bytes; i++) {");
accept_lines.push(`\t\tfinal_state_result.in[i] <== states[i][${accept_node}];`);
accept_lines.push("\t}");
accept_lines.push("\tout <== final_state_result.out;");

// lines.push(...accept_lines);
lines = lines.concat(accept_lines);
let stringCircuit = lines.reduce((res, line) => res + line + "\n", "");
console.log(stringCircuit);
// console.log(lines.join("\n"));
