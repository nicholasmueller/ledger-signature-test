require('dotenv').config();
const Transport = require('@ledgerhq/hw-transport-node-hid').default;
const Eth = require('ledger-eip-support-poc/packages/hw-app-eth').default;

const { bufferToHex, ecsign, keccak256 } = require('ethereumjs-util');
const { concatSig } = require('eth-sig-util');
const { Buffer } = require('buffer');

const { ChildChain, RootChain, OmgUtil } = require('@omisego/omg-js');
const { hashTypedDataMessage, getDomainSeperatorHash } = require('./omgService');

async function signatureTest () {
  // setup transporter
  const transport = await Transport.create();
  const eth = new Eth(transport);

  // fake payment data
  const payments = [ {
    owner: process.env.ACCOUNT_ADDRESS,
    currency: OmgUtil.transaction.ETH_CURRENCY,
    amount: 1
  } ];
  const fee = {
    currency: OmgUtil.transaction.ETH_CURRENCY,
    amount: 1
  };
  const txBody = OmgUtil.transaction.createTransactionBody({
    fromAddress: process.env.ACCOUNT_ADDRESS,
    fromUtxos: [
      {
        amount: 100,
        blknum: 1000,
        currency: OmgUtil.transaction.ETH_CURRENCY,
        oindex: 1,
        owner: process.env.ACCOUNT_ADDRESS,
        txindex: 0,
        utxo_pos: 1000000000001
      }
    ],
    payments,
    fee,
    metadata: OmgUtil.transaction.NULL_METADATA
  });

  const OMG_CONTRACT_ADDRESS = '0x96d5d8bc539694e5fa1ec0dab0e6327ca9e680f9';
  const typedData = OmgUtil.transaction.getTypedData(txBody, OMG_CONTRACT_ADDRESS);

  console.log('typedData to sign: ', typedData);

  console.log('\n');
  const messageHash = hashTypedDataMessage(typedData);
  const domainSeperatorHash = getDomainSeperatorHash(typedData);
  console.log('messageHash: ', bufferToHex(messageHash));
  console.log('domainSeperatorHash: ', bufferToHex(domainSeperatorHash));

  // full hash we want to ecsign in the device
  const signHashResult = OmgUtil.transaction.getToSignHash(typedData);
  console.log('expected hash to ecsign (omg-js): ', bufferToHex(signHashResult));

  const expectedHash = keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      domainSeperatorHash,
      messageHash
    ])
  );
  console.log('expected hash to ecsign (local): ', bufferToHex(expectedHash));

  console.log('\n');
  console.log('please check the ledger now to sign the typed data...');
  console.log('\n');

  // do ledger sign
  // https://github.com/btchip/ledgerjs/tree/eip712_v0/packages/hw-app-eth#signeip712hashedmessage
  const { v: _v, r, s } = await eth.signEIP712HashedMessage(
    "44'/60'/0'/0/0",
    bufferToHex(domainSeperatorHash),
    bufferToHex(messageHash)
  );

  let v = _v.toString(16);
  if (v.length < 2) {
    v = "0" + v;
  }

  console.log('\n');
  console.log('v: ', v);
  console.log('r: ', r);
  console.log('s: ', s);
  console.log('\n');

  const ledgerSignature = `0x${r}${s}${v}`;
  console.log('ledger signature: ', ledgerSignature);

  const expectedSignature = OmgUtil.sign(signHashResult, [ process.env.ACCOUNT_PK ]);
  console.log('expected signature (omg-js): ', expectedSignature[0]);

  const nodeEcSign = ecsign(
    signHashResult,
    Buffer.from(process.env.ACCOUNT_PK.replace('0x', ''), 'hex')
  )
  const nodeSignature = concatSig(nodeEcSign.v, nodeEcSign.r, nodeEcSign.s);
  console.log('expected signature (node): ', nodeSignature);

  console.log('\n');
}

signatureTest();