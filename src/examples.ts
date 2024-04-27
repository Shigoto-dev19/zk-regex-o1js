import { Bool, Field } from 'o1js';

export { 
        simpleRegex, 
        emailRegex, 
        base64Regex, 
        minaRegex,
        negateRegex,
}

// 1=(a|b) (2=(b|c)+ )+d
function simpleRegex(input: Field[]) {
        const num_bytes = input.length;
        let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
        let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));

        states[0][0] = Bool(true);
        for (let i = 1; i < 10; i++) {
                states[0][i] = Bool(false);
        }

        for (let i = 0; i < num_bytes; i++) {
                const eq0 = input[i].equals(49);
                const and0 = states[i][0].and(eq0);
                states[i+1][1] = and0;
                state_changed[i] = state_changed[i].or(states[i+1][1]);
                const eq1 = input[i].equals(61);
                const and1 = states[i][1].and(eq1);
                states[i+1][2] = and1;
                state_changed[i] = state_changed[i].or(states[i+1][2]);
                const eq2 = input[i].equals(97);
                const eq3 = input[i].equals(98);
                let multi_or0 = Bool(false);
                multi_or0 = multi_or0.or(eq2);
                multi_or0 = multi_or0.or(eq3);
                const and2 = states[i][2].and(multi_or0);
                states[i+1][3] = and2;
                state_changed[i] = state_changed[i].or(states[i+1][3]);
                const eq4 = input[i].equals(32);
                const and3 = states[i][3].and(eq4);
                states[i+1][4] = and3;
                state_changed[i] = state_changed[i].or(states[i+1][4]);
                const eq5 = input[i].equals(50);
                const and4 = states[i][4].and(eq5);
                const eq6 = input[i].equals(50);
                const and5 = states[i][8].and(eq6);
                let multi_or1 = Bool(false);
                multi_or1 = multi_or1.or(and4);
                multi_or1 = multi_or1.or(and5);
                states[i+1][5] = multi_or1;
                state_changed[i] = state_changed[i].or(states[i+1][5]);
                const eq7 = input[i].equals(61);
                const and6 = states[i][5].and(eq7);
                states[i+1][6] = and6;
                state_changed[i] = state_changed[i].or(states[i+1][6]);
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
                state_changed[i] = state_changed[i].or(states[i+1][7]);
                const eq12 = input[i].equals(32);
                const and9 = states[i][7].and(eq12);
                states[i+1][8] = and9;
                state_changed[i] = state_changed[i].or(states[i+1][8]);
                const eq13 = input[i].equals(100);
                const and10 = states[i][8].and(eq13);
                states[i+1][9] = and10;
                state_changed[i] = state_changed[i].or(states[i+1][9]);
                states[i+1][0] = state_changed[i].not();
        }

        let final_state_result = Bool(false);
        for (let i = 0; i <= num_bytes; i++) {
                final_state_result = final_state_result.or(states[i][9]);
        }

        const out = final_state_result;

        const msg_bytes = num_bytes - 1;
        const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
        is_consecutive[msg_bytes][1] = Bool(true);
        for (let i = 0; i < msg_bytes; i++) {
                is_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][9].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);
                is_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);
        }

        // revealed transitions: [[[2,3]],[[6,7],[7,7]],[[8,9]]]
        let reveal: Field[][] = []

        // the 0-th substring transitions: [[2,3]]
        const is_reveal0: Bool[] = [];
        let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal0: Field[] = [];
        for (let i = 0; i < msg_bytes - 1; i++) {
                is_substr0[i][0] = Bool(false);
                is_substr0[i][1] = is_substr0[i][0].or(states[i+1][2].and(states[i+2][3]));
                is_reveal0[i] = is_substr0[i][1].and(is_consecutive[i][1]);
                reveal0[i] = input[i+1].mul(is_reveal0[i].toField());
        }
        reveal.push(reveal0);

        // the 1-th substring transitions: [[6,7],[7,7]]
        const is_reveal1: Bool[] = [];
        let is_substr1: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal1: Field[] = [];
        for (let i = 0; i < msg_bytes - 1; i++) {
                is_substr1[i][0] = Bool(false);
                is_substr1[i][1] = is_substr1[i][0].or(states[i+1][6].and(states[i+2][7]));
                is_substr1[i][2] = is_substr1[i][1].or(states[i+1][7].and(states[i+2][7]));
                is_reveal1[i] = is_substr1[i][2].and(is_consecutive[i][1]);
                reveal1[i] = input[i+1].mul(is_reveal1[i].toField());
        }
        reveal.push(reveal1);

        // the 2-th substring transitions: [[8,9]]
        const is_reveal2: Bool[] = [];
        let is_substr2: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal2: Field[] = [];
        for (let i = 0; i < msg_bytes; i++) {
                is_substr2[i][0] = Bool(false);
                is_substr2[i][1] = is_substr2[i][0].or(states[i+1][8].and(states[i+2][9]));
                is_reveal2[i] = is_substr2[i][1].and(is_consecutive[i][1]);
                reveal2[i] = input[i+1].mul(is_reveal2[i].toField());
        }
        reveal.push(reveal2);

        return { out, reveal };
}

