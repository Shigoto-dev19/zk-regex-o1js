import { Bool, Field, UInt8 } from 'o1js';

export {
  simpleRegex,
  emailRegex,
  base64Regex,
  minaRegex,
  negateRegex,
  negateVowel,
};

// '1=(a|b) (2=(b|c)+ )+d' '["(a|b)", "(b|c)", "d"]'
function simpleRegex(input: UInt8[]) {
  const num_bytes = input.length;
  let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
  let state_changed: Bool[] = Array.from({ length: num_bytes }, () =>
    Bool(false)
  );

  states[0][0] = Bool(true);
  for (let i = 1; i < 10; i++) {
    states[0][i] = Bool(false);
  }

  for (let i = 0; i < num_bytes; i++) {
    const eq0 = input[i].value.equals(49);
    const and0 = states[i][0].and(eq0);
    states[i + 1][1] = and0;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    const eq1 = input[i].value.equals(61);
    const and1 = states[i][1].and(eq1);
    states[i + 1][2] = and1;
    state_changed[i] = state_changed[i].or(states[i + 1][2]);
    const eq2 = input[i].value.equals(97);
    const eq3 = input[i].value.equals(98);
    let multi_or0 = Bool(false);
    multi_or0 = multi_or0.or(eq2);
    multi_or0 = multi_or0.or(eq3);
    const and2 = states[i][2].and(multi_or0);
    states[i + 1][3] = and2;
    state_changed[i] = state_changed[i].or(states[i + 1][3]);
    const eq4 = input[i].value.equals(32);
    const and3 = states[i][3].and(eq4);
    states[i + 1][4] = and3;
    state_changed[i] = state_changed[i].or(states[i + 1][4]);
    const eq5 = input[i].value.equals(50);
    const and4 = states[i][4].and(eq5);
    const and5 = states[i][8].and(eq5);
    let multi_or1 = Bool(false);
    multi_or1 = multi_or1.or(and4);
    multi_or1 = multi_or1.or(and5);
    states[i + 1][5] = multi_or1;
    state_changed[i] = state_changed[i].or(states[i + 1][5]);
    const and6 = states[i][5].and(eq1);
    states[i + 1][6] = and6;
    state_changed[i] = state_changed[i].or(states[i + 1][6]);
    const eq6 = input[i].value.equals(99);
    let multi_or2 = Bool(false);
    multi_or2 = multi_or2.or(eq3);
    multi_or2 = multi_or2.or(eq6);
    const and7 = states[i][6].and(multi_or2);
    const and8 = states[i][7].and(multi_or2);
    let multi_or3 = Bool(false);
    multi_or3 = multi_or3.or(and7);
    multi_or3 = multi_or3.or(and8);
    states[i + 1][7] = multi_or3;
    state_changed[i] = state_changed[i].or(states[i + 1][7]);
    const and9 = states[i][7].and(eq4);
    states[i + 1][8] = and9;
    state_changed[i] = state_changed[i].or(states[i + 1][8]);
    const eq7 = input[i].value.equals(100);
    const and10 = states[i][8].and(eq7);
    states[i + 1][9] = and10;
    state_changed[i] = state_changed[i].or(states[i + 1][9]);
    states[i + 1][0] = state_changed[i].not();
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
    is_consecutive[msg_bytes - 1 - i][0] = states[num_bytes - i][9]
      .and(is_consecutive[msg_bytes - i][1].not())
      .or(is_consecutive[msg_bytes - i][1]);
    is_consecutive[msg_bytes - 1 - i][1] = state_changed[msg_bytes - i].and(
      is_consecutive[msg_bytes - 1 - i][0]
    );
  }

  // revealed transitions: [[[2,3]],[[6,7],[7,7]],[[8,9]]]
  let reveal: Field[][] = [];

  // the 0-th substring transitions: [[2,3]]
  const is_reveal0: Bool[] = [];
  let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal0: Field[] = [];
  for (let i = 0; i < msg_bytes - 1; i++) {
    is_substr0[i][0] = Bool(false);
    is_substr0[i][1] = is_substr0[i][0].or(
      states[i + 1][2].and(states[i + 2][3])
    );
    is_reveal0[i] = is_substr0[i][1].and(is_consecutive[i][1]);
    reveal0[i] = input[i + 1].value.mul(is_reveal0[i].toField());
  }
  reveal.push(reveal0);

  // the 1-th substring transitions: [[6,7],[7,7]]
  const is_reveal1: Bool[] = [];
  let is_substr1: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal1: Field[] = [];
  for (let i = 0; i < msg_bytes - 1; i++) {
    is_substr1[i][0] = Bool(false);
    is_substr1[i][1] = is_substr1[i][0].or(
      states[i + 1][6].and(states[i + 2][7])
    );
    is_substr1[i][2] = is_substr1[i][1].or(
      states[i + 1][7].and(states[i + 2][7])
    );
    is_reveal1[i] = is_substr1[i][2].and(is_consecutive[i][1]);
    reveal1[i] = input[i + 1].value.mul(is_reveal1[i].toField());
  }
  reveal.push(reveal1);

  // the 2-th substring transitions: [[8,9]]
  const is_reveal2: Bool[] = [];
  let is_substr2: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal2: Field[] = [];
  for (let i = 0; i < msg_bytes; i++) {
    is_substr2[i][0] = Bool(false);
    is_substr2[i][1] = is_substr2[i][0].or(
      states[i + 1][8].and(states[i + 2][9])
    );
    is_reveal2[i] = is_substr2[i][1].and(is_consecutive[i][1]);
    reveal2[i] = input[i + 1].value.mul(is_reveal2[i].toField());
  }
  reveal.push(reveal2);

  return { out, reveal };
}

