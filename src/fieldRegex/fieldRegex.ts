/**
 * This file showcases special use cases of regex to operate on field elements or their derivatives instead of the assumed string ASCII bytes.
 * It leverages the theory of DFA (Deterministic Finite Automata) to prove different conditions on field elements in a ZK circuit using o1js.
 *
 * @note The circuit examples shown below are manually modified from compiled regex circuits to
 * showcase the innovative use cases of regex in o1js circuits.
 *
 * @note The examples of these special field regex circuits are hardcoded on values to prove the correctness of DFA in this context,
 * but it's easy to put them as functions that take any value following the logic of the regex pattern.
 *
 * @note Any regex feature of the compiler can be leveraged to process field arrays.
 * This includes counting or validating, and regex syntax support: negation, ranges, the match-one-or-more operator...,
 * as well as the reveal feature to fetch subpatterns or transitions from a full regex pattern.
 */

import { Field, Bool } from 'o1js';

/**
 * Command used: '([a-z]|1|2|3)' but modified to adapt the pattern for field elements
 *
 * This function validates that the input, which is an array of field elements, contains elements that are either between 12345 and 56789101112,
 * or exactly 19, exactly 2024, or exactly the largest field value which is Field(-1) = 28948022309329048855892746252171976963363056481941560715954676764349967630336.
 *
 * In general, with such a pattern, it's possible to prove the inclusion of certain field values in a field array or to prove that the
 * field array contains elements within a particular range.
 *
 * The field regex in this example showcases proving field inclusion with a combination of a certain range or particular values,
 * but both can be showcased separately.
 *
 * So the final "field" regex is '([12345-56789101112]|19|2024|-1)'.
 *
 * @param inputArray - The array of field elements to be validated.
 * @returns boolean - True if the inputArray satisfies the regex pattern, false otherwise.
 */
export function inclusionRegex(input: Field[]) {
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
    const lt0 = new Field(12345).lessThanOrEqual(input[i]);
    const lt1 = input[i].lessThanOrEqual(56789101112);
    const and0 = lt0.and(lt1);
    const eq0 = input[i].equals(19);
    const eq1 = input[i].equals(2024);
    const eq2 = input[i].equals(-1);
    let multi_or0 = Bool(false);
    multi_or0 = multi_or0.or(and0);
    multi_or0 = multi_or0.or(eq0);
    multi_or0 = multi_or0.or(eq1);
    multi_or0 = multi_or0.or(eq2);
    const and1 = states[i][0].and(multi_or0);
    states[i + 1][1] = and1;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    states[i + 1][0] = state_changed[i].not();
  }

  let final_state_result = Bool(false);
  for (let i = 0; i <= num_bytes; i++) {
    final_state_result = final_state_result.or(states[i][1]);
  }
  const out = final_state_result;

  return out;
}

/**
 * Command used: '(abcde)' but modified to adapt the pattern for field elements.
 *
 * This function takes an array of field elements and validates that a specific sequence of 5 field elements exists within the input array.
 * In this example, we use the desired sequence as Field(-1), Field(-2), Field(-3), Field(-4), and Field(-5), which are very large field values.
 *
 * Note that any field values can be used to build a sequence for proving the pattern; the specific values here do not matter, but the order and length of the sequence do.
 *
 * Note that the sequence can consist of any number of fields, and the function will validate that the sequence matches regardless of where it exists within the field array as a subarray.
 *
 * @param inputArray - The array of field elements to be validated.
 * @returns boolean - True if the sequence exists within the inputArray, false otherwise.
 */
export function sequenceRegex(input: Field[]) {
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
    const eq0 = input[i].equals(-1);
    const and0 = states[i][0].and(eq0);
    states[i + 1][1] = and0;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    const eq1 = input[i].equals(-2);
    const and1 = states[i][1].and(eq1);
    states[i + 1][2] = and1;
    state_changed[i] = state_changed[i].or(states[i + 1][2]);
    const eq2 = input[i].equals(-3);
    const and2 = states[i][2].and(eq2);
    states[i + 1][3] = and2;
    state_changed[i] = state_changed[i].or(states[i + 1][3]);
    const eq3 = input[i].equals(-4);
    const and3 = states[i][3].and(eq3);
    states[i + 1][4] = and3;
    state_changed[i] = state_changed[i].or(states[i + 1][4]);
    const eq4 = input[i].equals(-5);
    const and4 = states[i][4].and(eq4);
    states[i + 1][5] = and4;
    state_changed[i] = state_changed[i].or(states[i + 1][5]);
    states[i + 1][0] = state_changed[i].not();
  }

  let final_state_result = Bool(false);
  for (let i = 0; i <= num_bytes; i++) {
    final_state_result = final_state_result.or(states[i][5]);
  }
  const out = final_state_result;

  return out;
}

/**
 * Command used: '[a-z]+' '--count' but modified to count field elements in the range of 55555 and 7777777.
 *
 * This function takes an array of field elements and counts the values that fall within a specified range.
 * This demonstrates a general proof of concept for counting values within a range in an array of fields.
 *
 * Note that the range specified in the example is between 55555 and 777777,
 * but any other range can be used, and the range can even be provided as parameters to the regex, such as min & max.
 *
 * Note that it is also straightforward to count specific values in an array of fields,
 * but this use case of counting within a range is broader and more general.
 *
 * Additionally, it is possible to add a reveal option to fetch the values found within the range on top of the abstract count result.
 * This is an advanced use case and requires additional utility functions to maintain the provability of the circuit since the result is dynamic.
 * In the context of array processing, this would work similarly to a filter.
 *
 * @param inputArray - The array of field elements to be processed.
 * @returns Field - The count of elements within the specified range.
 */
export function countInRangeRegex(input: Field[]) {
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
    const lt0 = Field(55555).lessThanOrEqual(input[i]);
    const lt1 = input[i].lessThanOrEqual(7777777);
    const and0 = lt0.and(lt1);
    const and1 = states[i][0].and(and0);
    const and2 = states[i][1].and(and0);
    let multi_or0 = Bool(false);
    multi_or0 = multi_or0.or(and1);
    multi_or0 = multi_or0.or(and2);
    states[i + 1][1] = multi_or0;
    state_changed[i] = state_changed[i].or(states[i + 1][1]);
    states[i + 1][0] = state_changed[i].not();
  }

  let final_state_sum: Field[] = [];
  final_state_sum[0] = states[0][1].toField();
  for (let i = 1; i <= num_bytes; i++) {
    final_state_sum[i] = final_state_sum[i - 1].add(states[i][1].toField());
  }
  const out = final_state_sum[num_bytes];

  return out;
}

/**
 * Command used: '[^ab]+' but adapted to exclude particular values from an array of field elements.
 *
 * This function takes an array of field elements and returns false if any of the specified values exist in the array.
 * In this example, the values are 123456789 and 11223344556677.
 *
 * It serves to prove that an array of field elements does NOT contain certain field elements.
 *
 * Note that the excluded values can be any numbers, and this functionality can be extended to use ranges and composed with other features of regex.
 *
 * @param inputArray - The array of field elements to be processed.
 * @returns boolean - Returns false if any excluded value is found, otherwise returns true.
 */
export function excludeRegex(input: Field[]) {
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
    const eq0 = input[i].equals(123456789);
    const eq1 = input[i].equals(11223344556677);
    let multi_or0 = Bool(false);
    multi_or0 = multi_or0.or(eq0);
    multi_or0 = multi_or0.or(eq1);
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

  return out;
}
