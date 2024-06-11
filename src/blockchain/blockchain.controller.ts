import { Controller, Body, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';

@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post()
  @ApiOperation({ summary: 'Add block in blockchain' })
  create(@Body() body: Map<string, any>) {
    console.log(body);
    this.blockchainService.addBlock(body);
  }
}
