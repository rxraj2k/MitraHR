import { Module } from '@nestjs/common';
import { RoleTracksController } from './role-tracks.controller';
import { RoleTracksService } from './role-tracks.service';

@Module({
  controllers: [RoleTracksController],
  providers: [RoleTracksService],
})
export class RoleTracksModule {}
