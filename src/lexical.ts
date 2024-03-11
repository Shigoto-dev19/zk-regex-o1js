/* eslint-disable @typescript-eslint/no-non-null-assertion */

export { 
  parseRegex,
  regexToNfa,
  State,
}

type Node = { 
  begin: number;
  end: number;
  type?: string;
  text?: string;
  parts?: Node[];
  sub?: Node;
}

type State = { 
  type: string;
  edges: [string, State][];
  id?: number;
}

/**
 * Try parsing simple regular expression to syntax tree.
 *
 * Basic grammars:
 *   Empty: S -> ϵ
 *   Cat:   S -> S S
 *   Or:    S -> S | S
 *   Star:  S -> S *
 *   Text:  S -> [0-9a-zA-Z]
 *   S -> ( S )
 *
 * Extension:
 *   Plus:  S -> S + -> S S *
 *   Ques:  S -> S ? -> (S | ϵ)
 *
 * @param {string} text The input regular expression
 * @return {string|object} Returns a string that is an error message if failed to parse the expression,
 *                         otherwise returns an object which is the syntax tree.
 *
 * Edited from https://github.com/CyberZHG/toolbox/blob/gh-pages/js/lexical.js
 */
function parseRegex(text: string) {
  function parseSub(text: string[], begin: number, end: number, first: boolean): string | Node {
    let i: number,
      sub,
      last = 0,
      node: Node = { begin: begin, end: end },
      virNode: Node,
      tempNode: Node,
      stack = 0,
      parts: Node[] = [];
    if (text.length === 0) {
      return "Error: empty input at " + begin.toString() + ".";
    }
    if (first) {
      for (i = 0; i <= text.length; i += 1) {
        if (i === text.length || (text[i] === "|" && stack === 0)) {
          if (last === 0 && i === text.length) {
            return parseSub(text, begin + last, begin + i, false);
          }
          sub = parseSub(text.slice(last, i), begin + last, begin + i, true);
          if (typeof sub === "string") {
            return sub;
          }
          parts.push(sub);
          last = i + 1;
        } else if (text[i] === "(") {
          stack += 1;
        } else if (text[i] === ")") {
          stack -= 1;
        }
      }
      if (parts.length === 1) {
        return parts[0];
      }
      node.type = "or";
      node.parts = parts;
    } else {
      for (i = 0; i < text.length; i += 1) {
        if (text[i] === "(") {
          last = i + 1;
          i += 1;
          stack = 1;
          while (i < text.length && stack !== 0) {
            if (text[i] === "(") {
              stack += 1;
            } else if (text[i] === ")") {
              stack -= 1;
            }
            i += 1;
          }
          if (stack !== 0) {
            return "Error: missing right bracket for " + (begin + last).toString() + ".";
          }
          i -= 1;
          sub = parseSub(text.slice(last, i), begin + last, begin + i, true);
          if (typeof sub === "string") {
            return sub;
          }
          sub.begin -= 1;
          sub.end += 1;
          parts.push(sub);
        } else if (text[i] === "*") {
          if (parts.length === 0) {
            return "Error: unexpected * at " + (begin + i).toString() + ".";
          }
          tempNode = { begin: parts[parts.length - 1].begin, end: parts[parts.length - 1].end + 1 };
          tempNode.type = "star";
          tempNode.sub = parts[parts.length - 1];
          parts[parts.length - 1] = tempNode;
        } else if (text[i] === "+") {
          if (parts.length === 0) {
            return "Error: unexpected + at " + (begin + i).toString() + ".";
          }
          virNode = { begin: parts[parts.length - 1].begin, end: parts[parts.length - 1].end + 1 };
          virNode.type = "star";
          virNode.sub = parts[parts.length - 1];
          tempNode = { begin: parts[parts.length - 1].begin, end: parts[parts.length - 1].end + 1 };
          tempNode.type = "cat";
          tempNode.parts = [parts[parts.length - 1], virNode];
          parts[parts.length - 1] = tempNode;
        } else if (text[i] === "?") {
          if (parts.length === 0) {
            return "Error: unexpected + at " + (begin + i).toString() + ".";
          }
          virNode = { begin: parts[parts.length - 1].begin, end: parts[parts.length - 1].end + 1 };
          virNode.type = "empty";
          virNode.sub = parts[parts.length - 1];
          tempNode = { begin: parts[parts.length - 1].begin, end: parts[parts.length - 1].end + 1 };
          tempNode.type = "or";
          tempNode.parts = [parts[parts.length - 1], virNode];
          parts[parts.length - 1] = tempNode;
        } else if (text[i] === "ϵ") {
          tempNode = { begin: begin + i, end: begin + i + 1 };
          tempNode.type = "empty";
          parts.push(tempNode);
        } else if (Array.isArray(text[i])) {
          tempNode = { begin: begin + i, end: begin + i + 1 };
          tempNode.type = "text";
          tempNode.text = text[i][0];
          parts.push(tempNode);
        } else {
          tempNode = { begin: begin + i, end: begin + i + 1 };
          tempNode.type = "text";
          tempNode.text = text[i];
          parts.push(tempNode);
        }
      }
      if (parts.length === 1) {
        return parts[0];
      }
      node.type = "cat";
      node.parts = parts;
    }
    return node;
  }

  let new_text: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\") {
      const escapeMap: Record<string, string> = { n: "\n", r: "\r", t: "\t", v: "\v", f: "\f", "^": String.fromCharCode(128) };
      const char = text[i + 1];
      new_text.push(escapeMap[char] || char);
      i += 2;
    } else {
      new_text.push(text[i]);
      i += 1;
    }
  }
  return parseSub(new_text, 0, new_text.length, true);
}

