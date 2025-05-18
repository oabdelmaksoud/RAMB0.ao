import { Field, InputType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  password: string;

  @Field(() => UserRole, { defaultValue: 'VIEWER' })
  role: UserRole;
}
