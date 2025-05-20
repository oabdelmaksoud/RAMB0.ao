import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentsWorker } from './agents.worker';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          ...(configService.get('REDIS_PASSWORD') ? {
            password: configService.get('REDIS_PASSWORD')
          } : {}),
          ...(configService.get('REDIS_TLS') === 'true' ? {
            tls: {}
          } : {}),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'agent-jobs',
    }),
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AgentsWorker],
  exports: [AgentsService],
})
export class AgentsModule {}