// '([a-zA-Z0-9._%-=]+@[a-zA-Z0-9-]+.[a-z]+)' '["[a-zA-Z0-9._%-=]", "[a-zA-Z0-9-]", "[a-z]"]'
// Note: this is not the perfect regex pattern for an email: this is just for testing purposes!
function emailRegex(input: UInt8[]) {
  const num_bytes = input.length;
  let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
  let state_changed: Bool[] = Array.from({ length: num_bytes }, () =>
    Bool(false)
  );

  states[0][0] = Bool(true);
  for (let i = 1; i < 6; i++) {
    states[0][i] = Bool(false);
  }

  for (let i = 0; i < num_bytes; i++) {
    const lt0 = new UInt8(65).lessThanOrEqual(input[i]);
    const lt1 = input[i].lessThanOrEqual(90);
    const and0 = lt0.and(lt1);
    const lt2 = new UInt8(97).lessThanOrEqual(input[i]);
    const lt3 = input[i].lessThanOrEqual(122);
    const and1 = lt2.and(lt3);
    const eq0 = input[i].value.equals(37);
    const eq1 = input[i].value.equals(45);
    const eq2 = input[i].value.equals(46);
    const eq3 = input[i].value.equals(48);
    const eq4 = input[i].value.equals(49);
    const eq5 = input[i].value.equals(50);
    const eq6 = input[i].value.equals(51);
    const eq7 = input[i].value.equals(52);
    const eq8 = input[i].value.equals(53);
    const eq9 = input[i].value.equals(54);
    const eq10 = input[i].value.equals(55);
    const eq11 = input[i].value.equals(56);
    const eq12 = input[i].value.equals(57);
    const eq13 = input[i].value.equals(61);
    const eq14 = input[i].value.equals(95);
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
    const and3 = states[i][1].and(multi_or0);
    let multi_or1 = Bool(false);
    multi_or1 = multi_or1.or(and2);
    multi_or1 = multi_or1.or(and3);
    states[i + 1][1] = multi_or1;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    const eq15 = input[i].value.equals(64);
    const and4 = states[i][1].and(eq15);
    states[i + 1][2] = and4;
    state_changed[i] = state_changed[i].or(states[i + 1][2]);
    let multi_or2 = Bool(false);
    multi_or2 = multi_or2.or(and0);
    multi_or2 = multi_or2.or(and1);
    multi_or2 = multi_or2.or(eq1);
    multi_or2 = multi_or2.or(eq3);
    multi_or2 = multi_or2.or(eq4);
    multi_or2 = multi_or2.or(eq5);
    multi_or2 = multi_or2.or(eq6);
    multi_or2 = multi_or2.or(eq7);
    multi_or2 = multi_or2.or(eq8);
    multi_or2 = multi_or2.or(eq9);
    multi_or2 = multi_or2.or(eq10);
    multi_or2 = multi_or2.or(eq11);
    multi_or2 = multi_or2.or(eq12);
    const and5 = states[i][2].and(multi_or2);
    const and6 = states[i][3].and(multi_or2);
    let multi_or3 = Bool(false);
    multi_or3 = multi_or3.or(and5);
    multi_or3 = multi_or3.or(and6);
    states[i + 1][3] = multi_or3;
    state_changed[i] = state_changed[i].or(states[i + 1][3]);
    const and7 = states[i][3].and(eq2);
    states[i + 1][4] = and7;
    state_changed[i] = state_changed[i].or(states[i + 1][4]);
    const and8 = states[i][4].and(and1);
    const and9 = states[i][5].and(and1);
    let multi_or4 = Bool(false);
    multi_or4 = multi_or4.or(and8);
    multi_or4 = multi_or4.or(and9);
    states[i + 1][5] = multi_or4;
    state_changed[i] = state_changed[i].or(states[i + 1][5]);
    states[i + 1][0] = state_changed[i].not();
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
    is_consecutive[msg_bytes - 1 - i][0] = states[num_bytes - i][5]
      .and(is_consecutive[msg_bytes - i][1].not())
      .or(is_consecutive[msg_bytes - i][1]);
    is_consecutive[msg_bytes - 1 - i][1] = state_changed[msg_bytes - i].and(
      is_consecutive[msg_bytes - 1 - i][0]
    );
  }

  // revealed transitions: [[[0,1],[1,1]],[[2,3],[3,3]],[[4,5],[5,5]]]
  let reveal: Field[][] = [];

  // the 0-th substring transitions: [[0,1],[1,1]]
  const is_reveal0: Bool[] = [];
  let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal0: Field[] = [];
  for (let i = 0; i < msg_bytes - 1; i++) {
    is_substr0[i][0] = Bool(false);
    is_substr0[i][1] = is_substr0[i][0].or(
      states[i + 1][0].and(states[i + 2][1])
    );
    is_substr0[i][2] = is_substr0[i][1].or(
      states[i + 1][1].and(states[i + 2][1])
    );
    is_reveal0[i] = is_substr0[i][2].and(is_consecutive[i][1]);
    reveal0[i] = input[i + 1].value.mul(is_reveal0[i].toField());
  }
  reveal0.unshift(input[0].value.mul(states[1][1].toField()));
  reveal.push(reveal0);

  // the 1-th substring transitions: [[2,3],[3,3]]
  const is_reveal1: Bool[] = [];
  let is_substr1: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal1: Field[] = [];
  for (let i = 0; i < msg_bytes - 1; i++) {
    is_substr1[i][0] = Bool(false);
    is_substr1[i][1] = is_substr1[i][0].or(
      states[i + 1][2].and(states[i + 2][3])
    );
    is_substr1[i][2] = is_substr1[i][1].or(
      states[i + 1][3].and(states[i + 2][3])
    );
    is_reveal1[i] = is_substr1[i][2].and(is_consecutive[i][1]);
    reveal1[i] = input[i + 1].value.mul(is_reveal1[i].toField());
  }
  reveal.push(reveal1);

  // the 2-th substring transitions: [[4,5],[5,5]]
  const is_reveal2: Bool[] = [];
  let is_substr2: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal2: Field[] = [];
  for (let i = 0; i < msg_bytes; i++) {
    is_substr2[i][0] = Bool(false);
    is_substr2[i][1] = is_substr2[i][0].or(
      states[i + 1][4].and(states[i + 2][5])
    );
    is_substr2[i][2] = is_substr2[i][1].or(
      states[i + 1][5].and(states[i + 2][5])
    );
    is_reveal2[i] = is_substr2[i][2].and(is_consecutive[i][1]);
    reveal2[i] = input[i + 1].value.mul(is_reveal2[i].toField());
  }
  reveal.push(reveal2);

  return { out, reveal };
}

