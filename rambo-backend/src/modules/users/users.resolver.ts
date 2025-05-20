import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User as PrismaUser, UserRole } from '@prisma/client';
import { User as GqlUser } from '../../types/user.type';
import { UsersService } from './users.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [GqlUser])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<PrismaUser[]> {
    return this.usersService.findAll();
  }

  @Query(() => GqlUser)
  @UseGuards(GqlAuthGuard)
  async findOne(@Args('id') id: string): Promise<PrismaUser> {
    return this.usersService.findOne(id);
  }

  @Mutation(() => GqlUser)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Args('createUserInput') createUserInput: CreateUserInput): Promise<PrismaUser> {
    return this.usersService.create(createUserInput);
  }

  @Mutation(() => GqlUser)
  @UseGuards(GqlAuthGuard)
  async update(
    @Args('id') id: string,
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser() user: PrismaUser
  ): Promise<PrismaUser> {
    // Only allow admins or the user themselves to update
    if (user.role !== UserRole.ADMIN && user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.update(id, updateUserInput);
  }

  @Mutation(() => GqlUser)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Args('id') id: string): Promise<PrismaUser> {
    return this.usersService.remove(id);
  }

  @Mutation(() => GqlUser)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async setRole(
    @Args('id') id: string, 
    @Args('role', { type: () => UserRole }) role: UserRole
  ): Promise<PrismaUser> {
    return this.usersService.setRole(id, role);
  }
}
