import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';

export const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

export class EmployeeSkillEntryDto {
  @IsUUID()
  skillId: string;

  @IsIn(PROFICIENCY_LEVELS)
  proficiency: string;

  @IsNumber()
  @Min(0)
  yearsExperience: number;
}

export class ReplaceSkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeSkillEntryDto)
  skills: EmployeeSkillEntryDto[];
}
