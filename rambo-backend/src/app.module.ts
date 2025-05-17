import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AgentsModule } from './modules/agents/agents.module';

@Module({
  imports: [
    // Configuration module with environment variable support
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // GraphQL module configuration
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
      context: ({ req }) => ({ req }),
    }),

    // Database and core modules
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    WorkflowsModule,
    AgentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
