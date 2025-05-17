# RamBo Agent Backend

## Overview
Backend service for the RamBo Agent platform, built with NestJS, Prisma, and GraphQL.

## Prerequisites
- Node.js (v18+)
- Docker
- Docker Compose

## Technology Stack
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API**: GraphQL
- **Authentication**: Firebase, JWT
- **Caching**: Redis

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/rambo-agent-backend.git
cd rambo-agent-backend
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Edit `.env` with your specific configuration values.

### 3. Development with Docker
Start the development environment:
```bash
docker-compose up --build
```

Services:
- Backend API: `http://localhost:3000`
- Prisma Studio: `http://localhost:5555`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### 4. Manual Setup (without Docker)
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

## Database Operations
```bash
# Generate Prisma client
npm run prisma:generate

# Create a migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

## Testing
```bash
# Run unit tests
npm test

# Run test coverage
npm run test:cov
```

## Linting and Formatting
```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## Deployment
- Ensure all environment variables are set
- Build the project: `npm run build`
- Start the production server: `npm start`

## Security
- Use strong, unique passwords
- Never commit sensitive information
- Regularly update dependencies

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License
[Your License Here]

---

**Note**: This is a living document. Keep it updated with the latest project changes.
