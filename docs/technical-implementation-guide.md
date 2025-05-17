# RamBo Agent: Technical Implementation Guide

## Backend Development Workflow

### 1. Project Setup

#### Backend Technology Stack
- **Framework**: NestJS
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: Firebase Admin SDK
- **API**: GraphQL with Apollo Server
- **Job Queue**: Bull
- **Real-time**: Socket.IO

#### Initial Project Structure
```
rambo-backend/
│
├── prisma/
│   ├── schema.prisma      # Database schema definitions
│   └── migrations/        # Database migration history
│
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management
│   │   ├── projects/      # Project-related services
│   │   ├── agents/        # Agent management
│   │   ├── workflows/     # Workflow processing
│   │   └── files/         # File storage management
│   │
│   ├── common/
│   │   ├── guards/        # Authorization guards
│   │   ├── interceptors/  # Request/response interceptors
│   │   └── decorators/    # Custom decorators
│   │
│   ├── config/            # Environment configuration
│   ├── types/             # Shared TypeScript types
│   └── main.ts            # Application entry point
│
├── test/                  # Testing directory
├── .env                   # Environment variables
└── docker-compose.yml     # Local development setup
```

### 2. Database Schema (Prisma)

#### Comprehensive Schema Definition
```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  ADMIN
  MANAGER
  DEVELOPER
  VIEWER
}

enum ProjectStatus {
  PLANNING
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  ARCHIVED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
  BLOCKED
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  role          UserRole  @default(DEVELOPER)
  profile       Profile?
  projects      Project[]
  tasks         Task[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Profile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  displayName String
  avatarUrl   String?
  bio         String?
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(PLANNING)
  owner       User          @relation(fields: [ownerId], references: [id])
  ownerId     String
  tasks       Task[]
  workflows   Workflow[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Task {
  id          String      @id @default(cuid())
  title       String
  description String?
  status      TaskStatus  @default(TODO)
  project     Project     @relation(fields: [projectId], references: [id])
  projectId   String
  assignee    User?       @relation(fields: [assigneeId], references: [id])
  assigneeId  String?
  metadata    Json?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Workflow {
  id          String         @id @default(cuid())
  name        String
  description String?
  definition  Json
  project     Project        @relation(fields: [projectId], references: [id])
  projectId   String
  nodes       WorkflowNode[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model WorkflowNode {
  id          String    @id @default(cuid())
  workflow    Workflow  @relation(fields: [workflowId], references: [id])
  workflowId  String
  type        String
  configuration Json
}

model Agent {
  id            String   @id @default(cuid())
  name          String
  type          String
  capabilities  Json
  configuration Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 3. Authentication Strategy

#### Firebase Admin Integration
```typescript
// src/modules/auth/firebase-admin.service.ts
import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseAdminService {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }

  async verifyToken(token: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### 4. GraphQL API Design

#### Example User Resolver
```typescript
// src/modules/users/users.resolver.ts
@Resolver(() => User)
export class UsersResolver {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  async getCurrentUser(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Mutation(() => User)
  async createUser(@Args('input') input: CreateUserInput) {
    return this.authService.registerUser(input);
  }
}
```

### 5. Job Queue with Bull

#### Agent Task Processing
```typescript
// src/modules/agents/agent-task.processor.ts
@Processor('agent-tasks')
export class AgentTaskProcessor {
  @Process('execute')
  async processAgentTask(job: Job) {
    const { agentId, taskData } = job.data;
    
    try {
      // Execute agent-specific logic
      const result = await this.agentService.executeTask(agentId, taskData);
      
      return result;
    } catch (error) {
      // Handle and log errors
      this.logger.error(`Agent task failed: ${error.message}`);
      throw error;
    }
  }
}
```

### 6. Real-time Communication

#### WebSocket Gateway
```typescript
// src/modules/notifications/notifications.gateway.ts
@WebSocketGateway()
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Authenticate client
  }

  @SubscribeMessage('join-project')
  joinProject(client: Socket, projectId: string) {
    client.join(`project:${projectId}`);
  }

  broadcastProjectUpdate(projectId: string, update: any) {
    this.server.to(`project:${projectId}`).emit('project-update', update);
  }
}
```

### Development Workflow

#### Local Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize database
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Run development server
npm run start:dev
```

### Deployment Considerations

1. Use Docker for containerization
2. Implement CI/CD with GitHub Actions
3. Use environment-specific configurations
4. Implement comprehensive logging
5. Set up monitoring with Datadog/Sentry

### Security Best Practices

- Always use environment variables for sensitive data
- Implement rate limiting
- Use HTTPS everywhere
- Validate and sanitize all inputs
- Implement proper error handling without exposing sensitive information

---

**Note**: This is a living document. Adapt and evolve the implementation as project requirements change.
