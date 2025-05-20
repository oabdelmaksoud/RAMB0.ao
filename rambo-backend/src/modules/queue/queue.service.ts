import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

@Injectable()
export class QueueService {
  private queues: Record<string, Queue> = {};

  constructor(private configService: ConfigService) {}

  async createQueue(name: string) {
    if (!this.queues[name]) {
      this.queues[name] = new Queue(name, {
        connection: {
          host: this.configService.get('REDIS_HOST'),
          port: this.configService.get('REDIS_PORT'),
          password: this.configService.get('REDIS_PASSWORD'),
          db: this.configService.get('REDIS_DB'),
        },
        prefix: this.configService.get('QUEUE_PREFIX'),
      });
    }
    return this.queues[name];
  }

  async addJob(queueName: string, jobName: string, data: any) {
    const queue = await this.createQueue(queueName);
    return queue.add(jobName, data);
  }

  createWorker(queueName: string, processor: (job: Job) => Promise<any>) {
    return new Worker(queueName, processor, {
      connection: {
        host: this.configService.get('REDIS_HOST'),
        port: this.configService.get('REDIS_PORT'),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB'),
      },
      prefix: this.configService.get('QUEUE_PREFIX'),
    });
  }
}
