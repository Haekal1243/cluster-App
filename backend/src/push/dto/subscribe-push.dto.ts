import { IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  auth!: string;
}

export class SubscribePushDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @IsOptional()
  expirationTime?: number | string | null;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class UnsubscribePushDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}