// '([a-zA-Z0-9]|\+|/|=)+' '[[[0,1],[1,1]]]' true
function base64Regex(input: UInt8[]) {
  const num_bytes = input.length;
  let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
  let state_changed: Bool[] = Array.from({ length: num_bytes }, () =>
    Bool(false)
  );

  states[0][0] = Bool(true);
  for (let i = 1; i < 2; i++) {
    states[0][i] = Bool(false);
  }

  for (let i = 0; i < num_bytes; i++) {
    const lt0 = new UInt8(65).lessThanOrEqual(input[i]);
    const lt1 = input[i].lessThanOrEqual(90);
    const and0 = lt0.and(lt1);
    const lt2 = new UInt8(97).lessThanOrEqual(input[i]);
    const lt3 = input[i].lessThanOrEqual(122);
    const and1 = lt2.and(lt3);
    const eq0 = input[i].value.equals(43);
    const eq1 = input[i].value.equals(47);
    const eq2 = input[i].value.equals(48);
    const eq3 = input[i].value.equals(49);
    const eq4 = input[i].value.equals(50);
    const eq5 = input[i].value.equals(51);
    const eq6 = input[i].value.equals(52);
    const eq7 = input[i].value.equals(53);
    const eq8 = input[i].value.equals(54);
    const eq9 = input[i].value.equals(55);
    const eq10 = input[i].value.equals(56);
    const eq11 = input[i].value.equals(57);
    const eq12 = input[i].value.equals(61);
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
    const and3 = states[i][1].and(multi_or0);
    let multi_or1 = Bool(false);
    multi_or1 = multi_or1.or(and2);
    multi_or1 = multi_or1.or(and3);
    states[i + 1][1] = multi_or1;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    states[i + 1][0] = state_changed[i].not();
  }

  let final_state_sum: Field[] = [];
  final_state_sum[0] = states[0][1].toField();
  for (let i = 1; i <= num_bytes; i++) {
    final_state_sum[i] = final_state_sum[i - 1].add(states[i][1].toField());
  }
  const out = final_state_sum[num_bytes];

  const msg_bytes = num_bytes - 1;
  const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
  is_consecutive[msg_bytes][1] = Bool(true);
  for (let i = 0; i < msg_bytes; i++) {
    is_consecutive[msg_bytes - 1 - i][0] = states[num_bytes - i][1]
      .and(is_consecutive[msg_bytes - i][1].not())
      .or(is_consecutive[msg_bytes - i][1]);
    is_consecutive[msg_bytes - 1 - i][1] = state_changed[msg_bytes - i].and(
      is_consecutive[msg_bytes - 1 - i][0]
    );
  }

  // revealed transitions: [[[0,1],[1,1]]]
  let reveal: Field[][] = [];

  // the 0-th substring transitions: [[0,1],[1,1]]
  const is_reveal0: Bool[] = [];
  let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal0: Field[] = [];
  for (let i = 0; i < msg_bytes; i++) {
    is_substr0[i][0] = Bool(false);
    is_substr0[i][1] = is_substr0[i][0].or(
      states[i + 1][0].and(states[i + 2][1])
    );
    is_substr0[i][2] = is_substr0[i][1].or(
      states[i + 1][1].and(states[i + 2][1])
    );
    is_reveal0[i] = is_substr0[i][2].and(is_consecutive[i][1]);
    reveal0[i] = input[i + 1].value.mul(is_reveal0[i].toField());
  }
  reveal0.unshift(input[0].value.mul(states[1][1].toField()));
  reveal.push(reveal0);

  return { out, reveal };
}

