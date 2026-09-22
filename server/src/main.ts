import { ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const server = app.getHttpServer() as {
    headersTimeout: number;
    keepAliveTimeout: number;
  };
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 5000;

  app.enableShutdownHooks();
  app.use(cookieParser());
  app.use(helmet());

  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
