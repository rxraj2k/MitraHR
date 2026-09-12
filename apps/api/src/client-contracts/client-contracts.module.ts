import { Module } from '@nestjs/common';
import { ClientContractsController } from './client-contracts.controller';
import { ClientContractsService } from './client-contracts.service';

@Module({
  controllers: [ClientContractsController],
  providers: [ClientContractsService],
})
export class ClientContractsModule {}
