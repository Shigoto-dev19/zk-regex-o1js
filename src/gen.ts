//TODO Convert from circom to o1js
import { assert } from "o1js";
import { 
    test_regex, 
    printGraphForRegex, 
    RegexGraph,
} from "./regex_to_dfa.js";

const regex = test_regex();
const graphJson: RegexGraph[] = JSON.parse(printGraphForRegex(regex));

const N = graphJson.length;

// Outgoing nodes
const graph: Record<string, number>[] = Array.from({ length: N }, () => ({}));

// Incoming Nodes
const revGraph: [string, number][][] = Array.from({ length: N }, () => []);

const acceptNodes: Set<number> = new Set();

for (let i = 0; i < N; i++) {
    // graph.push({});
    // revGraph.push([]);
    const currentNode = graphJson[i];
    for (const k in currentNode.natureEdges) {
        const v = currentNode.natureEdges[k];
        graph[i][k] = v;
        revGraph[v].push([k, i]);
    }
    if (currentNode.type === 'accept') {
        acceptNodes.add(i);
    }
}

const acceptNodesArray: number[] = Array.from(acceptNodes);
if (acceptNodesArray.length !== 1) {
    throw new Error("Accept nodes length must be exactly 1.");
}

let eq_i = 0;
let lt_i = 0;
let and_i = 0;
let multi_or_i = 0;

let lines: string[] = [];
lines.push("for (var i = 0; i < num_bytes; i++) {");

if (acceptNodesArray.includes(0)) {
    throw new Error('0 should not be in accept nodes');
}

for (let i = 1; i < N; i++) {
    const outputs: number[] = [];
    for (const [k, prev_i] of revGraph[i]) {
        let vals: Set<string> = new Set(k.split(','));
        const eq_outputs: Array<[string, number]> = [];

        const uppercase: Set<string> = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
        const lowercase: Set<string> = new Set("abcdefghijklmnopqrstuvwxyz");
        const digits: Set<string> = new Set("0123456789");

        if (Array.from(uppercase).every(val => vals.has(val))) {
            // vals.forEach(val => vals.delete(val));
            vals = new Set([...vals].filter(char => !uppercase.has(char)));
            lines.push(`\tlt[${lt_i}][i] = LessThan(8);`);
            lines.push(`\tlt[${lt_i}][i].in[0] <== 64;`);
            lines.push(`\tlt[${lt_i}][i].in[1] <== in[i];`);

            lines.push(`\tlt[${lt_i+1}][i] = LessThan(8);`);
            lines.push(`\tlt[${lt_i+1}][i].in[0] <== in[i];`);
            lines.push(`\tlt[${lt_i+1}][i].in[1] <== 91;`);

            lines.push(`\tand[${and_i}][i] = AND();`);
            lines.push(`\tand[${and_i}][i].a <== lt[${lt_i}][i].out;`);
            lines.push(`\tand[${and_i}][i].b <== lt[${lt_i+1}][i].out;`);

            eq_outputs.push(['and', and_i]);
            lt_i += 2;
            and_i += 1;
        }

        if (Array.from(lowercase).every(val => vals.has(val))) {
            // vals.forEach(val => vals.delete(val));
            vals = new Set([...vals].filter(char => !lowercase.has(char)));
            lines.push("\tlt[{lt_i}][i] = LessThan(8);");
            lines.push("\tlt[{lt_i}][i].in[0] <== 96;");
            lines.push("\tlt[{lt_i}][i].in[1] <== in[i];");

            lines.push("\tlt[{lt_i+1}][i] = LessThan(8);");
            lines.push("\tlt[{lt_i+1}][i].in[0] <== in[i];");
            lines.push("\tlt[{lt_i+1}][i].in[1] <== 123;");

            lines.push("\tand[{and_i}][i] = AND();");
            lines.push("\tand[{and_i}][i].a <== lt[{lt_i}][i].out;");
            lines.push("\tand[{and_i}][i].b <== lt[{lt_i+1}][i].out;");

            eq_outputs.push(['and', and_i]);
            lt_i += 2
            and_i += 1
        }

        if (Array.from(digits).every(val => vals.has(val))) {
            // vals.forEach(val => vals.delete(val));
            vals = new Set([...vals].filter(char => !digits.has(char)));
            lines.push("\tlt[{lt_i}][i] = LessThan(8);");
            lines.push("\tlt[{lt_i}][i].in[0] <== 47;");
            lines.push("\tlt[{lt_i}][i].in[1] <== in[i];");

            lines.push("\tlt[{lt_i+1}][i] = LessThan(8);");
            lines.push("\tlt[{lt_i+1}][i].in[0] <== in[i];");
            lines.push("\tlt[{lt_i+1}][i].in[1] <== 58;");

            lines.push("\tand[{and_i}][i] = AND();");
            lines.push("\tand[{and_i}][i].a <== lt[{lt_i}][i].out;");
            lines.push("\tand[{and_i}][i].b <== lt[{lt_i+1}][i].out;");

            eq_outputs.push(['and', and_i]);
            lt_i += 2
            and_i += 1
        }
        for (const c of vals) {
            assert(c.length === 1 || c.length === 0);
            lines.push(`\teq[${eq_i}][i] = IsEqual();`);
            lines.push(`\teq[${eq_i}][i].in[0] <== in[i];`);
            lines.push(`\teq[${eq_i}][i].in[1] <== ${c.charCodeAt(0)};`);
            eq_outputs.push(['eq', eq_i]);
            eq_i += 1;
        }

        lines.push(`\tand[${and_i}][i] = AND();`);
        lines.push(`\tand[${and_i}][i].a <== states[i][${prev_i}];`);

        if (eq_outputs.length === 1) {
            lines.push(`\tand[${and_i}][i].b <== ${eq_outputs[0][0]}[${eq_outputs[0][1]}][i].out;`);
        } else if (eq_outputs.length > 1) {
            lines.push(`\tmulti_or[${multi_or_i}][i] = MultiOR(${eq_outputs.length});`);
            for (let output_i = 0; output_i < eq_outputs.length; output_i++) {
                lines.push(`\tmulti_or[${multi_or_i}][i].in[${output_i}] <== ${eq_outputs[output_i][0]}[${eq_outputs[output_i][1]}][i].out;`);
            }
            lines.push(`\tand[${and_i}][i].b <== multi_or[${multi_or_i}][i].out;`);
            multi_or_i += 1;
        }

        outputs.push(and_i);
        and_i += 1;
    }

    if (outputs.length === 1) {
        lines.push(`\tstates[i+1][${i}] <== and[${outputs[0]}][i].out;`);
    } else if (outputs.length > 1) {
        lines.push(`\tmulti_or[${multi_or_i}][i] = MultiOR(${outputs.length});`);
        for (let output_i = 0; output_i < outputs.length; output_i++) {
            lines.push(`\tmulti_or[${multi_or_i}][i].in[${output_i}] <== and[${outputs[output_i]}][i].out;`);
        }
        lines.push(`\tstates[i+1][${i}] <== multi_or[${multi_or_i}][i].out;`);
        multi_or_i += 1;
    }
}

