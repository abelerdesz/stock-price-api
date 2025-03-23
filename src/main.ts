import { NestFactory } from '@nestjs/core';
import { StockModule } from './stock.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(StockModule);

  // Add validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Stock Price Tracker API')
    .setDescription('API for tracking stock prices and their moving averages')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
