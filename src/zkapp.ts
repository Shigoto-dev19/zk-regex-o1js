import {
    Bool,
    Field,
    SmartContract,
    state,
    State,
    method,
    Bytes,
    Poseidon,
    PublicKey,
    Provable,
    Mina,
    PrivateKey,
    AccountUpdate,
} from 'o1js';

class Bytes16 extends Bytes(16) {}
export class RegexZkApp extends SmartContract {
    @state(Field) secretAdmin = State<Field>();
    @state(Bool) isDiscovered = State<Bool>();
    @state(PublicKey) mysterySolver = State<PublicKey>();

    @method async initalize(adminName: Bytes16) {
    super.init();
        this.secretAdmin.set(Poseidon.hash(adminName.toFields()));
        this.isDiscovered.set(Bool(false));
        this.mysterySolver.set(PublicKey.empty());
    }

    @method async guessName(statement: Bytes16) {
        // This regex pattern specifies an alphabetic name of length 4 where the first letter is capitalized
        let { out, reveal } = nameRegex(statement.toFields());
        out.assertEquals(1, "Please enter only one valid name!");

        const name = reveal[0];
        const calualtedId = Poseidon.hash(name);

        const adminCheck = this.secretAdmin.getAndRequireEquals().equals(calualtedId);
        this.isDiscovered.set(adminCheck);

        const solverAddress: PublicKey = Provable.if(
            adminCheck,
            this.sender.getAndRequireSignature(),
            PublicKey.empty()
        );

        this.mysterySolver.set(solverAddress);
        //? Add payment logic for the first mystery solver
    }
}

const proofsEnabled = false;

const Local = await Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);
const [deployerAccount, senderAccount] = Local.testAccounts;

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

const zkAppInstance = new RegexZkApp(zkAppAddress);
if (proofsEnabled) await RegexZkApp.compile();

const deployTxn = await Mina.transaction(deployerAccount, async () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    await zkAppInstance.deploy();
    await zkAppInstance.initalize(Bytes16.fromString("Bart"));
});

await deployTxn.prove()
await deployTxn.sign([zkAppPrivateKey, deployerAccount.key ]).send();

const tx = await Mina.transaction(senderAccount, async () => {
    const guess = Bytes16.fromString('Bart the great!');
    await zkAppInstance.guessName(guess);
});

await tx.prove();
await tx.sign([senderAccount.key]).send();


console.log(
    'guessName method rows: ',
    (await RegexZkApp.analyzeMethods({ printSummary: false }))['guessName'].rows
);
console.log('Admin name is discovered: ', zkAppInstance.isDiscovered.get().toBoolean());


// "name: [A-Z][a-z][a-z][a-z]" & revealing all
// Basically, the regex pattern is to give an alphabetic name of length 4 where the first letter is capital
function nameRegex(input: Field[]) {
    const num_bytes = input.length;
    let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
    let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));

    states[0][0] = Bool(true);
    for (let i = 1; i < 5; i++) {
        states[0][i] = Bool(false);
    }

    for (let i = 0; i < num_bytes; i++) {
        const lt0 = Field(65).lessThanOrEqual(input[i]);
        const lt1 = input[i].lessThanOrEqual(90);
        const and0 = lt0.and(lt1);
        const and1 = states[i][0].and(and0);
        states[i+1][1] = and1;
        state_changed[i] = state_changed[i].or(states[i+1][1]);
        const lt2 = Field(97).lessThanOrEqual(input[i]);
        const lt3 = input[i].lessThanOrEqual(122);
        const and2 = lt2.and(lt3);
        const and3 = states[i][1].and(and2);
        states[i+1][2] = and3;
        state_changed[i] = state_changed[i].or(states[i+1][2]);
        const and4 = states[i][2].and(and2);
        states[i+1][3] = and4;
        state_changed[i] = state_changed[i].or(states[i+1][3]);
        const and5 = states[i][3].and(and2);
        states[i+1][4] = and5;
        state_changed[i] = state_changed[i].or(states[i+1][4]);
        states[i+1][0] = state_changed[i].not();
    }

    let final_state_sum: Field[] = [];
    final_state_sum[0] = states[0][4].toField();
    for (let i = 1; i <= num_bytes; i++) {
        final_state_sum[i] = final_state_sum[i-1].add(states[i][4].toField());
    }
    const out = final_state_sum[num_bytes];

    const msg_bytes = num_bytes - 1;
    const is_consecutive: Bool[][] = Array.from({ length: num_bytes }, () => []);
    is_consecutive[msg_bytes][1] = Bool(true);
    for (let i = 0; i < msg_bytes; i++) {
        is_consecutive[msg_bytes-1-i][0] = states[num_bytes-i][4].and(is_consecutive[msg_bytes-i][1].not()).or(is_consecutive[msg_bytes-i][1]);
        is_consecutive[msg_bytes-1-i][1] = state_changed[msg_bytes-i].and(is_consecutive[msg_bytes-1-i][0]);
    }

    // revealed transitions: [[[0,1],[1,2],[2,3],[3,4]]]
    let reveal: Field[][] = [];

    // the 0-th substring transitions: [[0,1],[1,2],[2,3],[3,4]]
    const is_reveal0: Bool[] = [];
    let is_substr0: Bool[][] = Array.from({ length: msg_bytes }, () => []);
    const reveal0: Field[] = [];
    for (let i = 0; i < msg_bytes; i++) {
        is_substr0[i][0] = Bool(false);
        is_substr0[i][1] = is_substr0[i][0].or(states[i+1][0].and(states[i+2][1]));
        is_substr0[i][2] = is_substr0[i][1].or(states[i+1][1].and(states[i+2][2]));
        is_substr0[i][3] = is_substr0[i][2].or(states[i+1][2].and(states[i+2][3]));
        is_substr0[i][4] = is_substr0[i][3].or(states[i+1][3].and(states[i+2][4]));
        is_reveal0[i] = is_substr0[i][4].and(is_consecutive[i][1]);
        reveal0[i] = input[i+1].mul(is_reveal0[i].toField());
    }
    reveal0.unshift(input[0].mul(states[1][1].toField()));
    reveal.push(reveal0);

    return { out, reveal };
}