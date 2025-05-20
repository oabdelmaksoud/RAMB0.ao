import { Module } from '@nestjs/common';
import { MockDatabaseService } from '../database/mock-database.service';
import { PrismaService } from './prisma.service';

@Module({
  providers: [
    PrismaService,
    {
      provide: 'DatabaseService',
      useClass: MockDatabaseService
    }
  ],
  exports: ['DatabaseService', PrismaService],
})
export class PrismaModule {}