// ([a-zA-Z0-9._%-=]+@[a-zA-Z0-9-]+.[a-z]+)
// Note: this is not the perfect regex pattern for an email: this is just for testing purposes!
function emailRegex(input: Field[]) {
        const num_bytes = input.length;
        let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
        let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));

        states[0][0] = Bool(true);
        for (let i = 1; i < 6; i++) {
                states[0][i] = Bool(false);
        }

        for (let i = 0; i < num_bytes; i++) {
                const lt0 = Field(65).lessThanOrEqual(input[i]);
                const lt1 = input[i].lessThanOrEqual(90);
                const and0 = lt0.and(lt1);
                const lt2 = Field(97).lessThanOrEqual(input[i]);
                const lt3 = input[i].lessThanOrEqual(122);
                const and1 = lt2.and(lt3);
                const eq0 = input[i].equals(37);
                const eq1 = input[i].equals(45);
                const eq2 = input[i].equals(46);
                const eq3 = input[i].equals(48);
                const eq4 = input[i].equals(49);
                const eq5 = input[i].equals(50);
                const eq6 = input[i].equals(51);
                const eq7 = input[i].equals(52);
                const eq8 = input[i].equals(53);
                const eq9 = input[i].equals(54);
                const eq10 = input[i].equals(55);
                const eq11 = input[i].equals(56);
                const eq12 = input[i].equals(57);
                const eq13 = input[i].equals(61);
                const eq14 = input[i].equals(95);
                let multi_or0 = Bool(false);
                multi_or0 = multi_or0.or(and0);
                multi_or0 = multi_or0.or(and1);
                multi_or0 = multi_or0.or(eq0);
                multi_or0 = multi_or0.or(eq1);
                multi_or0 = multi_or0.or(eq2);
                multi_or0 = multi_or0.or(eq3);
                multi_or0 = multi_or0.or(eq4);
                multi_or0 = multi_or0.or(eq5);
                multi_or0 = multi_or0.or(eq6);
                multi_or0 = multi_or0.or(eq7);
                multi_or0 = multi_or0.or(eq8);
                multi_or0 = multi_or0.or(eq9);
                multi_or0 = multi_or0.or(eq10);
                multi_or0 = multi_or0.or(eq11);
                multi_or0 = multi_or0.or(eq12);
                multi_or0 = multi_or0.or(eq13);
                multi_or0 = multi_or0.or(eq14);
                const and2 = states[i][0].and(multi_or0);
                const lt4 = Field(65).lessThanOrEqual(input[i]);
                const lt5 = input[i].lessThanOrEqual(90);
                const and3 = lt4.and(lt5);
                const lt6 = Field(97).lessThanOrEqual(input[i]);
                const lt7 = input[i].lessThanOrEqual(122);
                const and4 = lt6.and(lt7);
                const eq15 = input[i].equals(37);
                const eq16 = input[i].equals(45);
                const eq17 = input[i].equals(46);
                const eq18 = input[i].equals(48);
                const eq19 = input[i].equals(49);
                const eq20 = input[i].equals(50);
                const eq21 = input[i].equals(51);
                const eq22 = input[i].equals(52);
                const eq23 = input[i].equals(53);
                const eq24 = input[i].equals(54);
                const eq25 = input[i].equals(55);
                const eq26 = input[i].equals(56);
                const eq27 = input[i].equals(57);
                const eq28 = input[i].equals(61);
                const eq29 = input[i].equals(95);
                let multi_or1 = Bool(false);
                multi_or1 = multi_or1.or(and3);
                multi_or1 = multi_or1.or(and4);
                multi_or1 = multi_or1.or(eq15);
                multi_or1 = multi_or1.or(eq16);
                multi_or1 = multi_or1.or(eq17);
                multi_or1 = multi_or1.or(eq18);
                multi_or1 = multi_or1.or(eq19);
                multi_or1 = multi_or1.or(eq20);
                multi_or1 = multi_or1.or(eq21);
                multi_or1 = multi_or1.or(eq22);
                multi_or1 = multi_or1.or(eq23);
                multi_or1 = multi_or1.or(eq24);
                multi_or1 = multi_or1.or(eq25);
                multi_or1 = multi_or1.or(eq26);
                multi_or1 = multi_or1.or(eq27);
                multi_or1 = multi_or1.or(eq28);
                multi_or1 = multi_or1.or(eq29);
                const and5 = states[i][1].and(multi_or1);
                let multi_or2 = Bool(false);
                multi_or2 = multi_or2.or(and2);
                multi_or2 = multi_or2.or(and5);
                states[i+1][1] = multi_or2;
                state_changed[i] = state_changed[i].or(states[i+1][1]);
                const eq30 = input[i].equals(64);
                const and6 = states[i][1].and(eq30);
                states[i+1][2] = and6;
                state_changed[i] = state_changed[i].or(states[i+1][2]);
                const lt8 = Field(65).lessThanOrEqual(input[i]);
                const lt9 = input[i].lessThanOrEqual(90);
                const and7 = lt8.and(lt9);
                const lt10 = Field(97).lessThanOrEqual(input[i]);
                const lt11 = input[i].lessThanOrEqual(122);
                const and8 = lt10.and(lt11);
                const eq31 = input[i].equals(45);
                const eq32 = input[i].equals(48);
                const eq33 = input[i].equals(49);
                const eq34 = input[i].equals(50);
                const eq35 = input[i].equals(51);
                const eq36 = input[i].equals(52);
                const eq37 = input[i].equals(53);
                const eq38 = input[i].equals(54);
                const eq39 = input[i].equals(55);
                const eq40 = input[i].equals(56);
                const eq41 = input[i].equals(57);
                let multi_or3 = Bool(false);
                multi_or3 = multi_or3.or(and7);
                multi_or3 = multi_or3.or(and8);
                multi_or3 = multi_or3.or(eq31);
                multi_or3 = multi_or3.or(eq32);
                multi_or3 = multi_or3.or(eq33);
                multi_or3 = multi_or3.or(eq34);
                multi_or3 = multi_or3.or(eq35);
                multi_or3 = multi_or3.or(eq36);
                multi_or3 = multi_or3.or(eq37);
                multi_or3 = multi_or3.or(eq38);
                multi_or3 = multi_or3.or(eq39);
                multi_or3 = multi_or3.or(eq40);
                multi_or3 = multi_or3.or(eq41);
                const and9 = states[i][2].and(multi_or3);
                const lt12 = Field(65).lessThanOrEqual(input[i]);
                const lt13 = input[i].lessThanOrEqual(90);
                const and10 = lt12.and(lt13);
                const lt14 = Field(97).lessThanOrEqual(input[i]);
                const lt15 = input[i].lessThanOrEqual(122);
                const and11 = lt14.and(lt15);
                const eq42 = input[i].equals(45);
                const eq43 = input[i].equals(48);
                const eq44 = input[i].equals(49);
                const eq45 = input[i].equals(50);
                const eq46 = input[i].equals(51);
                const eq47 = input[i].equals(52);
                const eq48 = input[i].equals(53);
                const eq49 = input[i].equals(54);
                const eq50 = input[i].equals(55);
                const eq51 = input[i].equals(56);
                const eq52 = input[i].equals(57);
                let multi_or4 = Bool(false);
                multi_or4 = multi_or4.or(and10);
                multi_or4 = multi_or4.or(and11);
                multi_or4 = multi_or4.or(eq42);
                multi_or4 = multi_or4.or(eq43);
                multi_or4 = multi_or4.or(eq44);
                multi_or4 = multi_or4.or(eq45);
                multi_or4 = multi_or4.or(eq46);
                multi_or4 = multi_or4.or(eq47);
                multi_or4 = multi_or4.or(eq48);
                multi_or4 = multi_or4.or(eq49);
                multi_or4 = multi_or4.or(eq50);
                multi_or4 = multi_or4.or(eq51);
                multi_or4 = multi_or4.or(eq52);
                const and12 = states[i][3].and(multi_or4);
                let multi_or5 = Bool(false);
                multi_or5 = multi_or5.or(and9);
                multi_or5 = multi_or5.or(and12);
                states[i+1][3] = multi_or5;
                state_changed[i] = state_changed[i].or(states[i+1][3]);
                const eq53 = input[i].equals(46);
                const and13 = states[i][3].and(eq53);
                states[i+1][4] = and13;
                state_changed[i] = state_changed[i].or(states[i+1][4]);
                const lt16 = Field(97).lessThanOrEqual(input[i]);
                const lt17 = input[i].lessThanOrEqual(122);
                const and14 = lt16.and(lt17);
                const and15 = states[i][4].and(and14);
                const lt18 = Field(97).lessThanOrEqual(input[i]);
                const lt19 = input[i].lessThanOrEqual(122);
                const and16 = lt18.and(lt19);
                const and17 = states[i][5].and(and16);
                let multi_or6 = Bool(false);
                multi_or6 = multi_or6.or(and15);
                multi_or6 = multi_or6.or(and17);
                states[i+1][5] = multi_or6;
                state_changed[i] = state_changed[i].or(states[i+1][5]);
                states[i+1][0] = state_changed[i].not();
        }

        let final_state_result = Bool(false);
        for (let i = 0; i <= num_bytes; i++) {
                final_state_result = final_state_result.or(states[i][5]);
        }

        const out = final_state_result;

        const msg_bytes = num_bytes - 1;
        const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
        is_consecutive[msg_bytes][1] = Bool(true);
        for (let i = 0; i < msg_bytes; i++) {
                is_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][5].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);
                is_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);
        }

        // revealed transitions: [[[0,1],[1,1]],[[2,3],[3,3]],[[4,5],[5,5]]]
        let reveal: Field[][] = [];

        // the 0-th substring transitions: [[0,1],[1,1]]
        const is_reveal0: Bool[] = [];
        let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal0: Field[] = [];
        for (let i = 0; i < msg_bytes - 1; i++) {
                is_substr0[i][0] = Bool(false);
                is_substr0[i][1] = is_substr0[i][0].or(states[i+1][0].and(states[i+2][1]));
                is_substr0[i][2] = is_substr0[i][1].or(states[i+1][1].and(states[i+2][1]));
                is_reveal0[i] = is_substr0[i][2].and(is_consecutive[i][1]);
                reveal0[i] = input[i+1].mul(is_reveal0[i].toField());
        }
        reveal0.unshift(input[0].mul(states[1][1].toField()));
        reveal.push(reveal0);

        // the 1-th substring transitions: [[2,3],[3,3]]
        const is_reveal1: Bool[] = [];
        let is_substr1: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal1: Field[] = [];
        for (let i = 0; i < msg_bytes - 1; i++) {
                is_substr1[i][0] = Bool(false);
                is_substr1[i][1] = is_substr1[i][0].or(states[i+1][2].and(states[i+2][3]));
                is_substr1[i][2] = is_substr1[i][1].or(states[i+1][3].and(states[i+2][3]));
                is_reveal1[i] = is_substr1[i][2].and(is_consecutive[i][1]);
                reveal1[i] = input[i+1].mul(is_reveal1[i].toField());
        }
        reveal.push(reveal1);

        // the 2-th substring transitions: [[4,5],[5,5]]
        const is_reveal2: Bool[] = [];
        let is_substr2: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal2: Field[] = [];
        for (let i = 0; i < msg_bytes; i++) {
                is_substr2[i][0] = Bool(false);
                is_substr2[i][1] = is_substr2[i][0].or(states[i+1][4].and(states[i+2][5]));
                is_substr2[i][2] = is_substr2[i][1].or(states[i+1][5].and(states[i+2][5]));
                is_reveal2[i] = is_substr2[i][2].and(is_consecutive[i][1]);
                reveal2[i] = input[i+1].mul(is_reveal2[i].toField());
        }
        reveal.push(reveal2);

        return { out, reveal };
}
// ([a-zA-Z0-9]|\\+|/|=)+
function base64Regex(input: Field[]) {
        const num_bytes = input.length;
        let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
        let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));

        states[0][0] = Bool(true);
        for (let i = 1; i < 2; i++) {
                states[0][i] = Bool(false);
        }

        for (let i = 0; i < num_bytes; i++) {
                const lt0 = Field(65).lessThanOrEqual(input[i]);
                const lt1 = input[i].lessThanOrEqual(90);
                const and0 = lt0.and(lt1);
                const lt2 = Field(97).lessThanOrEqual(input[i]);
                const lt3 = input[i].lessThanOrEqual(122);
                const and1 = lt2.and(lt3);
                const eq0 = input[i].equals(43);
                const eq1 = input[i].equals(47);
                const eq2 = input[i].equals(48);
                const eq3 = input[i].equals(49);
                const eq4 = input[i].equals(50);
                const eq5 = input[i].equals(51);
                const eq6 = input[i].equals(52);
                const eq7 = input[i].equals(53);
                const eq8 = input[i].equals(54);
                const eq9 = input[i].equals(55);
                const eq10 = input[i].equals(56);
                const eq11 = input[i].equals(57);
                const eq12 = input[i].equals(61);
                let multi_or0 = Bool(false);
                multi_or0 = multi_or0.or(and0);
                multi_or0 = multi_or0.or(and1);
                multi_or0 = multi_or0.or(eq0);
                multi_or0 = multi_or0.or(eq1);
                multi_or0 = multi_or0.or(eq2);
                multi_or0 = multi_or0.or(eq3);
                multi_or0 = multi_or0.or(eq4);
                multi_or0 = multi_or0.or(eq5);
                multi_or0 = multi_or0.or(eq6);
                multi_or0 = multi_or0.or(eq7);
                multi_or0 = multi_or0.or(eq8);
                multi_or0 = multi_or0.or(eq9);
                multi_or0 = multi_or0.or(eq10);
                multi_or0 = multi_or0.or(eq11);
                multi_or0 = multi_or0.or(eq12);
                const and2 = states[i][0].and(multi_or0);
                const lt4 = Field(65).lessThanOrEqual(input[i]);
                const lt5 = input[i].lessThanOrEqual(90);
                const and3 = lt4.and(lt5);
                const lt6 = Field(97).lessThanOrEqual(input[i]);
                const lt7 = input[i].lessThanOrEqual(122);
                const and4 = lt6.and(lt7);
                const eq13 = input[i].equals(43);
                const eq14 = input[i].equals(47);
                const eq15 = input[i].equals(48);
                const eq16 = input[i].equals(49);
                const eq17 = input[i].equals(50);
                const eq18 = input[i].equals(51);
                const eq19 = input[i].equals(52);
                const eq20 = input[i].equals(53);
                const eq21 = input[i].equals(54);
                const eq22 = input[i].equals(55);
                const eq23 = input[i].equals(56);
                const eq24 = input[i].equals(57);
                const eq25 = input[i].equals(61);
                let multi_or1 = Bool(false);
                multi_or1 = multi_or1.or(and3);
                multi_or1 = multi_or1.or(and4);
                multi_or1 = multi_or1.or(eq13);
                multi_or1 = multi_or1.or(eq14);
                multi_or1 = multi_or1.or(eq15);
                multi_or1 = multi_or1.or(eq16);
                multi_or1 = multi_or1.or(eq17);
                multi_or1 = multi_or1.or(eq18);
                multi_or1 = multi_or1.or(eq19);
                multi_or1 = multi_or1.or(eq20);
                multi_or1 = multi_or1.or(eq21);
                multi_or1 = multi_or1.or(eq22);
                multi_or1 = multi_or1.or(eq23);
                multi_or1 = multi_or1.or(eq24);
                multi_or1 = multi_or1.or(eq25);
                const and5 = states[i][1].and(multi_or1);
                let multi_or2 = Bool(false);
                multi_or2 = multi_or2.or(and2);
                multi_or2 = multi_or2.or(and5);
                states[i+1][1] = multi_or2;
                state_changed[i] = state_changed[i].or(states[i+1][1]);
                states[i+1][0] = state_changed[i].not();
        }

        let final_state_sum: Field[] = [];
        final_state_sum[0] = states[0][1].toField();
        for (let i = 1; i <= num_bytes; i++) {
                final_state_sum[i] = final_state_sum[i-1].add(states[i][1].toField());
        }
        const out = final_state_sum[num_bytes];

        const msg_bytes = num_bytes - 1;
        const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
        is_consecutive[msg_bytes][1] = Bool(true);
        for (let i = 0; i < msg_bytes; i++) {
                is_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][1].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);
                is_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);
        }

        // revealed transitions: [[[0,1],[1,1]]]
        let reveal: Field[][] = []

        // the 0-th substring transitions: [[0,1],[1,1]]
        const is_reveal0: Bool[] = [];
        let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal0: Field[] = [];
        for (let i = 0; i < msg_bytes; i++) {
                is_substr0[i][0] = Bool(false);
                is_substr0[i][1] = is_substr0[i][0].or(states[i+1][0].and(states[i+2][1]));
                is_substr0[i][2] = is_substr0[i][1].or(states[i+1][1].and(states[i+2][1]));
                is_reveal0[i] = is_substr0[i][2].and(is_consecutive[i][1]);
                reveal0[i] = input[i+1].mul(is_reveal0[i].toField());
        }
        reveal0.unshift(input[0].mul(states[1][1].toField()));
        reveal.push(reveal0);

        return { out, reveal };
}

