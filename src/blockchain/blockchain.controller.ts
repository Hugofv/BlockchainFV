import { Controller, Body, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';
import { Block } from 'src/entities/Block.entity';

@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post()
  @ApiOperation({ summary: 'Add block in blockchain' })
  create(@Body() body: Map<string, any>): Block {
    console.log(body);
    return this.blockchainService.addBlock(body);
  }
}
