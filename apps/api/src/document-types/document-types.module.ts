import { Module } from '@nestjs/common';
import { DocumentTypesController } from './document-types.controller';
import { DocumentTypesService } from './document-types.service';

@Module({
  controllers: [DocumentTypesController],
  providers: [DocumentTypesService],
})
export class DocumentTypesModule {}
