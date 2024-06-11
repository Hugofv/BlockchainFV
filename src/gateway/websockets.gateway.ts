import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import * as CryptoJS from 'crypto-js';
import { Socket, Server } from 'socket.io';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { MINT_PUBLIC_ADDRESS } from 'src/constants';
import { Block } from 'src/entities/Block.entity';

const MY_ADDRESS: string = 'ws://localhost:3000';

@WebSocketGateway()
export class WebsocketsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private opened: Socket[] = [];
  private connected: Socket[] = [];
  private check = [];
  private checked = [];
  private checking = false;
  private tempChain = new BlockchainService();

  constructor(private readonly blockchainService: BlockchainService) {}

  @WebSocketServer() server: Server;

  produceMessage(type, data) {
    return { type, data };
  }

  sendMessage(message) {
    this.opened.forEach((node) => {
      node.send(JSON.stringify(message));
    });
  }

  afterInit(server) {
    server.on('message', (message) => {
      const _message = JSON.parse(message);

      console.log(_message);

      switch (_message.type) {
        case 'TYPE_REPLACE_CHAIN':
          const [newBlock, newDiff] = _message.data;

          const ourTx = [
            ...this.blockchainService.transactions.map((tx) =>
              JSON.stringify(tx),
            ),
          ];
          const theirTx = [
            ...newBlock.data
              .filter((tx) => tx.from !== MINT_PUBLIC_ADDRESS)
              .map((tx) => JSON.stringify(tx)),
          ];
          const n = theirTx.length;

          if (
            newBlock.prevHash !==
            this.blockchainService.getLastBlock().previousHash
          ) {
            for (let i = 0; i < n; i++) {
              const index = ourTx.indexOf(theirTx[0]);

              if (index === -1) break;

              ourTx.splice(index, 1);
              theirTx.splice(0, 1);
            }

            if (
              theirTx.length === 0 &&
              CryptoJS.SHA256(
                this.blockchainService.getLastBlock().hash +
                  newBlock.timestamp +
                  JSON.stringify(newBlock.data) +
                  newBlock.nonce,
              ) === newBlock.hash &&
              newBlock.hash.startsWith(
                '000' +
                  Array(
                    Math.round(
                      Math.log(this.blockchainService.difficulty) /
                        Math.log(16) +
                        1,
                    ),
                  ).join('0'),
              ) &&
              Block.hasValidTransactions(newBlock, this.blockchainService) &&
              (parseInt(newBlock.timestamp) >
                parseInt(this.blockchainService.getLastBlock().timestamp) ||
                this.blockchainService.getLastBlock().timestamp === '') &&
              parseInt(newBlock.timestamp) < Date.now() &&
              this.blockchainService.getLastBlock().hash ===
                newBlock.prevHash &&
              (newDiff + 1 === this.blockchainService.difficulty ||
                newDiff - 1 === this.blockchainService.difficulty)
            ) {
              this.blockchainService.chain.push(newBlock);
              this.blockchainService.difficulty = newDiff;
              this.blockchainService.transactions = [
                ...ourTx.map((tx) => JSON.parse(tx)),
              ];
            }
          } else if (
            !this.checked.includes(
              JSON.stringify([
                newBlock.prevHash,
                this.blockchainService.chain[
                  this.blockchainService.chain.length - 2
                ].timestamp || '',
              ]),
            )
          ) {
            this.checked.push(
              JSON.stringify([
                this.blockchainService.getLastBlock().previousHash,
                this.blockchainService.chain[
                  this.blockchainService.chain.length - 2
                ].timestamp || '',
              ]),
            );

            const position = this.blockchainService.chain.length - 1;

            this.checking = true;

            this.sendMessage(
              this.produceMessage('TYPE_REQUEST_CHECK', MY_ADDRESS),
            );

            setTimeout(() => {
              this.checking = false;

              let mostAppeared = this.check[0];

              this.check.forEach((group) => {
                if (
                  this.check.filter((_group) => _group === group).length >
                  this.check.filter((_group) => _group === mostAppeared).length
                ) {
                  mostAppeared = group;
                }
              });

              const group = JSON.parse(mostAppeared);

              this.blockchainService.chain[position] = group[0];
              this.blockchainService.transactions = [...group[1]];
              this.blockchainService.difficulty = group[2];

              this.check.splice(0, this.check.length);
            }, 5000);
          }

          break;

        case 'TYPE_REQUEST_CHECK':
          this.opened
            .filter((node) => node.handshake.address === _message.data)[0]
            .send(
              JSON.stringify(
                this.produceMessage(
                  'TYPE_SEND_CHECK',
                  JSON.stringify([
                    this.blockchainService.getLastBlock(),
                    this.blockchainService.transactions,
                    this.blockchainService.difficulty,
                  ]),
                ),
              ),
            );

          break;

        case 'TYPE_SEND_CHECK':
          if (this.checking) this.check.push(_message.data);

          break;

        case 'TYPE_CREATE_TRANSACTION':
          const transaction = _message.data;

          this.blockchainService.addTransaction(transaction);

          break;

        case 'TYPE_SEND_CHAIN':
          const { block, finished } = _message.data;

          if (!finished) {
            this.tempChain.chain.push(block);
          } else {
            this.tempChain.chain.push(block);
            if (BlockchainService.isValid(this.tempChain)) {
              this.blockchainService.chain = this.tempChain.chain;
            }
            this.tempChain = new BlockchainService();
          }

          break;

        case 'TYPE_REQUEST_CHAIN':
          const socket = this.opened.filter(
            (node) => node.handshake.address === _message.data,
          )[0];

          for (let i = 1; i < this.blockchainService.chain.length; i++) {
            socket.send(
              JSON.stringify(
                this.produceMessage('TYPE_SEND_CHAIN', {
                  block: this.blockchainService.chain[i],
                  finished: i === this.blockchainService.chain.length - 1,
                }),
              ),
            );
          }

          break;

        case 'TYPE_REQUEST_INFO':
          this.opened
            .filter((node) => node.handshake.address === _message.data)[0]
            .send(
              JSON.stringify(
                this.produceMessage('TYPE_SEND_INFO', [
                  this.blockchainService.difficulty,
                  this.blockchainService.transactions,
                ]),
              ),
            );

          break;

        case 'TYPE_SEND_INFO':
          [
            this.blockchainService.difficulty,
            this.blockchainService.transactions,
          ] = _message.data;

          break;

        //   case 'TYPE_HANDSHAKE':
        //  const nodes = _message.data;

        //  nodes.forEach((node) => connect(node));
      }
    });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const address = client.handshake.address;

    if (
      !this.connected.find(
        (peerAddress) => peerAddress.handshake.address === address,
      ) &&
      address !== MY_ADDRESS
    ) {
      this.server.on('open', () => {
        this.server.send(
          JSON.stringify(
            this.produceMessage('TYPE_HANDSHAKE', [
              MY_ADDRESS,
              ...this.connected,
            ]),
          ),
        );

        this.opened.forEach((node) =>
          node.send(
            JSON.stringify(this.produceMessage('TYPE_HANDSHAKE', [address])),
          ),
        );

        if (
          !this.opened.find((peer) => peer.handshake.address === address) &&
          address !== MY_ADDRESS
        ) {
          this.opened.push(client);
        }

        if (
          !this.connected.find((skt) => skt.handshake.address === address) &&
          address !== MY_ADDRESS
        ) {
          this.connected.push(client);
        }
      });
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.opened = this.opened.filter((cli) => cli.id !== client.id);
    this.connected = this.connected.filter((cli) => cli.id !== client.id);
  }

  @SubscribeMessage('messageToServer')
  handleMessage(client: Socket, payload: any): void {
    console.log(`Message from client ${client.id}: ${payload}`);
    this.server.emit('messageToClient', payload);
  }
}