// '(mina|MINA)+' '["mina", "MINA"]' true
function minaRegex(input: UInt8[]) {
  const num_bytes = input.length;
  let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
  let state_changed: Bool[] = Array.from({ length: num_bytes }, () =>
    Bool(false)
  );

  states[0][0] = Bool(true);
  for (let i = 1; i < 8; i++) {
    states[0][i] = Bool(false);
  }

  for (let i = 0; i < num_bytes; i++) {
    const eq0 = input[i].value.equals(77);
    const and0 = states[i][0].and(eq0);
    const and1 = states[i][7].and(eq0);
    let multi_or0 = Bool(false);
    multi_or0 = multi_or0.or(and0);
    multi_or0 = multi_or0.or(and1);
    states[i + 1][1] = multi_or0;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    const eq1 = input[i].value.equals(109);
    const and2 = states[i][0].and(eq1);
    const and3 = states[i][7].and(eq1);
    let multi_or1 = Bool(false);
    multi_or1 = multi_or1.or(and2);
    multi_or1 = multi_or1.or(and3);
    states[i + 1][2] = multi_or1;
    state_changed[i] = state_changed[i].or(states[i + 1][2]);
    const eq2 = input[i].value.equals(73);
    const and4 = states[i][1].and(eq2);
    states[i + 1][3] = and4;
    state_changed[i] = state_changed[i].or(states[i + 1][3]);
    const eq3 = input[i].value.equals(105);
    const and5 = states[i][2].and(eq3);
    states[i + 1][4] = and5;
    state_changed[i] = state_changed[i].or(states[i + 1][4]);
    const eq4 = input[i].value.equals(78);
    const and6 = states[i][3].and(eq4);
    states[i + 1][5] = and6;
    state_changed[i] = state_changed[i].or(states[i + 1][5]);
    const eq5 = input[i].value.equals(110);
    const and7 = states[i][4].and(eq5);
    states[i + 1][6] = and7;
    state_changed[i] = state_changed[i].or(states[i + 1][6]);
    const eq6 = input[i].value.equals(65);
    const and8 = states[i][5].and(eq6);
    const eq7 = input[i].value.equals(97);
    const and9 = states[i][6].and(eq7);
    let multi_or2 = Bool(false);
    multi_or2 = multi_or2.or(and8);
    multi_or2 = multi_or2.or(and9);
    states[i + 1][7] = multi_or2;
    state_changed[i] = state_changed[i].or(states[i + 1][7]);
    states[i + 1][0] = state_changed[i].not();
  }

  let final_state_sum: Field[] = [];
  final_state_sum[0] = states[0][7].toField();
  for (let i = 1; i <= num_bytes; i++) {
    final_state_sum[i] = final_state_sum[i - 1].add(states[i][7].toField());
  }
  const out = final_state_sum[num_bytes];

  const msg_bytes = num_bytes - 1;
  const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
  is_consecutive[msg_bytes][1] = Bool(true);
  for (let i = 0; i < msg_bytes; i++) {
    is_consecutive[msg_bytes - 1 - i][0] = states[num_bytes - i][7]
      .and(is_consecutive[msg_bytes - i][1].not())
      .or(is_consecutive[msg_bytes - i][1]);
    is_consecutive[msg_bytes - 1 - i][1] = state_changed[msg_bytes - i].and(
      is_consecutive[msg_bytes - 1 - i][0]
    );
  }

  // revealed transitions: [[[0,2],[7,2],[2,4],[4,6],[6,7]],[[0,1],[7,1],[1,3],[3,5],[5,7]]]
  let reveal: Field[][] = [];

  // the 0-th substring transitions: [[0,2],[7,2],[2,4],[4,6],[6,7]]
  const is_reveal0: Bool[] = [];
  let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal0: Field[] = [];
  for (let i = 0; i < msg_bytes; i++) {
    is_substr0[i][0] = Bool(false);
    is_substr0[i][1] = is_substr0[i][0].or(
      states[i + 1][0].and(states[i + 2][2])
    );
    is_substr0[i][2] = is_substr0[i][1].or(
      states[i + 1][7].and(states[i + 2][2])
    );
    is_substr0[i][3] = is_substr0[i][2].or(
      states[i + 1][2].and(states[i + 2][4])
    );
    is_substr0[i][4] = is_substr0[i][3].or(
      states[i + 1][4].and(states[i + 2][6])
    );
    is_substr0[i][5] = is_substr0[i][4].or(
      states[i + 1][6].and(states[i + 2][7])
    );
    is_reveal0[i] = is_substr0[i][5].and(is_consecutive[i][1]);
    reveal0[i] = input[i + 1].value.mul(is_reveal0[i].toField());
  }
  reveal0.unshift(input[0].value.mul(states[1][2].toField()));
  reveal.push(reveal0);

  // the 1-th substring transitions: [[0,1],[7,1],[1,3],[3,5],[5,7]]
  const is_reveal1: Bool[] = [];
  let is_substr1: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal1: Field[] = [];
  for (let i = 0; i < msg_bytes; i++) {
    is_substr1[i][0] = Bool(false);
    is_substr1[i][1] = is_substr1[i][0].or(
      states[i + 1][0].and(states[i + 2][1])
    );
    is_substr1[i][2] = is_substr1[i][1].or(
      states[i + 1][7].and(states[i + 2][1])
    );
    is_substr1[i][3] = is_substr1[i][2].or(
      states[i + 1][1].and(states[i + 2][3])
    );
    is_substr1[i][4] = is_substr1[i][3].or(
      states[i + 1][3].and(states[i + 2][5])
    );
    is_substr1[i][5] = is_substr1[i][4].or(
      states[i + 1][5].and(states[i + 2][7])
    );
    is_reveal1[i] = is_substr1[i][5].and(is_consecutive[i][1]);
    reveal1[i] = input[i + 1].value.mul(is_reveal1[i].toField());
  }
  reveal1.unshift(input[0].value.mul(states[1][1].toField()));
  reveal.push(reveal1);

  return { out, reveal };
}

