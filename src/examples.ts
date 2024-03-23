//TODO Use eval() to return a function from the regex compiler
//TODO Fix the DFA generator to customly take regex expressions as inputs

import { Bool, Field } from 'o1js';

export { simpleRegex, emailRegex }

// 1=(a|b) (2=(b|c)+ )+d
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
    
    return out;
}

// ([a-zA-Z0-9._%-=]+@[a-zA-Z0-9.-]+.[a-z])
function emailRegex(input: Field[]) {
        const num_bytes = input.length;
        let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);

        for (let i = 0; i < num_bytes; i++) {
                states[i][0] = Bool(true);
        }
        for (let i = 1; i < 6; i++) {
                states[0][i] = Bool(false);
        }

        for (let i = 0; i < num_bytes; i++) {
                const lt0 = Field(64).lessThan(input[i]);
                const lt1 = input[i].lessThan(91);
                const and0 = lt0.and(lt1)
                const lt2 = Field(96).lessThan(input[i]);
                const lt3 = input[i].lessThan(123);
                const and1 = lt2.and(lt3);
                const lt4 = Field(47).lessThan(input[i]);
                const lt5 = input[i].lessThan(58);
                const and2 = lt4.and(lt5);
                const eq0 = input[i].equals(37);
                const eq1 = input[i].equals(45);
                const eq2 = input[i].equals(46);
                const eq3 = input[i].equals(61);
                const eq4 = input[i].equals(95);
                let multi_or0 = Bool(false);
                multi_or0 = multi_or0.or(and0);
                multi_or0 = multi_or0.or(and1);
                multi_or0 = multi_or0.or(and2);
                multi_or0 = multi_or0.or(eq0);
                multi_or0 = multi_or0.or(eq1);
                multi_or0 = multi_or0.or(eq2);
                multi_or0 = multi_or0.or(eq3);
                multi_or0 = multi_or0.or(eq4);
                const and3 = states[i][0].and(multi_or0);
                const lt6 = Field(64).lessThan(input[i]);
                const lt7 = input[i].lessThan(91);
                const and4 = lt6.and(lt7)
                const lt8 = Field(96).lessThan(input[i]);
                const lt9 = input[i].lessThan(123);
                const and5 = lt8.and(lt9);
                const lt10 = Field(47).lessThan(input[i]);
                const lt11 = input[i].lessThan(58);
                const and6 = lt10.and(lt11);
                const eq5 = input[i].equals(37);
                const eq6 = input[i].equals(45);
                const eq7 = input[i].equals(46);
                const eq8 = input[i].equals(61);
                const eq9 = input[i].equals(95);
                let multi_or1 = Bool(false);
                multi_or1 = multi_or1.or(and4);
                multi_or1 = multi_or1.or(and5);
                multi_or1 = multi_or1.or(and6);
                multi_or1 = multi_or1.or(eq5);
                multi_or1 = multi_or1.or(eq6);
                multi_or1 = multi_or1.or(eq7);
                multi_or1 = multi_or1.or(eq8);
                multi_or1 = multi_or1.or(eq9);
                const and7 = states[i][1].and(multi_or1);
                let multi_or2 = Bool(false);
                multi_or2 = multi_or2.or(and3);
                multi_or2 = multi_or2.or(and7);
                states[i+1][1] = multi_or2;
                const eq10 = input[i].equals(64);
                const and8 = states[i][1].and(eq10);
                states[i+1][2] = and8;
                const lt12 = Field(64).lessThan(input[i]);
                const lt13 = input[i].lessThan(91);
                const and9 = lt12.and(lt13)
                const lt14 = Field(96).lessThan(input[i]);
                const lt15 = input[i].lessThan(123);
                const and10 = lt14.and(lt15);
                const lt16 = Field(47).lessThan(input[i]);
                const lt17 = input[i].lessThan(58);
                const and11 = lt16.and(lt17);
                const eq11 = input[i].equals(45);
                const eq12 = input[i].equals(46);
                let multi_or3 = Bool(false);
                multi_or3 = multi_or3.or(and9);
                multi_or3 = multi_or3.or(and10);
                multi_or3 = multi_or3.or(and11);
                multi_or3 = multi_or3.or(eq11);
                multi_or3 = multi_or3.or(eq12);
                const and12 = states[i][2].and(multi_or3);
                const lt18 = Field(64).lessThan(input[i]);
                const lt19 = input[i].lessThan(91);
                const and13 = lt18.and(lt19)
                const lt20 = Field(96).lessThan(input[i]);
                const lt21 = input[i].lessThan(123);
                const and14 = lt20.and(lt21);
                const lt22 = Field(47).lessThan(input[i]);
                const lt23 = input[i].lessThan(58);
                const and15 = lt22.and(lt23);
                const eq13 = input[i].equals(45);
                let multi_or4 = Bool(false);
                multi_or4 = multi_or4.or(and13);
                multi_or4 = multi_or4.or(and14);
                multi_or4 = multi_or4.or(and15);
                multi_or4 = multi_or4.or(eq13);
                const and16 = states[i][3].and(multi_or4);
                const lt24 = Field(64).lessThan(input[i]);
                const lt25 = input[i].lessThan(91);
                const and17 = lt24.and(lt25)
                const lt26 = Field(47).lessThan(input[i]);
                const lt27 = input[i].lessThan(58);
                const and18 = lt26.and(lt27);
                const eq14 = input[i].equals(45);
                let multi_or5 = Bool(false);
                multi_or5 = multi_or5.or(and17);
                multi_or5 = multi_or5.or(and18);
                multi_or5 = multi_or5.or(eq14);
                const and19 = states[i][4].and(multi_or5);
                const lt28 = Field(64).lessThan(input[i]);
                const lt29 = input[i].lessThan(91);
                const and20 = lt28.and(lt29)
                const lt30 = Field(96).lessThan(input[i]);
                const lt31 = input[i].lessThan(123);
                const and21 = lt30.and(lt31);
                const lt32 = Field(47).lessThan(input[i]);
                const lt33 = input[i].lessThan(58);
                const and22 = lt32.and(lt33);
                const eq15 = input[i].equals(45);
                let multi_or6 = Bool(false);
                multi_or6 = multi_or6.or(and20);
                multi_or6 = multi_or6.or(and21);
                multi_or6 = multi_or6.or(and22);
                multi_or6 = multi_or6.or(eq15);
                const and23 = states[i][5].and(multi_or6);
                let multi_or7 = Bool(false);
                multi_or7 = multi_or7.or(and12);
                multi_or7 = multi_or7.or(and16);
                multi_or7 = multi_or7.or(and19);
                multi_or7 = multi_or7.or(and23);
                states[i+1][3] = multi_or7;
                const eq16 = input[i].equals(46);
                const and24 = states[i][3].and(eq16);
                const eq17 = input[i].equals(46);
                const and25 = states[i][4].and(eq17);
                const eq18 = input[i].equals(46);
                const and26 = states[i][5].and(eq18);
                let multi_or8 = Bool(false);
                multi_or8 = multi_or8.or(and24);
                multi_or8 = multi_or8.or(and25);
                multi_or8 = multi_or8.or(and26);
                states[i+1][4] = multi_or8;
                const lt34 = Field(96).lessThan(input[i]);
                const lt35 = input[i].lessThan(123);
                const and27 = lt34.and(lt35);
                const and28 = states[i][4].and(and27);
                states[i+1][5] = and28;
        }

        let final_state_sum: Field[] = [];
        final_state_sum[0] = states[0][5].toField();
        for (let i = 1; i <= num_bytes; i++) {
                final_state_sum[i] = final_state_sum[i-1].add(states[i][5].toField());
        }
        const out = final_state_sum[num_bytes];

        return Bool(out.value);
}