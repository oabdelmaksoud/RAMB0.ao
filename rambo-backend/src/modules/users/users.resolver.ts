import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
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

  @Query('users')
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Query('user')
  @UseGuards(GqlAuthGuard)
  async findOne(@Args('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Mutation('createUser')
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.usersService.create(createUserInput);
  }

  @Mutation('updateUser')
  @UseGuards(GqlAuthGuard)
  async update(
    @Args('id') id: string,
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser() user: User
  ) {
    // Only allow admins or the user themselves to update
    if (user.role !== UserRole.ADMIN && user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.update(id, updateUserInput);
  }

  @Mutation('removeUser')
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Args('id') id: string) {
    return this.usersService.remove(id);
  }

  @Mutation('setUserRole')
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async setRole(@Args('id') id: string, @Args('role') role: UserRole) {
    return this.usersService.setRole(id, role);
  }
}
