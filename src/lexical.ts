type NodeTypeTrial = { 
  begin: number;
  end: number;
  type?: string;
  text?: string;
  parts?: NodeTypeTrial[];
  sub?: NodeTypeTrial;
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
export function parseRegex(text: string) {
  function parseSub(text: string[], begin: number, end: number, first: boolean): string | NodeTypeTrial {
    let i: number,
      sub,
      last = 0,
      node: NodeTypeTrial = { begin: begin, end: end },
      virNode: NodeTypeTrial,
      tempNode: NodeTypeTrial,
      stack = 0,
      parts: NodeTypeTrial[] = [];
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