// (mina|MINA)+
function minaRegex(input: Field[]) {
        const num_bytes = input.length;
        let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
        let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));

        states[0][0] = Bool(true);
        for (let i = 1; i < 8; i++) {
                states[0][i] = Bool(false);
        }

        for (let i = 0; i < num_bytes; i++) {
                const eq0 = input[i].equals(77);
                const and0 = states[i][0].and(eq0);
                const eq1 = input[i].equals(77);
                const and1 = states[i][7].and(eq1);
                let multi_or0 = Bool(false);
                multi_or0 = multi_or0.or(and0);
                multi_or0 = multi_or0.or(and1);
                states[i+1][1] = multi_or0;
                state_changed[i] = state_changed[i].or(states[i+1][1]);
                const eq2 = input[i].equals(109);
                const and2 = states[i][0].and(eq2);
                const eq3 = input[i].equals(109);
                const and3 = states[i][7].and(eq3);
                let multi_or1 = Bool(false);
                multi_or1 = multi_or1.or(and2);
                multi_or1 = multi_or1.or(and3);
                states[i+1][2] = multi_or1;
                state_changed[i] = state_changed[i].or(states[i+1][2]);
                const eq4 = input[i].equals(73);
                const and4 = states[i][1].and(eq4);
                states[i+1][3] = and4;
                state_changed[i] = state_changed[i].or(states[i+1][3]);
                const eq5 = input[i].equals(105);
                const and5 = states[i][2].and(eq5);
                states[i+1][4] = and5;
                state_changed[i] = state_changed[i].or(states[i+1][4]);
                const eq6 = input[i].equals(78);
                const and6 = states[i][3].and(eq6);
                states[i+1][5] = and6;
                state_changed[i] = state_changed[i].or(states[i+1][5]);
                const eq7 = input[i].equals(110);
                const and7 = states[i][4].and(eq7);
                states[i+1][6] = and7;
                state_changed[i] = state_changed[i].or(states[i+1][6]);
                const eq8 = input[i].equals(65);
                const and8 = states[i][5].and(eq8);
                const eq9 = input[i].equals(97);
                const and9 = states[i][6].and(eq9);
                let multi_or2 = Bool(false);
                multi_or2 = multi_or2.or(and8);
                multi_or2 = multi_or2.or(and9);
                states[i+1][7] = multi_or2;
                state_changed[i] = state_changed[i].or(states[i+1][7]);
                states[i+1][0] = state_changed[i].not();
        }

        let final_state_sum: Field[] = [];
        final_state_sum[0] = states[0][7].toField();
        for (let i = 1; i <= num_bytes; i++) {
                final_state_sum[i] = final_state_sum[i-1].add(states[i][7].toField());
        }
        const out = final_state_sum[num_bytes];

        const msg_bytes = num_bytes - 1;
        const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
        is_consecutive[msg_bytes][1] = Bool(true);
        for (let i = 0; i < msg_bytes; i++) {
                is_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][7].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);
                is_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);
        }

        // revealed transitions: [[[0,2],[7,2],[2,4],[4,6],[6,7]],[[0,1],[7,1],[1,3],[3,5],[5,7]]]
        let reveal: Field[][] = [];

        // the 0-th substring transitions: [[0,2],[7,2],[2,4],[4,6],[6,7]]
        const is_reveal0: Bool[] = [];
        let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal0: Field[] = [];
        for (let i = 0; i < msg_bytes; i++) {
                is_substr0[i][0] = Bool(false);
                is_substr0[i][1] = is_substr0[i][0].or(states[i+1][0].and(states[i+2][2]));
                is_substr0[i][2] = is_substr0[i][1].or(states[i+1][7].and(states[i+2][2]));
                is_substr0[i][3] = is_substr0[i][2].or(states[i+1][2].and(states[i+2][4]));
                is_substr0[i][4] = is_substr0[i][3].or(states[i+1][4].and(states[i+2][6]));
                is_substr0[i][5] = is_substr0[i][4].or(states[i+1][6].and(states[i+2][7]));
                is_reveal0[i] = is_substr0[i][5].and(is_consecutive[i][1]);
                reveal0[i] = input[i+1].mul(is_reveal0[i].toField());
        }
        reveal0.unshift(input[0].mul(states[1][2].toField()));
        reveal.push(reveal0);

        // the 1-th substring transitions: [[0,1],[7,1],[1,3],[3,5],[5,7]]
        const is_reveal1: Bool[] = [];
        let is_substr1: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal1: Field[] = [];
        for (let i = 0; i < msg_bytes; i++) {
                is_substr1[i][0] = Bool(false);
                is_substr1[i][1] = is_substr1[i][0].or(states[i+1][0].and(states[i+2][1]));
                is_substr1[i][2] = is_substr1[i][1].or(states[i+1][7].and(states[i+2][1]));
                is_substr1[i][3] = is_substr1[i][2].or(states[i+1][1].and(states[i+2][3]));
                is_substr1[i][4] = is_substr1[i][3].or(states[i+1][3].and(states[i+2][5]));
                is_substr1[i][5] = is_substr1[i][4].or(states[i+1][5].and(states[i+2][7]));
                is_reveal1[i] = is_substr1[i][5].and(is_consecutive[i][1]);
                reveal1[i] = input[i+1].mul(is_reveal1[i].toField());
        }
        reveal1.unshift(input[0].mul(states[1][1].toField()));
        reveal.push(reveal1);

        return { out, reveal };
}

