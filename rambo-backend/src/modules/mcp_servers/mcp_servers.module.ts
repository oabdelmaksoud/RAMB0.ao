import { Module } from '@nestjs/common';
import { McpServersService } from './mcp_servers.service';
import { McpServersController } from './mcp_servers.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Corrected path based on ls output

@Module({
  imports: [PrismaModule], // Import PrismaModule to make PrismaService available for injection
  controllers: [McpServersController], // Add McpServersController
  providers: [McpServersService],
  exports: [McpServersService], 
})
export class McpServersModule {}
