import { IsEmail, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class JoinDto {
  @IsNotEmpty({ message: 'email is required.' })
  @IsEmail({}, { message: 'email must be a valid email address.' })
  email!: string;

  @IsOptional()
  @IsObject({ message: 'fields must be an object.' })
  fields?: Record<string, unknown>;
}
