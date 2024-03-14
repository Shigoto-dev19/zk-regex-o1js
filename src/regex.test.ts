/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Edited from #parseRegex - https://github.com/CyberZHG/toolbox/blob/gh-pages/test/test_lexical_parse_regex.js
 *             #regexToNfa - https://github.com/CyberZHG/toolbox/blob/gh-pages/test/test_lexical_regex_to_nfa.js
 *             #minDfa - https://github.com/CyberZHG/toolbox/blob/gh-pages/test/test_lexical_min_dfa.js 
 */

import { 
    parseRegex, 
    regexToNfa,
    nfaToDfa,
    minDfa as minimumDfa,
    State,
} from './lexical';

describe('Lexical', function () {
    describe('#parseRegex', function () {
        it('Empty', function () {
            let actual = parseRegex('ϵ'),
                expected = {
                    'begin': 0,
                    'end': 1,
                    'type': 'empty'
                };
            expect(actual).toEqual(expected);
        });

        it('Text', function () {
            let actual = parseRegex('a'),
                expected = {
                    'begin': 0,
                    'end': 1,
                    'type': 'text',
                    'text': 'a'
                };
            expect(actual).toEqual(expected);
        });

        it('Cat', function () {
            let actual = parseRegex('ab'),
                expected = {
                    'begin': 0,
                    'end': 2,
                    'type': 'cat',
                    'parts': [
                        {
                            'begin': 0,
                            'end': 1,
                            'type': 'text',
                            'text': 'a'
                        },
                        {
                            'begin': 1,
                            'end': 2,
                            'type': 'text',
                            'text': 'b'
                        }
                    ]
                };
            expect(actual).toEqual(expected);
        });

        it('Or', function () {
            let actual = parseRegex('a|b'),
                expected = {
                    'begin': 0,
                    'end': 3,
                    'type': 'or',
                    'parts': [
                        {
                            'begin': 0,
                            'end': 1,
                            'type': 'text',
                            'text': 'a'
                        },
                        {
                            'begin': 2,
                            'end': 3,
                            'type': 'text',
                            'text': 'b'
                        }
                    ]
                };
            expect(actual).toEqual(expected);
        });

        it('Brackets', function () {
            let actual = parseRegex('(a)'),
                expected = {
                    'begin': 0,
                    'end': 3,
                    'type': 'text',
                    'text': 'a'
                };
            expect(actual).toEqual(expected);
        });

        it('Star', function () {
            let actual = parseRegex('a*'),
                expected = {
                    'begin': 0,
                    'end': 2,
                    'type': 'star',
                    'sub': {
                        'begin': 0,
                        'end': 1,
                        'type': 'text',
                        'text': 'a'
                    }
                };
            expect(actual).toEqual(expected);
        });

        it('Example 3.7.3 (a)', function () {
            let actual = parseRegex('(a|b)*'),
                expected = {
                    'begin': 0,
                    'end': 6,
                    'type': 'star',
                    'sub': {
                        'begin': 0,
                        'end': 5,
                        'type': 'or',
                        'parts': [
                            {
                                'begin': 1,
                                'end': 2,
                                'type': 'text',
                                'text': 'a'
                            },
                            {
                                'begin': 3,
                                'end': 4,
                                'type': 'text',
                                'text': 'b'
                            }
                        ]
                    }
                };
            expect(actual).toEqual(expected);
        });

        it('Example 3.7.3 (b)', function () {
            let actual = parseRegex('(a*|b*)*'),
                expected = {
                    'begin': 0,
                    'end': 8,
                    'type': 'star',
                    'sub': {
                        'begin': 0,
                        'end': 7,
                        'type': 'or',
                        'parts': [
                            {
                                'begin': 1,
                                'end': 3,
                                'type': 'star',
                                'sub': {
                                    'begin': 1,
                                    'end': 2,
                                    'type': 'text',
                                    'text': 'a'
                                }
                            },
                            {
                                'begin': 4,
                                'end': 6,
                                'type': 'star',
                                'sub': {
                                    'begin': 4,
                                    'end': 5,
                                    'type': 'text',
                                    'text': 'b'
                                }
                            }
                        ]
                    }
                };
            expect(actual).toEqual(expected);
        });

        it('Example 3.7.3 (c)', function () {
            let actual = parseRegex('((ϵ|a)b*)*'),
                expected = {
                    'begin': 0,
                    'end': 10,
                    'type': 'star',
                    'sub': {
                        'begin': 0,
                        'end': 9,
                        'type': 'cat',
                        'parts': [
                            {
                                'begin': 1,
                                'end': 6,
                                'type': 'or',
                                'parts': [
                                    {
                                        'begin': 2,
                                        'end': 3,
                                        'type': 'empty'
                                    },
                                    {
                                        'begin': 4,
                                        'end': 5,
                                        'type': 'text',
                                        'text': 'a'
                                    }
                                ]
                            },
                            {
                                'begin': 6,
                                'end': 8,
                                'type': 'star',
                                'sub': {
                                    'begin': 6,
                                    'end': 7,
                                    'type': 'text',
                                    'text': 'b'
                                }
                            }
                        ]
                    }
                };
            expect(actual).toEqual(expected);
        });

        it('Example 3.7.3 (d)', function () {
            let actual = parseRegex('(a|b)*abb(a|b)*'),
                expected = {
                    'begin': 0,
                    'end': 15,
                    'type': 'cat',
                    'parts': [
                        {
                            'begin': 0,
                            'end': 6,
                            'type': 'star',
                            'sub': {
                                'begin': 0,
                                'end': 5,
                                'type': 'or',
                                'parts': [
                                    {
                                        'begin': 1,
                                        'end': 2,
                                        'type': 'text',
                                        'text': 'a'
                                    },
                                    {
                                        'begin': 3,
                                        'end': 4,
                                        'type': 'text',
                                        'text': 'b'
                                    }
                                ]
                            }
                        },
                        {
                            'begin': 6,
                            'end': 7,
                            'type': 'text',
                            'text': 'a'
                        },
                        {
                            'begin': 7,
                            'end': 8,
                            'type': 'text',
                            'text': 'b'
                        },
                        {
                            'begin': 8,
                            'end': 9,
                            'type': 'text',
                            'text': 'b'
                        },
                        {
                            'begin': 9,
                            'end': 15,
                            'type': 'star',
                            'sub': {
                                'begin': 9,
                                'end': 14,
                                'type': 'or',
                                'parts': [
                                    {
                                        'begin': 10,
                                        'end': 11,
                                        'type': 'text',
                                        'text': 'a'
                                    },
                                    {
                                        'begin': 12,
                                        'end': 13,
                                        'type': 'text',
                                        'text': 'b'
                                    }
                                ]
                            }
                        }
                    ]
                };
            expect(actual).toEqual(expected);
        });
    });

    describe('#regexToNfa', function () {
        it('Empty', function () {
            let actual = regexToNfa('ϵ'),
                nodes: State[] = [
                    {
                        'id': '0',
                        'type': 'start',
                        'edges': []
                    },
                    {
                        'id': '1',
                        'type': 'accept',
                        'edges': []
                    }
                ];
            nodes[0].edges!.push(['ϵ', nodes[1]]);
            expect(actual).toEqual(nodes[0]);
        });

        it('Text', function () {
            let actual = regexToNfa('a'),
                nodes: State[] = [
                    {
                        'id': '0',
                        'type': 'start',
                        'edges': []
                    },
                    {
                        'id': '1',
                        'type': 'accept',
                        'edges': []
                    }
                ];
            nodes[0].edges!.push(['a', nodes[1]]);
            expect(actual).toEqual(nodes[0]);
        });

        it('Cat 2', function () {
            let actual = regexToNfa('ab'),
                nodes: State[] = [
                    {
                        'id': '0',
                        'type': 'start',
                        'edges': []
                    },
                    {
                        'id': '1',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '2',
                        'type': 'accept',
                        'edges': []
                    }
                ];
            nodes[0].edges!.push(['a', nodes[1]]);
            nodes[1].edges!.push(['b', nodes[2]]);
            expect(actual).toEqual(nodes[0]);
        });

        it('Cat 3', function () {
            let actual = regexToNfa('abc'),
                nodes: State[] = [
                    {
                        'id': '0',
                        'type': 'start',
                        'edges': []
                    },
                    {
                        'id': '1',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '2',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '3',
                        'type': 'accept',
                        'edges': []
                    }
                ];
            nodes[0].edges!.push(['a', nodes[1]]);
            nodes[1].edges!.push(['b', nodes[2]]);
            nodes[2].edges!.push(['c', nodes[3]]);
            expect(actual).toEqual(nodes[0]);
        });

        it('Or', function () {
            let actual = regexToNfa('a|b'),
                nodes: State[] = [
                    {
                        'id': '0',
                        'type': 'start',
                        'edges': []
                    },
                    {
                        'id': '1',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '2',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '3',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '4',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '5',
                        'type': 'accept',
                        'edges': []
                    }
                ];
            nodes[0].edges!.push(['ϵ', nodes[1]]);
            nodes[0].edges!.push(['ϵ', nodes[3]]);
            nodes[1].edges!.push(['a', nodes[2]]);
            nodes[3].edges!.push(['b', nodes[4]]);
            nodes[2].edges!.push(['ϵ', nodes[5]]);
            nodes[4].edges!.push(['ϵ', nodes[5]]);
            expect(actual).toEqual(nodes[0]);
        });

        it('Star', function () {
            let actual = regexToNfa('a*'),
                nodes: State[] = [
                    {
                        'id': '0',
                        'type': 'start',
                        'edges': []
                    },
                    {
                        'id': '1',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '2',
                        'type': '',
                        'edges': []
                    },
                    {
                        'id': '3',
                        'type': 'accept',
                        'edges': []
                    }
                ];
            nodes[0].edges!.push(['ϵ', nodes[1]]);
            nodes[0].edges!.push(['ϵ', nodes[3]]);
            nodes[1].edges!.push(['a', nodes[2]]);
            nodes[2].edges!.push(['ϵ', nodes[1]]);
            nodes[2].edges!.push(['ϵ', nodes[3]]);
            expect(actual).toEqual(nodes[0]);
        });

        /*function toNodes(start) {
            let ids = {},
                front,
                node,
                nodes: State[] = [],
                queue = [start];
            for (front = 0; front < queue.length; front += 1) {
                node = queue[front];
                if (!ids.hasOwnProperty(node.id)) {
                    ids[node.id] = node;
                    node.edges.forEach(function (edge) {
                        queue.push(edge[1]);
                    });
                }
            }
            Object.keys(ids).forEach(function (key) {
                ids[key].edges = [];
                nodes.push(ids[key]);
            });
            console.log(nodes);
            return nodes;
        }

        function toEdges(start) {
            let ids = {},
                front,
                node,
                nodes: State[] = [],
                queue = [start];
            for (front = 0; front < queue.length; front += 1) {
                node = queue[front];
                if (!ids.hasOwnProperty(node.id)) {
                    ids[node.id] = node;
                    node.edges.forEach(function (edge) {
                        queue.push(edge[1]);
                    });
                }
            }
            Object.keys(ids).forEach(function (key) {
                ids[key].edges.forEach(function (edge) {
                    console.log('nodes[' + key + '].edges.push([\'' + edge[0] + '\', nodes[' + edge[1].id + ']]);');
                });
            });
            return nodes;
        }*/

        it('Example 3.7.3 (a)', function () {
            let actual = regexToNfa('(a|b)*'),
                nodes: State[] = [
                    {type: 'start', edges: [], id: '0'},
                    {type: '', edges: [], id: '1'},
                    {type: '', edges: [], id: '2'},
                    {type: '', edges: [], id: '3'},
                    {type: '', edges: [], id: '4'},
                    {type: '', edges: [], id: '5'},
                    {type: '', edges: [], id: '6'},
                    {type: 'accept', edges: [], id: '7'}
                ];
            nodes[0].edges!.push(['ϵ', nodes[1]]);
            nodes[0].edges!.push(['ϵ', nodes[7]]);
            nodes[1].edges!.push(['ϵ', nodes[2]]);
            nodes[1].edges!.push(['ϵ', nodes[4]]);
            nodes[2].edges!.push(['a', nodes[3]]);
            nodes[3].edges!.push(['ϵ', nodes[6]]);
            nodes[4].edges!.push(['b', nodes[5]]);
            nodes[5].edges!.push(['ϵ', nodes[6]]);
            nodes[6].edges!.push(['ϵ', nodes[1]]);
            nodes[6].edges!.push(['ϵ', nodes[7]]);
            expect(actual).toEqual(nodes[0]);
        });

        it('Example 3.7.3 (b)', function () {
            let actual = regexToNfa('(a*|b*)*'),
                nodes: State[] = [
                    {type: 'start', edges: [], id: '0'},
                    {type: '', edges: [], id: '1'},
                    {type: '', edges: [], id: '2'},
                    {type: '', edges: [], id: '3'},
                    {type: '', edges: [], id: '4'},
                    {type: '', edges: [], id: '5'},
                    {type: '', edges: [], id: '6'},
                    {type: '', edges: [], id: '7'},
                    {type: '', edges: [], id: '8'},
                    {type: '', edges: [], id: '9'},
                    {type: '', edges: [], id: '10'},
                    {type: 'accept', edges: [], id: '11'}
                ];
            nodes[0].edges!.push(['ϵ', nodes[1]]);
            nodes[0].edges!.push(['ϵ', nodes[11]]);
            nodes[1].edges!.push(['ϵ', nodes[2]]);
            nodes[1].edges!.push(['ϵ', nodes[6]]);
            nodes[2].edges!.push(['ϵ', nodes[3]]);
            nodes[2].edges!.push(['ϵ', nodes[5]]);
            nodes[3].edges!.push(['a', nodes[4]]);
            nodes[4].edges!.push(['ϵ', nodes[3]]);
            nodes[4].edges!.push(['ϵ', nodes[5]]);
            nodes[5].edges!.push(['ϵ', nodes[10]]);
            nodes[6].edges!.push(['ϵ', nodes[7]]);
            nodes[6].edges!.push(['ϵ', nodes[9]]);
            nodes[7].edges!.push(['b', nodes[8]]);
            nodes[8].edges!.push(['ϵ', nodes[7]]);
            nodes[8].edges!.push(['ϵ', nodes[9]]);
            nodes[9].edges!.push(['ϵ', nodes[10]]);
            nodes[10].edges!.push(['ϵ', nodes[1]]);
            nodes[10].edges!.push(['ϵ', nodes[11]]);
            expect(actual).toEqual(nodes[0]);
        });

        it('Example 3.7.3 (c)', function () {
            let actual = regexToNfa('((ϵ|a)b*)*'),
                nodes: State[] = [
                    {type: 'start', edges: [], id: '0'},
                    {type: '', edges: [], id: '1'},
                    {type: '', edges: [], id: '2'},
                    {type: '', edges: [], id: '3'},
                    {type: '', edges: [], id: '4'},
                    {type: '', edges: [], id: '5'},
                    {type: '', edges: [], id: '6'},
                    {type: '', edges: [], id: '7'},
                    {type: '', edges: [], id: '8'},
                    {type: '', edges: [], id: '9'},
                    {type: 'accept', edges: [], id: '10'}
                ];
            nodes[0].edges!.push(['ϵ', nodes[1]]);
            nodes[0].edges!.push(['ϵ', nodes[10]]);
            nodes[1].edges!.push(['ϵ', nodes[2]]);
            nodes[1].edges!.push(['ϵ', nodes[4]]);
            nodes[2].edges!.push(['ϵ', nodes[3]]);
            nodes[3].edges!.push(['ϵ', nodes[6]]);
            nodes[4].edges!.push(['a', nodes[5]]);
            nodes[5].edges!.push(['ϵ', nodes[6]]);
            nodes[6].edges!.push(['ϵ', nodes[7]]);
            nodes[6].edges!.push(['ϵ', nodes[9]]);
            nodes[7].edges!.push(['b', nodes[8]]);
            nodes[8].edges!.push(['ϵ', nodes[7]]);
            nodes[8].edges!.push(['ϵ', nodes[9]]);
            nodes[9].edges!.push(['ϵ', nodes[1]]);
            nodes[9].edges!.push(['ϵ', nodes[10]]);
            expect(actual).toEqual(nodes[0]);
        });

        it('Example 3.7.3 (d)', function () {
            let actual = regexToNfa('(a|b)*abb(a|b)*'),
                nodes: State[] = [
                    {type: 'start', edges: [], id: '0'},
                    {type: '', edges: [], id: '1'},
                    {type: '', edges: [], id: '2'},
                    {type: '', edges: [], id: '3'},
                    {type: '', edges: [], id: '4'},
                    {type: '', edges: [], id: '5'},
                    {type: '', edges: [], id: '6'},
                    {type: '', edges: [], id: '7'},
                    {type: '', edges: [], id: '8'},
                    {type: '', edges: [], id: '9'},
                    {type: '', edges: [], id: '10'},
                    {type: '', edges: [], id: '11'},
                    {type: '', edges: [], id: '12'},
                    {type: '', edges: [], id: '13'},
                    {type: '', edges: [], id: '14'},
                    {type: '', edges: [], id: '15'},
                    {type: '', edges: [], id: '16'},
                    {type: 'accept', edges: [], id: '17'}
                ];
            nodes[0].edges!.push(['ϵ', nodes[1]]);
            nodes[0].edges!.push(['ϵ', nodes[7]]);
            nodes[1].edges!.push(['ϵ', nodes[2]]);
            nodes[1].edges!.push(['ϵ', nodes[4]]);
            nodes[2].edges!.push(['a', nodes[3]]);
            nodes[3].edges!.push(['ϵ', nodes[6]]);
            nodes[4].edges!.push(['b', nodes[5]]);
            nodes[5].edges!.push(['ϵ', nodes[6]]);
            nodes[6].edges!.push(['ϵ', nodes[1]]);
            nodes[6].edges!.push(['ϵ', nodes[7]]);
            nodes[7].edges!.push(['a', nodes[8]]);
            nodes[8].edges!.push(['b', nodes[9]]);
            nodes[9].edges!.push(['b', nodes[10]]);
            nodes[10].edges!.push(['ϵ', nodes[11]]);
            nodes[10].edges!.push(['ϵ', nodes[17]]);
            nodes[11].edges!.push(['ϵ', nodes[12]]);
            nodes[11].edges!.push(['ϵ', nodes[14]]);
            nodes[12].edges!.push(['a', nodes[13]]);
            nodes[13].edges!.push(['ϵ', nodes[16]]);
            nodes[14].edges!.push(['b', nodes[15]]);
            nodes[15].edges!.push(['ϵ', nodes[16]]);
            nodes[16].edges!.push(['ϵ', nodes[11]]);
            nodes[16].edges!.push(['ϵ', nodes[17]]);
            expect(actual).toEqual(nodes[0]);
        });

    });

    describe('#minDfa', function () {
        it('ϵ', function () {
            let nfa = regexToNfa('ϵ'),
                dfa = nfaToDfa(nfa as State),
                minDfa = minimumDfa(dfa);
            expect(minDfa.key).toEqual('A');
            expect(minDfa.edges!.length).toEqual(0);
        });

        it('(a|b)*', function () {
            let nfa = regexToNfa('(a|b)*'),
                dfa = nfaToDfa(nfa as State),
                minDfa = minimumDfa(dfa);
            console.log('ts dfa: ', dfa);
            expect(minDfa.key).toEqual('A,B,C');
            expect(minDfa.edges!.length).toEqual(1);
            expect(minDfa.trans!['a,b'].key).toEqual('A,B,C');
        });

        it('(a|b)+', function () {
            let nfa = regexToNfa('(a|b)+'),
                dfa = nfaToDfa(nfa as State),
                minDfa = minimumDfa(dfa);
            expect(minDfa.key).toEqual('A');
            expect(minDfa.edges!.length).toEqual(1);
            expect(minDfa.trans!['a,b'].key).toEqual('B,C,D,E');
            expect(minDfa.trans!['a,b'].edges!.length).toEqual(1);
            expect(minDfa.trans!['a,b'].trans!['a,b'].key).toEqual('B,C,D,E');
        });

        it('a(b|c)*', function () {
            let nfa = regexToNfa('a(b|c)*'),
                dfa = nfaToDfa(nfa as State),
                minDfa = minimumDfa(dfa);
            expect(minDfa.key).toEqual('A');
            expect(minDfa.edges!.length).toEqual(1);
            expect(minDfa.trans!.a.key).toEqual('B,C,D');
            expect(minDfa.trans!.a.edges!.length).toEqual(1);
            expect(minDfa.trans!.a.trans!['b,c'].key).toEqual('B,C,D');
        });

        it('(a|b)*(c|d)*', function () {
            let nfa = regexToNfa('(a|b)*(c|d)*'),
                dfa = nfaToDfa(nfa as State),
                minDfa = minimumDfa(dfa);
            expect(minDfa.key).toEqual( 'A,B,C');
            expect(minDfa.edges!.length).toEqual(2);
            expect(minDfa.trans!['a,b'].key).toEqual('A,B,C');
            expect(minDfa.trans!['c,d'].key).toEqual('D,E');
            expect(minDfa.trans!['c,d'].edges!.length).toEqual(1);
            expect(minDfa.trans!['c,d'].trans!['c,d'].key).toEqual('D,E');
        });

        it('ab|b', function () {
            let nfa = regexToNfa('ab|b'),
                dfa = nfaToDfa(nfa as State),
                minDfa = minimumDfa(dfa);
            expect(minDfa.key).toEqual('A');
            expect(minDfa.edges!.length).toEqual(2);
            expect(minDfa.trans!.a.key).toEqual('B');
            expect(minDfa.trans!.b.key).toEqual('C,D');
            expect(minDfa.trans!.a.edges!.length).toEqual(1);
            expect(minDfa.trans!.a.trans!.b.key).toEqual('C,D');
        });
    });
});