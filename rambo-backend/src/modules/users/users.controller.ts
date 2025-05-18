import { Controller, Get, Post, Body } from '@nestjs/common';
import { DatabaseService } from '../../prisma/prisma.module';

@Controller('users')
export class UsersController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async getUsers() {
    return this.db.getUsers();
  }

  @Post()
  async createUser(@Body() userData: any) {
    return this.db.createUser(userData);
  }
}
