# Assignment - Advanced Stock Price Checker

## Hi!

The application was bootstrapped and built upon NestJS with TypeScript, storing data with Prisma/PostgreSQL. It uses Swagger for docs, and Docker for containerization.

Other libraries used:

- axios
- node-cron
- date-fns

## Usage

### Running in Docker

```bash
$ cd stock-price-api
$ docker compose up -d
```

### Running in local Node.js

#### Prerequisites

- Node 20
- PostgreSQL 16

#### Steps

```bash
  $ cd stock-price-api
```

2. Rename `.env.example` to `.env` and replace `USER`, `PASS`, and `DBNAME` with your local PostgreSQL database's. (Optionally, replace the `FINNHUB_API_TOKEN` provided by Peak to a custom one.)

```bash
$ npm install
$ npm run start:dev
```

## Routes

The Swagger API documentation is available at [http://localhost:3000/api]().

I decided to not store/return any stock information until the user explicitly starts tracking a stock:

```bash
$ curl -X PUT "http://localhost:3000/stock/NFLX" -H "Content-Type: application/json"
```

After PUT, the first data point is available immediately (but won't accumulate outside of trading hours):

```bash
$ curl -X GET "http://localhost:3000/stock/NFLX" -H "Content-Type: application/json"
```

## Running tests

```bash
$ cd stock-price-api
$ npm install
$ npm run test
```

Thank you for visiting 🦒
