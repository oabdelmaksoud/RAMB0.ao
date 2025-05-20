import { Module } from '@nestjs/common';
import { McpServersService } from './mcp_servers.service';
// Import PrismaModule if your services typically access it via module imports,
// though often PrismaService is global or injected directly.
// For this task, assume PrismaService will be directly injected into McpServersService.
// It might be more common to import a global PrismaModule here if that's the project pattern.
// For now, sticking to the prompt's guidance of direct injection in service.

@Module({
  providers: [McpServersService],
  exports: [McpServersService], // Export if other modules will use this service directly
})
export class McpServersModule {}
