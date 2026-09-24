import { Module } from '@nestjs/common';
import { AssetVendorsController } from './asset-vendors.controller';
import { AssetVendorsService } from './asset-vendors.service';

@Module({
  controllers: [AssetVendorsController],
  providers: [AssetVendorsService],
})
export class AssetVendorsModule {}
