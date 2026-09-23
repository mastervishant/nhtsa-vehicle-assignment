# NHTSA Vehicle Assignment

A NestJS backend that retrieves vehicle makes and vehicle types from the NHTSA vPIC API, transforms the XML responses into application objects, stores the data in PostgreSQL, and exposes the persisted data through a GraphQL API.

The project also includes:

- XML parsing
- PostgreSQL persistence
- TypeORM
- GraphQL
- Retry and timeout handling
- Bounded concurrent ingestion
- Unit tests
- Docker
- Docker Compose
- GitHub Actions CI
- Automated Docker image build validation

---

## 1. Overview

The application integrates with the NHTSA vPIC API.

The ingestion process first retrieves all vehicle makes and then retrieves the vehicle types associated with each make.

The data is transformed into the following structure:

```json
{
  "makeId": 440,
  "makeName": "Example Make",
  "vehicleTypes": [
    {
      "typeId": 2,
      "typeName": "Passenger Car"
    },
    {
      "typeId": 7,
      "typeName": "Multipurpose Passenger Vehicle (MPV)"
    }
  ]
}
The transformed data is stored in PostgreSQL.

The GraphQL API reads the data from PostgreSQL rather than calling NHTSA directly for every GraphQL request.

The overall flow is:
NHTSA vPIC XML API
        |
        v
    NhtsaClient
        |
        | XML parsing
        v
    MakesService
        |
        | TypeORM
        v
    PostgreSQL
        |
        | Repository queries
        v
    GraphQL Resolver
        |
        v
    GraphQL Client

2. Architecture

The application follows a simple layered architecture.
+---------------------------------------------------+
|                    GraphQL API                    |
|                                                   |
|  Query: makes                                     |
|  Query: make(makeId: Int!)                       |
+-------------------------+-------------------------+
                          |
                          v
+---------------------------------------------------+
|                  MakesResolver                   |
|                                                   |
|  Handles GraphQL requests                         |
|  Delegates business logic to MakesService        |
+-------------------------+-------------------------+
                          |
                          v
+---------------------------------------------------+
|                  MakesService                    |
|                                                   |
|  Read data                                        |
|  Ingest data                                      |
|  Control concurrency                              |
|  Persist data                                     |
+-------------------------+-------------------------+
                          |
             +------------+------------+
             |                         |
             v                         v
+-------------------------+   +--------------------+
|      NhtsaClient        |   |    PostgreSQL      |
|                         |   |                    |
| Axios                   |   | makes              |
| XML Parser              |   | vehicle_types      |
| Timeout                 |   |                    |
| Retry                   |   | TypeORM            |
+------------+------------+   +--------------------+
             |
             v
+---------------------------------------------------+
|                  NHTSA vPIC API                  |
|                                                   |
| GetAllMakes                                       |
| GetVehicleTypesForMakeId                         |
+---------------------------------------------------+

NhtsaClient

NhtsaClient is responsible only for communication with the external NHTSA API.

It handles:

HTTP requests using Axios
XML responses
XML parsing
Request timeout
Retries
Exponential backoff
Conversion of NHTSA response objects into application types
MakesService

MakesService contains the main application logic.

It handles:

Reading makes from PostgreSQL
Reading a single make
NHTSA ingestion
Bounded concurrency
Upserting makes
Replacing vehicle types
Converting database entities into GraphQL DTOs
MakesResolver

MakesResolver exposes the service through GraphQL.

It provides:
makes
make(makeId: Int!)

PostgreSQL

PostgreSQL provides persistent storage.
The database contains:
makes
vehicle_types
GraphQL

GraphQL provides a typed API over the persisted data.
3. Project Structure

The GitHub repository has the following structure:
repository-root/
│
├── .github/
│   └── workflows/
│       └── main.yml
│
└── nhtsa-vehicle-assignment/
    │
    ├── src/
    │   ├── makes/
    │   │   ├── dto/
    │   │   ├── entities/
    │   │   ├── makes.module.ts
    │   │   ├── makes.resolver.ts
    │   │   └── makes.service.ts
    │   │
    │   ├── nhtsa/
    │   │   ├── nhtsa.client.ts
    │   │   └── nhtsa.types.ts
    │   │
    │   ├── scripts/
    │   │   └── ingest.ts
    │   │
    │   ├── app.module.ts
    │   └── main.ts
    │
    ├── test/
    │   ├── makes.service.spec.ts
    │   └── nhtsa.client.spec.ts
    │
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    ├── package-lock.json
    ├── nest-cli.json
    └── tsconfig.json

4. Running the Application Locally
Prerequisites

Install:

Node.js 20+
npm
Docker
Docker Compose
Git

Check Node:
node --version
Check npm:

npm --version

Check Docker:

docker --version

Clone the Repository
git clone https://github.com/mastervishant/nhtsa-vehicle-assignment.git

Move into the application:

cd nhtsa-vehicle-assignment/nhtsa-vehicle-assignment

Install Dependencies
npm install

If npm encounters peer dependency resolution issues:

npm install --legacy-peer-deps

The CI pipeline also uses:

npm ci --legacy-peer-deps

Environment Variables

Create:

.env

inside:

nhtsa-vehicle-assignment/
Start PostgreSQL

Start PostgreSQL using Docker Compose:

docker compose up -d postgres
The default database configuration is:

Host: localhost
Port: 5432
Database: nhtsa
User: postgres
Password: postgres
Start NestJS

Start the application:

npm run start:dev

The application runs on:

http://localhost:3000

GraphQL is available at:

http://localhost:3000/graphql

Run Ingestion

With PostgreSQL running:

npm run ingest

This retrieves the NHTSA data and stores it in PostgreSQL.

After successful ingestion, the GraphQL API can be used to retrieve the stored data.

5.Testing

The project uses Jest and ts-jest.

Run all tests:

npm test

Run tests sequentially:

npm test -- --runInBand
Run coverage:

npm run test:cov

The tests cover the important application components including:

NHTSA client
XML parsing
Make retrieval
Vehicle type retrieval
Makes service
Data transformation
Error handling
Database-related service behavior

External NHTSA requests are mocked during unit testing.

This keeps the tests:

Fast
Deterministic
Independent of NHTSA availability
Suitable for CI

6.Build

Build the application:

npm run build

The compiled application is generated under:

dist/

7.GitHub Actions

The project contains the GitHub Actions workflow:

.github/workflows/main.yml

The workflow runs on:

push:
  main
  develop

pull_request:
  main
  develop

The CI pipeline performs:

Checkout repository
        |
        v
Setup Node.js 20
        |
        v
Install dependencies
        |
        v
Start PostgreSQL service
        |
        v
Build application
        |
        v
Run Jest tests
        |
        v
Build Docker image
