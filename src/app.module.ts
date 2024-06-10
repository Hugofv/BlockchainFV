import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain/blockchain.controller';
import { BlockchainModule } from './blockchain/blockchain.module';
import { Web3jsModule } from 'nestjs-web3js';
import { CreateWeb3jsServiceDto } from './web3js/dto/create-web3js-service.dto';
import { BlockchainService } from './blockchain/blockchain.service';

@Module({
  imports: [
    BlockchainModule,
    Web3jsModule.forRoot({
      infuraUrl: 'http://localhost:8545',
    } as CreateWeb3jsServiceDto),
  ],
  controllers: [BlockchainController],
  providers: [BlockchainService],
})
export class AppModule {}
