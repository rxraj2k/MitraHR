import { ArrayMinSize, IsArray, IsString } from 'class-validator';

// Bulk-assign one or more courses to one or more employees in one call —
// used both for "assign the whole standard curriculum to this new hire"
// and for picking a handful of role-specific courses (e.g. Git Branching
// for a DevOps engineer).
export class AssignTrainingDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  employeeIds: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  courseIds: string[];
}
