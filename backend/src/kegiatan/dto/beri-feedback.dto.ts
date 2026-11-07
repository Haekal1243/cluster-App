import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class BeriFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  komentar?: string;

  @IsOptional()
  @IsBoolean()
  anonim?: boolean;
}

export class SembunyikanFeedbackDto {
  @IsBoolean()
  disembunyikan!: boolean;
}
