import { IsEmail, IsNotEmpty } from 'class-validator';

export class PositionQueryDto {
  @IsNotEmpty({ message: 'email query parameter is required.' })
  @IsEmail({}, { message: 'email must be a valid email address.' })
  email!: string;
}