// a:[^abcdefghijklmnopqrstuvwxyz]+.
function negateRegex(input: Field[]) {
        const num_bytes = input.length;
        let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
        let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));

        states[0][0] = Bool(true);
        for (let i = 1; i < 5; i++) {
                states[0][i] = Bool(false);
        }

        for (let i = 0; i < num_bytes; i++) {
                const lt0 = Field(97).lessThanOrEqual(input[i]);
                const lt1 = input[i].lessThanOrEqual(122);
                const and0 = lt0.and(lt1);
                const eq0 = input[i].equals(46);
                let multi_or0 = Bool(false);
                multi_or0 = multi_or0.or(and0);
                multi_or0 = multi_or0.or(eq0);
                const and1 = states[i][1].and(multi_or0.not());
                const lt2 = Field(97).lessThanOrEqual(input[i]);
                const lt3 = input[i].lessThanOrEqual(122);
                const and2 = lt2.and(lt3);
                const and3 = states[i][4].and(and2.not());
                let multi_or1 = Bool(false);
                multi_or1 = multi_or1.or(and1);
                multi_or1 = multi_or1.or(and3);
                states[i+1][1] = multi_or1;
                state_changed[i] = state_changed[i].or(states[i+1][1]);
                const eq1 = input[i].equals(46);
                const and4 = states[i][1].and(eq1);
                states[i+1][2] = and4;
                state_changed[i] = state_changed[i].or(states[i+1][2]);
                const eq2 = input[i].equals(97);
                const and5 = states[i][0].and(eq2);
                states[i+1][3] = and5;
                state_changed[i] = state_changed[i].or(states[i+1][3]);
                const eq3 = input[i].equals(58);
                const and6 = states[i][3].and(eq3);
                states[i+1][4] = and6;
                state_changed[i] = state_changed[i].or(states[i+1][4]);
                states[i+1][0] = state_changed[i].not();
        }

        let final_state_result = Bool(false);
        for (let i = 0; i <= num_bytes; i++) {
                final_state_result = final_state_result.or(states[i][2]);
        }

        const out = final_state_result;

        const msg_bytes = num_bytes - 1;
        const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
        is_consecutive[msg_bytes][1] = Bool(true);
        for (let i = 0; i < msg_bytes; i++) {
                is_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][2].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);
                is_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);
        }

        // revealed transitions: [[[4,1],[1,1]]]
        let reveal: Field[][] = []

        // the 0-th substring transitions: [[4,1],[1,1]]
        const is_reveal0: Bool[] = [];
        let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal0: Field[] = [];
        for (let i = 0; i < msg_bytes - 1; i++) {
                is_substr0[i][0] = Bool(false);
                is_substr0[i][1] = is_substr0[i][0].or(states[i+1][4].and(states[i+2][1]));
                is_substr0[i][2] = is_substr0[i][1].or(states[i+1][1].and(states[i+2][1]));
                is_reveal0[i] = is_substr0[i][2].and(is_consecutive[i][1]);
                reveal0[i] = input[i+1].mul(is_reveal0[i].toField());
        }
        reveal.push(reveal0);

        return { out, reveal };
}

