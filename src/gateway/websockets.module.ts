import { Module } from '@nestjs/common';
import { WebsocketsGateway } from './websockets.gateway';
import { BlockchainService } from 'src/blockchain/blockchain.service';

@Module({
  providers: [WebsocketsGateway, BlockchainService],
})
export class WebsocketsGatewayModule {}
