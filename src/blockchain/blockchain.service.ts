import { Injectable } from '@nestjs/common';
import { MINT_KEY_PAIR, MINT_PUBLIC_ADDRESS } from 'src/constants';
import { Block } from 'src/entities/Block.entity';
import { Transaction } from 'src/entities/Transaction.entity';

@Injectable()
export class BlockchainService {
  public transactions: Transaction[];
  public chain: Block[];
  public difficulty: number;
  public blockTime: number;
  public reward: number;

  constructor() {
    const initalCoinRelease = new Transaction(
      MINT_PUBLIC_ADDRESS,
      '04719af634ece3e9bf00bfd7c58163b2caf2b8acd1a437a3e99a093c8dd7b1485c20d8a4c9f6621557f1d583e0fcff99f3234dd1bb365596d1d67909c270c16d64',
      100000000,
    );
    this.transactions = [];
    this.chain = [new Block('', [initalCoinRelease])];
    this.difficulty = 1;
    this.blockTime = 30000;
    this.reward = 297;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(block) {
    block.prevHash = this.getLastBlock().hash;
    block.hash = Block.getHash(block);
    block.mine(this.difficulty);
    this.chain.push(Object.freeze(block));

    this.difficulty +=
      Date.now() - parseInt(this.getLastBlock().timestamp) < this.blockTime
        ? 1
        : -1;
  }

  addTransaction(transaction) {
    if (Transaction.isValid(transaction, this)) {
      this.transactions.push(transaction);
    }
  }

  mineTransactions(rewardAddress) {
    let gas = 0;

    this.transactions.forEach((transaction) => {
      gas += transaction.gas;
    });

    const rewardTransaction = new Transaction(
      MINT_PUBLIC_ADDRESS,
      rewardAddress,
      this.reward + gas,
    );
    rewardTransaction.sign(MINT_KEY_PAIR);

    const blockTransactions = [rewardTransaction, ...this.transactions];

    if (this.transactions.length !== 0)
      this.addBlock(new Block(Date.now().toString(), blockTransactions));

    this.transactions.splice(0, blockTransactions.length - 1);
  }

  getBalance(address) {
    let balance = 0;

    this.chain.forEach((block) => {
      block.data.forEach((transaction) => {
        if (transaction.from === address) {
          balance -= transaction.amount;
          balance -= transaction.gas;
        }

        if (transaction.to === address) {
          balance += transaction.amount;
        }
      });
    });

    return balance;
  }

  static isValid(blockchain) {
    for (let i = 1; i < blockchain.chain.length; i++) {
      const currentBlock = blockchain.chain[i];
      const prevBlock = blockchain.chain[i - 1];

      if (
        currentBlock.hash !== Block.getHash(currentBlock) ||
        prevBlock.hash !== currentBlock.prevHash ||
        !Block.hasValidTransactions(currentBlock, blockchain)
      ) {
        return false;
      }
    }

    return true;
  }
}
