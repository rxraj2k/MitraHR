import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FinalizeReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating!: number;

  // Growth-potential rating (1-5), separate from performance — together
  // they place the employee on the 9-box performance-vs-potential grid.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  potentialRating?: number;

  @IsOptional()
  @IsString()
  managerSummary?: string;
}