lines.push("}");

const declarations: string[] = [];

if (eq_i > 0) {
    declarations.push(`component eq[${eq_i}][num_bytes];`);
}
if (lt_i > 0) {
    declarations.push(`component lt[${lt_i}][num_bytes];`);
}
if (and_i > 0) {
    declarations.push(`component and[${and_i}][num_bytes];`);
}
if (multi_or_i > 0) {
    declarations.push(`component multi_or[${multi_or_i}][num_bytes];`);
}
declarations.push(`signal states[num_bytes+1][${N}];`);
declarations.push("");

const init_code: string[] = [];

init_code.push("for (var i = 0; i < num_bytes; i++) {");
init_code.push("\tstates[i][0] <== 1;");
init_code.push("}");

init_code.push(`for (var i = 1; i < ${N}; i++) {`);
init_code.push("\tstates[0][i] <== 0;");
init_code.push("}");

init_code.push("");

lines = [...declarations, ...init_code, ...lines];

const accept_node: number = acceptNodesArray[0];
const accept_lines: string[] = [""];
accept_lines.push("signal final_state_sum[num_bytes+1];");
accept_lines.push(`final_state_sum[0] <== states[0][${accept_node}];`);
accept_lines.push("for (var i = 1; i <= num_bytes; i++) {");
accept_lines.push(`\tfinal_state_sum[i] <== final_state_sum[i-1] + states[i][${accept_node}];`);
accept_lines.push("}");
accept_lines.push("out <== final_state_sum[num_bytes];");

lines.push(...accept_lines);

console.log(lines.join("\n"));