// [^aeiou]+
export function negateVowel(input: Field[]) {
        const num_bytes = input.length;
        let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
        let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));

        states[0][0] = Bool(true);
        for (let i = 1; i < 2; i++) {
                states[0][i] = Bool(false);
        }

        for (let i = 0; i < num_bytes; i++) {
                const eq0 = input[i].equals(97);
                const eq1 = input[i].equals(101);
                const eq2 = input[i].equals(105);
                const eq3 = input[i].equals(111);
                const eq4 = input[i].equals(117);
                let multi_or0 = Bool(false);
                multi_or0 = multi_or0.or(eq0);
                multi_or0 = multi_or0.or(eq1);
                multi_or0 = multi_or0.or(eq2);
                multi_or0 = multi_or0.or(eq3);
                multi_or0 = multi_or0.or(eq4);
                const and0 = states[i][0].and(multi_or0.not());
                const eq5 = input[i].equals(97);
                const eq6 = input[i].equals(101);
                const eq7 = input[i].equals(105);
                const eq8 = input[i].equals(111);
                const eq9 = input[i].equals(117);
                let multi_or1 = Bool(false);
                multi_or1 = multi_or1.or(eq5);
                multi_or1 = multi_or1.or(eq6);
                multi_or1 = multi_or1.or(eq7);
                multi_or1 = multi_or1.or(eq8);
                multi_or1 = multi_or1.or(eq9);
                const and1 = states[i][1].and(multi_or1.not());
                let multi_or2 = Bool(false);
                multi_or2 = multi_or2.or(and0);
                multi_or2 = multi_or2.or(and1);
                states[i+1][1] = multi_or2;
                state_changed[i] = state_changed[i].or(states[i+1][1]);
                states[i+1][0] = state_changed[i].not();
        }

        let final_state_result = Bool(true);
        for (let i = 1; i <= num_bytes; i++) {
                final_state_result = final_state_result.and(states[i][1]);
        }

        const out = final_state_result;

        const msg_bytes = num_bytes - 1;
        const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
        is_consecutive[msg_bytes][1] = Bool(true);
        for (let i = 0; i < msg_bytes; i++) {
                is_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][1].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);
                is_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);
        }

        // revealed transitions: [[[0,1],[1,1]]]
        let reveal: Field[][] = []

        // the 0-th substring transitions: [[0,1],[1,1]]
        const is_reveal0: Bool[] = [];
        let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
        const reveal0: Field[] = [];
        for (let i = 0; i < msg_bytes; i++) {
                is_substr0[i][0] = Bool(false);
                is_substr0[i][1] = is_substr0[i][0].or(states[i+1][0].and(states[i+2][1]));
                is_substr0[i][2] = is_substr0[i][1].or(states[i+1][1].and(states[i+2][1]));
                is_reveal0[i] = is_substr0[i][2].and(is_consecutive[i][1]);
                reveal0[i] = input[i+1].mul(is_reveal0[i].toField());
        }
        reveal0.unshift(input[0].mul(states[1][1].toField()));
        reveal.push(reveal0);

        return { out, reveal };
}