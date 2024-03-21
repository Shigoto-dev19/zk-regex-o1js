//TODO Use eval() to return a function from the regex compiler
//TODO Fix the DFA generator to customly take regex expressions as inputs

import { Bool, Field } from 'o1js';

export { simpleRegex }

function simpleRegex(input: Field[]) {
    const num_bytes = input.length;
    let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);

    for (let i = 0; i < num_bytes; i++) {
            states[i][0] = Bool(true);
    }
    for (let i = 1; i < 10; i++) {
            states[0][i] = Bool(false);
    }

    for (let i = 0; i < num_bytes; i++) {
            const eq0 = input[i].equals(49);
            const and0 = states[i][0].and(eq0);
            states[i+1][1] = and0;
            const eq1 = input[i].equals(61);
            const and1 = states[i][1].and(eq1);
            states[i+1][2] = and1;
            const eq2 = input[i].equals(97);
            const eq3 = input[i].equals(98);
            let multi_or0 = Bool(false);
            multi_or0 = multi_or0.or(eq2);
            multi_or0 = multi_or0.or(eq3);
            const and2 = states[i][2].and(multi_or0);
            states[i+1][3] = and2;
            const eq4 = input[i].equals(32);
            const and3 = states[i][3].and(eq4);
            states[i+1][4] = and3;
            const eq5 = input[i].equals(50);
            const and4 = states[i][4].and(eq5);
            const eq6 = input[i].equals(50);
            const and5 = states[i][8].and(eq6);
            let multi_or1 = Bool(false);
            multi_or1 = multi_or1.or(and4);
            multi_or1 = multi_or1.or(and5);
            states[i+1][5] = multi_or1;
            const eq7 = input[i].equals(61);
            const and6 = states[i][5].and(eq7);
            states[i+1][6] = and6;
            const eq8 = input[i].equals(98);
            const eq9 = input[i].equals(99);
            let multi_or2 = Bool(false);
            multi_or2 = multi_or2.or(eq8);
            multi_or2 = multi_or2.or(eq9);
            const and7 = states[i][6].and(multi_or2);
            const eq10 = input[i].equals(98);
            const eq11 = input[i].equals(99);
            let multi_or3 = Bool(false);
            multi_or3 = multi_or3.or(eq10);
            multi_or3 = multi_or3.or(eq11);
            const and8 = states[i][7].and(multi_or3);
            let multi_or4 = Bool(false);
            multi_or4 = multi_or4.or(and7);
            multi_or4 = multi_or4.or(and8);
            states[i+1][7] = multi_or4;
            const eq12 = input[i].equals(32);
            const and9 = states[i][7].and(eq12);
            states[i+1][8] = and9;
            const eq13 = input[i].equals(100);
            const and10 = states[i][8].and(eq13);
            states[i+1][9] = and10;
    }

    let final_state_sum: Field[] = [];
    final_state_sum[0] = states[0][9].toField();
    for (let i = 1; i <= num_bytes; i++) {
            final_state_sum[i] = final_state_sum[i-1].add(states[i][9].toField());
    }
    const out = final_state_sum[num_bytes];
    
    return Bool(out.value);
}