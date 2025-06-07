import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  Optional,
} from '@nestjs/common';
import { McpServersService } from './mcp_servers.service';
import { CreateMcpServerDto, UpdateMcpServerDto } from './mcp_servers.service'; // Assuming DTOs are exported from service file
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard'; // Assuming path
import { McpServer } from '@prisma/client';

@Controller('mcp-servers')
@UseGuards(AdminAuthGuard)
export class McpServersController {
  constructor(private readonly mcpServersService: McpServersService) {}

  @Post()
  async create(@Body() createMcpServerDto: CreateMcpServerDto): Promise<McpServer> {
    return this.mcpServersService.create(createMcpServerDto);
  }

  @Get()
  async findAll(@Query('isSystemServer') isSystemServerQuery?: string): Promise<McpServer[]> {
    let isSystemServer: boolean | undefined = undefined;
    if (isSystemServerQuery?.toLowerCase() === 'true') {
      isSystemServer = true;
    } else if (isSystemServerQuery?.toLowerCase() === 'false') {
      isSystemServer = false;
    }
    return this.mcpServersService.findAll({ isSystemServer });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<McpServer> {
    const server = await this.mcpServersService.findOne(id);
    if (!server) {
      throw new NotFoundException(`McpServer with ID "${id}" not found`);
    }
    return server;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMcpServerDto: UpdateMcpServerDto,
  ): Promise<McpServer> {
    // The service method already handles NotFoundException and ForbiddenException for isSystemServer changes
    return this.mcpServersService.update(id, updateMcpServerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    // The service method handles NotFoundException and ForbiddenException
    await this.mcpServersService.remove(id);
  }
}
