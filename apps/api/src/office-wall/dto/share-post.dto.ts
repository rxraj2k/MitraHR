import { IsUUID } from 'class-validator';

export class SharePostDto {
  @IsUUID()
  toEmployeeId!: string;
}
