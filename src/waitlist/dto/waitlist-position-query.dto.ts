import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class WaitlistPositionQueryDto {
  @IsNotEmpty({ message: 'email query parameter is required.' })
  @IsEmail({}, { message: 'email must be a valid email address.' })
  @MaxLength(320, { message: 'email must not exceed 320 characters.' })
  email!: string;
}
