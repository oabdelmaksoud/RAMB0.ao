import { Field, InputType, PartialType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserInput } from './create-user.input';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  role?: UserRole;
}
