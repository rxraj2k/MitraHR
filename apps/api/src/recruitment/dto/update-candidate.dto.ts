import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CANDIDATE_STAGES } from './recruitment.constants';

// One PATCH endpoint covers everything a recruiter does after a candidate
// is created: move them along the stage pipeline (including a Kanban-board
// drag-and-drop, which is just this same call), jot notes/ratings at
// whichever step they're at, schedule the next interview, or reject with a
// reason. hiredAt is set server-side (not client input) the moment stage
// flips to HIRED — see the service.
export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  roleTrack?: string;

  @IsOptional()
  @IsIn(CANDIDATE_STAGES)
  stage?: string;

  @IsOptional()
  @IsString()
  screeningNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  screeningRating?: number;

  @IsOptional()
  @IsString()
  technicalNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  technicalRating?: number;

  @IsOptional()
  @IsString()
  finalRoundNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  finalRoundRating?: number;

  @IsOptional()
  @IsString()
  hrRoundNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  hrRoundRating?: number;

  @IsOptional()
  @IsDateString()
  nextInterviewAt?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
