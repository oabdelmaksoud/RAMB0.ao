import { Module } from '@nestjs/common';
import { MockDatabaseService } from '../database/mock-database.service';

@Module({
  providers: [
    {
      provide: 'DatabaseService',
      useClass: MockDatabaseService
    }
  ],
  exports: ['DatabaseService'],
})
export class PrismaModule {}