// 'a:[^abcdefghijklmnopqrstuvwxyz]+.' '["[^abcdefghijklmnopqrstuvwxyz]"]'
function negateRegex(input: UInt8[]) {
  const num_bytes = input.length;
  let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
  let state_changed: Bool[] = Array.from({ length: num_bytes }, () =>
    Bool(false)
  );

  states[0][0] = Bool(true);
  for (let i = 1; i < 5; i++) {
    states[0][i] = Bool(false);
  }

  for (let i = 0; i < num_bytes; i++) {
    const lt0 = new UInt8(97).lessThanOrEqual(input[i]);
    const lt1 = input[i].lessThanOrEqual(122);
    const and0 = lt0.and(lt1);
    const eq0 = input[i].value.equals(46);
    let multi_or0 = Bool(false);
    multi_or0 = multi_or0.or(and0);
    multi_or0 = multi_or0.or(eq0);
    const and1 = states[i][1].and(multi_or0.not());
    const and2 = states[i][4].and(and0.not());
    let multi_or1 = Bool(false);
    multi_or1 = multi_or1.or(and1);
    multi_or1 = multi_or1.or(and2);
    states[i + 1][1] = multi_or1;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    const and3 = states[i][1].and(eq0);
    states[i + 1][2] = and3;
    state_changed[i] = state_changed[i].or(states[i + 1][2]);
    const eq1 = input[i].value.equals(97);
    const and4 = states[i][0].and(eq1);
    states[i + 1][3] = and4;
    state_changed[i] = state_changed[i].or(states[i + 1][3]);
    const eq2 = input[i].value.equals(58);
    const and5 = states[i][3].and(eq2);
    states[i + 1][4] = and5;
    state_changed[i] = state_changed[i].or(states[i + 1][4]);
    states[i + 1][0] = state_changed[i].not();
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
    is_consecutive[msg_bytes - 1 - i][0] = states[num_bytes - i][2]
      .and(is_consecutive[msg_bytes - i][1].not())
      .or(is_consecutive[msg_bytes - i][1]);
    is_consecutive[msg_bytes - 1 - i][1] = state_changed[msg_bytes - i].and(
      is_consecutive[msg_bytes - 1 - i][0]
    );
  }

  // revealed transitions: [[[1,1],[4,1]]]
  let reveal: Field[][] = [];

  // the 0-th substring transitions: [[1,1],[4,1]]
  const is_reveal0: Bool[] = [];
  let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal0: Field[] = [];
  for (let i = 0; i < msg_bytes - 1; i++) {
    is_substr0[i][0] = Bool(false);
    is_substr0[i][1] = is_substr0[i][0].or(
      states[i + 1][1].and(states[i + 2][1])
    );
    is_substr0[i][2] = is_substr0[i][1].or(
      states[i + 1][4].and(states[i + 2][1])
    );
    is_reveal0[i] = is_substr0[i][2].and(is_consecutive[i][1]);
    reveal0[i] = input[i + 1].value.mul(is_reveal0[i].toField());
  }
  reveal.push(reveal0);

  return { out, reveal };
}

