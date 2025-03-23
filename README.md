# Assignment - Advanced Stock Price Checker

## Hi!

The application was bootstrapped and built upon NestJS with TypeScript, storing data with Prisma/PostgreSQL. It uses Swagger for docs, and Docker for containerization.

Other libraries used:

- axios
- node-cron
- date-fns

## Usage

### Running in Docker

1. Rename `.env.example` to `.env` and replace `YOUR_FINNHUB_API_TOKEN` with a working Finnhub API key.

2. Run

```bash
$ docker compose up -d
```

### Running in local Node.js

#### Prerequisites

- Node 20
- PostgreSQL 16

#### Steps

1. Rename `.env.example` to `.env` and replace `USER`, `PASS`, and `DBNAME` with your local PostgreSQL database's, then replace`YOUR_FINNHUB_API_TOKEN` with a working Finnhub API key.

2. Run

```bash
$ npm install
$ npm run start:dev
```

## Routes

The Swagger API documentation is available at [http://localhost:3000/api]().

There's also a public [Postman collection](https://red-crater-211645.postman.co/workspace/My-Workspace~c7840140-9a5b-4a0a-8918-e0805e3c2bb9/collection/16364487-dfeb6d7d-bc0c-490e-a714-bf41b3dd9653) for testing the various return conditions.

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
