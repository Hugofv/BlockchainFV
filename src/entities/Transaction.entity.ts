import * as CryptoJS from 'crypto-js';
import * as EC from 'elliptic';

const ec = new EC.ec('secp256k1');
import { MINT_PUBLIC_ADDRESS } from 'src/constants';

export class Transaction {
  public from: string;
  public to: string;
  public signature: string;
  public amount: number;
  public gas: number;

  constructor(from, to, amount, gas = 0) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.gas = gas;
  }

  sign(keyPair) {
    if (keyPair.getPublic('hex') === this.from) {
      this.signature = keyPair
        .sign(
          CryptoJS.SHA256(this.from + this.to + this.amount + this.gas),
          'base64',
        )
        .toDER('hex');
    }
  }

  static isValid(tx, chain) {
    return (
      tx.from &&
      tx.to &&
      tx.amount &&
      (chain.getBalance(tx.from) >= tx.amount + tx.gas ||
        tx.from === MINT_PUBLIC_ADDRESS) &&
      ec
        .keyFromPublic(tx.from, 'hex')
        .verify(
          CryptoJS.SHA256(tx.from + tx.to + tx.amount + tx.gas),
          tx.signature,
        )
    );
  }
}
