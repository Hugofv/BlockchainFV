import * as CryptoJS from 'crypto-js';
import { MINT_PUBLIC_ADDRESS } from 'src/constants';
import { Transaction } from './Transaction.entity';

export class Block {
  public timestamp: string;
  public data: any;
  public previousHash: string;
  public hash: string;
  public nonce: number;

  constructor(timestamp = Date.now().toString(), data = []) {
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = '';
    this.hash = Block.getHash(this);
    this.nonce = 0;
  }

  static getHash(block) {
    return CryptoJS.SHA256(
      block.prevHash +
        block.timestamp +
        JSON.stringify(block.data) +
        block.nonce,
    );
  }

  mine(difficulty) {
    while (!this.hash.startsWith(Array(difficulty + 1).join('0'))) {
      this.nonce++;
      this.hash = Block.getHash(this);
    }
  }

  static hasValidTransactions(block, chain) {
    let gas = 0,
      reward = 0;

    block.data.forEach((transaction) => {
      if (transaction.from !== MINT_PUBLIC_ADDRESS) {
        gas += transaction.gas;
      } else {
        reward = transaction.amount;
      }
    });

    return (
      reward - gas === chain.reward &&
      block.data.every((transaction) =>
        Transaction.isValid(transaction, chain),
      ) &&
      block.data.filter(
        (transaction) => transaction.from === MINT_PUBLIC_ADDRESS,
      ).length === 1
    );
  }
}
