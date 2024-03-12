/* eslint-disable @typescript-eslint/no-non-null-assertion */

export { 
  parseRegex,
  regexToNfa,
  State,
  nfaToDfa,
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

type Closure = { 
  key?: string; 
  items: State[]; 
  symbols?: string[]; 
  type?: string; 
  edges?: [string, Closure][]; 
  id?: string;
  trans?: Record<string, Closure>; 
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
 * @return {State|string}
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
    start: State = { type: "start", edges: [] },
    accept: State = { type: "accept", edges: [] };
  if (typeof ast === "string") {
    return ast;
  }
  generateGraph(ast, start, accept, 0);
  return start;
}

/**
 * Convert nondeterministic finite automaton to deterministic finite automaton.
 *
 * @param {State} nfa @see regexToNfa(), the function assumes that the given NFA is valid.
 * @return {Closure} dfa Returns the first element of the DFA.
 */
function nfaToDfa(nfa: State): Closure {
  function getClosure(nodes: State[]): Closure {
    let closure: State[] = [],
      stack: State[] = [],
      symbols: string[] = [],
      type = "",
      top: State;
    for (let i = 0; i < nodes.length; i += 1) {
      stack.push(nodes[i]);
      closure.push(nodes[i]);
      if (nodes[i].type === "accept") {
        type = "accept";
      }
    }
    while (stack.length > 0) {
      top = stack.pop()!;
      // If top is of type string and starts with "Error" then return error
      if (typeof top === "string" && top[0] === "E") {
        console.log(top);
        continue;
      }
      for (i = 0; i < top.edges.length; i += 1) {
        if (top.edges[i][0] === "ϵ") {
          if (closure.indexOf(top.edges[i][1]) < 0) {
            stack.push(top.edges[i][1]);
            closure.push(top.edges[i][1]);
            if (top.edges[i][1].type === "accept") {
              type = "accept";
            }
          }
        } else {
          if (symbols.indexOf(top.edges[i][0]) < 0) {
            symbols.push(top.edges[i][0]);
          }
        }
      }
    }
    closure.sort((a: State, b: State) =>  a.id! - b.id!);
    symbols.sort();
    return {
      key: closure
        .map((x) => x.id)
        .join(","),
      items: closure,
      symbols: symbols,
      type: type,
      edges: [],
      trans: {},
    };
  }
  function getClosedMove(closure: Closure, symbol: string) {
    let node,
        nexts = [];
    for (let i = 0; i < closure.items.length; i += 1) {
      node = closure.items[i];
      for (let j = 0; j < node.edges.length; j += 1) {
        if (symbol === node.edges[j][0]) {
          if (nexts.indexOf(node.edges[j][1]) < 0) {
            nexts.push(node.edges[j][1]);
          }
        }
      }
    }
    return getClosure(nexts);
  }
  function toAlphaCount(n: number) {
    let a = "A".charCodeAt(0),
      z = "Z".charCodeAt(0),
      len = z - a + 1,
      s = "";
    while (n >= 0) {
      s = String.fromCharCode((n % len) + a) + s;
      n = Math.floor(n / len) - 1;
    }
    return s;
  }
  let i,
    first = getClosure([nfa]),
    states: Record<string, Closure> = {},
    front = 0,
    top: Closure,
    closure: Closure,
    queue = [first],
    count = 0;
  first.id = toAlphaCount(count);
  states[first.key!] = first;
  while (front < queue.length) {
    top = queue[front];
    front += 1;
    for (i = 0; i < top.symbols!.length; i += 1) {
      closure = getClosedMove(top, top.symbols![i]);
      if (!Object.prototype.hasOwnProperty.call(states, closure.key!)) {
        count += 1;
        closure.id = toAlphaCount(count);
        states[closure.key!] = closure;
        queue.push(closure);
      }
      top.trans![top.symbols![i]] = states[closure.key!];
      top.edges!.push([top.symbols![i], states[closure.key!]]);
    }
  }
  return first;
}
