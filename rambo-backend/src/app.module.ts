import { Module } from '@nestjs/common';
import { Request } from 'express';
import { GraphQLModule } from '@nestjs/graphql';
import { WorkflowExecutionModule } from '@modules/workflows/workflow-execution.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UsersModule } from '@modules/users/users.module';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    WorkflowExecutionModule,
  ],
})
export class AppModule {}
