# NHTSA Vehicle Assignment

NestJS backend that fetches vehicle makes and vehicle types from the NHTSA vPIC XML API, stores the data in PostgreSQL, and exposes it through GraphQL.

## Tech Stack

NestJS, TypeScript, PostgreSQL, TypeORM, GraphQL, Apollo, fast-xml-parser, Pino, Jest, Docker, GitHub Actions.

## Setup

Requirements: Node.js 20+, Docker, Docker Compose.

```bash
cp .env.example .env
npm ci
docker compose up -d
npm run build
npm run start:dev

Application: http://localhost:3000
GraphQL: http://localhost:3000/graphql

Data Ingestion

Fetch and persist NHTSA data:

npm run ingest
GraphQL Example
query {
  makes {
    makeId
    makeName
    vehicleTypes {
      typeId
      typeName
    }
  }
}
Testing
npm run lint
npm test
npm run test:cov
npm run build
Docker
docker build -t nhtsa-vehicle-assignment .
CI

GitHub Actions runs linting, tests, coverage, application build, Docker image build, and uploads build/coverage artifacts.

Configuration

Configuration is provided through environment variables. See .env.example for database, NHTSA API, logging, caching, and application settings.

Project Structure
src/
├── cache/
├── config/
├── makes/
│   ├── dto/
│   ├── make.entity.ts
│   ├── vehicle-type.entity.ts
│   ├── makes.module.ts
│   ├── makes.resolver.ts
│   ├── makes.service.ts
│   ├── nhtsa.client.ts
│   └── nhtsa.types.ts
├── app.module.ts
└── main.ts

test/
├── makes.service.spec.ts
└── nhtsa.client.spec.ts
```
