import { Module } from '@nestjs/common';
import { ContractTypesController } from './contract-types.controller';
import { ContractTypesService } from './contract-types.service';

@Module({
  controllers: [ContractTypesController],
  providers: [ContractTypesService],
})
export class ContractTypesModule {}