/**
 * Convert regular expression to nondeterministic finite automaton.
 *
 * @param {string} text @see parseRegex()
 * @return {object|string}
 */
function regexToNfa(text: string) {
  function generateGraph(node: Node, start: State, end: State, count: number) {
    let i: number, 
    last: State, 
    temp: State, 
    tempStart: State, 
    tempEnd: State;

    if (!Object.prototype.hasOwnProperty.call(start, "id")) {
      start.id = count;
      count += 1;
    }
    switch (node.type) {
      case "empty":
        start.edges.push(["ϵ", end]);
        break;
      case "text":
        start.edges.push([node.text!, end]);
        break;
      case "cat":
        last = start;
        for (i = 0; i < node.parts!.length - 1; i += 1) {
          temp = { type: "", edges: [] };
          count = generateGraph(node.parts![i], last, temp, count);
          last = temp;
        }
        count = generateGraph(node.parts![node.parts!.length - 1], last, end, count);
        break;
      case "or":
        for (i = 0; i < node.parts!.length; i += 1) {
          tempStart = { type: "", edges: [] };
          tempEnd = { type: "", edges: [["ϵ", end]] };
          start.edges.push(["ϵ", tempStart]);
          count = generateGraph(node.parts![i], tempStart, tempEnd, count);
        }
        break;
      case "star":
        tempStart = { type: "", edges: [] };
        tempEnd = {
          type: "",
          edges: [
            ["ϵ", tempStart],
            ["ϵ", end],
          ],
        };
        start.edges.push(["ϵ", tempStart]);
        start.edges.push(["ϵ", end]);
        count = generateGraph(node.sub!, tempStart, tempEnd, count);
        break;
    }
    if (!Object.prototype.hasOwnProperty.call(end, "id")) {
      end.id = count;
      count += 1;
    }
    return count;
  }
  let ast = parseRegex(text),
    start = { type: "start", edges: [] },
    accept = { type: "accept", edges: [] };
  if (typeof ast === "string") {
    return ast;
  }
  generateGraph(ast, start, accept, 0);
  return start;
}
