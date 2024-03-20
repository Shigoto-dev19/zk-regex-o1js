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
lines.push("for (let i = 0; i < num_bytes; i++) {");

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
            lines.push(`\tconst lt${lt_i} = Field(64).lessThan(input[i]);`);

            lines.push(`\tconst lt${lt_i+1} = input[i].lessThan(91);`);

            lines.push(`\tconst and${and_i} = lt${lt_i}.and(lt${lt_i+1})`);

            eq_outputs.push(['and', and_i]);
            lt_i += 2;
            and_i += 1;
        }

        if (Array.from(lowercase).every(val => vals.has(val))) {
            vals = new Set([...vals].filter(char => !lowercase.has(char)));
            
            lines.push(`\tconst lt${lt_i} = Field(96).lessThan(input[i]);`);
        
            lines.push(`\tconst lt${lt_i+1} = input[i].lessThan(123);`);
        
            lines.push(`\tconst and${and_i} = lt${lt_i}.and(lt${lt_i+1});`);

            eq_outputs.push(['and', and_i]);
            lt_i += 2
            and_i += 1
        }

        if (Array.from(digits).every(val => vals.has(val))) {
            vals = new Set([...vals].filter(char => !digits.has(char)));
            
            lines.push(`\tconst lt${lt_i} = Field(47).lessThan(input[i]);`);
            
            lines.push(`\tconst lt${lt_i+1} = input[i].lessThan(58);`);
            
            lines.push(`\tconst and${and_i} = lt${lt_i}.and(lt${lt_i+1});`);
            
            eq_outputs.push(['and', and_i]);
            lt_i += 2
            and_i += 1
        }
        for (const c of vals) {
            assert(c.length === 1 || c.length === 0);
            lines.push(`\tconst eq${eq_i} = input[i].equals(${c.charCodeAt(0)});`);

            eq_outputs.push(['eq', eq_i]);
            eq_i += 1;
        }

        // lines.push(`\tand[${and_i}][i] = AND();`);
        // lines.push(`\tand[${and_i}][i].a <== states[i][${prev_i}];`);

        if (eq_outputs.length === 1) {
            lines.push(`\tconst and${and_i} = states[i][${prev_i}].and(${eq_outputs[0][0]}${eq_outputs[0][1]});`);
        } else if (eq_outputs.length > 1) {
            lines.push(`\tlet multi_or${multi_or_i} = Bool(false);`);

            for (let output_i = 0; output_i < eq_outputs.length; output_i++) {
                lines.push(`\tmulti_or${multi_or_i} = multi_or${multi_or_i}.or(${eq_outputs[output_i][0]}${eq_outputs[output_i][1]});`);
            }
            lines.push(`\tconst and${and_i} = states[i][${prev_i}].and(multi_or${multi_or_i});`);
            multi_or_i += 1;
        }

        outputs.push(and_i);
        and_i += 1;
    }

    if (outputs.length === 1) {
        lines.push(`\tstates[i+1][${i}] = and${outputs[0]};`);

        // lines.push(`\tstates[i+1][${i}] <== and[${outputs[0]}][i].out;`);
    } else if (outputs.length > 1) {
        lines.push(`\tlet multi_or${multi_or_i} = Bool(false);`);

        // lines.push(`\tmulti_or[${multi_or_i}][i] = MultiOR(${outputs.length});`);
        for (let output_i = 0; output_i < outputs.length; output_i++) {
            lines.push(`\tmulti_or${multi_or_i} = multi_or${multi_or_i}.or(and${outputs[output_i]});`);
        }
        lines.push(`\tstates[i+1][${i}] = multi_or${multi_or_i};`);

        // lines.push(`\tstates[i+1][${i}] <== multi_or[${multi_or_i}][i].out;`);
        multi_or_i += 1;
    }
}

lines.push("}");

const declarations: string[] = [];

declarations.push(`const num_bytes = input.length;`);
declarations.push(`let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);`);
declarations.push("");

const init_code: string[] = [];

init_code.push("for (let i = 0; i < num_bytes; i++) {");
init_code.push("\tstates[i][0] = Bool(true);");
init_code.push("}");

init_code.push(`for (let i = 1; i < ${N}; i++) {`);
init_code.push("\tstates[0][i] = Bool(false);");
init_code.push("}");

init_code.push("");

lines = [...declarations, ...init_code, ...lines];

const accept_node: number = acceptNodesArray[0];
const accept_lines: string[] = [""];

accept_lines.push("let final_state_sum: Field[] = [];");
accept_lines.push(`final_state_sum[0] = states[0][${accept_node}].toField();`);
accept_lines.push("for (let i = 1; i <= num_bytes; i++) {");
accept_lines.push(`\tfinal_state_sum[i] = final_state_sum[i-1].add(states[i][${accept_node}].toField());`);
accept_lines.push("}");
accept_lines.push("const out = final_state_sum[num_bytes];");

lines.push(...accept_lines);

console.log(lines.join("\n"));