// '[^aeiou]+' '["[^aeiou]+"]'
function negateVowel(input: UInt8[]) {
  const num_bytes = input.length;
  let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
  let state_changed: Bool[] = Array.from({ length: num_bytes }, () =>
    Bool(false)
  );

  states[0][0] = Bool(true);
  for (let i = 1; i < 2; i++) {
    states[0][i] = Bool(false);
  }

  for (let i = 0; i < num_bytes; i++) {
    const eq0 = input[i].value.equals(97);
    const eq1 = input[i].value.equals(101);
    const eq2 = input[i].value.equals(105);
    const eq3 = input[i].value.equals(111);
    const eq4 = input[i].value.equals(117);
    let multi_or0 = Bool(false);
    multi_or0 = multi_or0.or(eq0);
    multi_or0 = multi_or0.or(eq1);
    multi_or0 = multi_or0.or(eq2);
    multi_or0 = multi_or0.or(eq3);
    multi_or0 = multi_or0.or(eq4);
    const and0 = states[i][0].and(multi_or0.not());
    const and1 = states[i][1].and(multi_or0.not());
    let multi_or1 = Bool(false);
    multi_or1 = multi_or1.or(and0);
    multi_or1 = multi_or1.or(and1);
    states[i + 1][1] = multi_or1;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    states[i + 1][0] = state_changed[i].not();
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
    is_consecutive[msg_bytes - 1 - i][0] = states[num_bytes - i][1]
      .and(is_consecutive[msg_bytes - i][1].not())
      .or(is_consecutive[msg_bytes - i][1]);
    is_consecutive[msg_bytes - 1 - i][1] = state_changed[msg_bytes - i].and(
      is_consecutive[msg_bytes - 1 - i][0]
    );
  }

  // revealed transitions: [[[0,1],[1,1]]]
  let reveal: Field[][] = [];

  // the 0-th substring transitions: [[0,1],[1,1]]
  const is_reveal0: Bool[] = [];
  let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
  const reveal0: Field[] = [];
  for (let i = 0; i < msg_bytes; i++) {
    is_substr0[i][0] = Bool(false);
    is_substr0[i][1] = is_substr0[i][0].or(
      states[i + 1][0].and(states[i + 2][1])
    );
    is_substr0[i][2] = is_substr0[i][1].or(
      states[i + 1][1].and(states[i + 2][1])
    );
    is_reveal0[i] = is_substr0[i][2].and(is_consecutive[i][1]);
    reveal0[i] = input[i + 1].value.mul(is_reveal0[i].toField());
  }
  reveal0.unshift(input[0].value.mul(states[1][1].toField()));
  reveal.push(reveal0);

  return { out, reveal };
}
