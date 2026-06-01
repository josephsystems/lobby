import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class WaitlistJoinDto {
  @IsNotEmpty({ message: 'email is required.' })
  @IsEmail({}, { message: 'email must be a valid email address.' })
  @MaxLength(320, { message: 'email must not exceed 320 characters.' })
  email!: string;

  @IsOptional()
  @IsObject({ message: 'fields must be an object.' })
  fields?: Record<string, unknown>;
}
