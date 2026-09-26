import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Loud, hard-to-miss sanity check for the exact mistake that shipped
  // localhost links in a real employee's appraisal email: on a real
  // deployment (NODE_ENV=production) CORS_ORIGIN/APP_URL must be the
  // app's actual public URL, not the local dev default. This can't fix
  // itself -- it just makes a leftover localhost value visible in the
  // server's own startup log instead of only surfacing later as a broken
  // link in someone's inbox.
  if (process.env.NODE_ENV === 'production') {
    const appUrl = process.env.APP_URL || corsOrigin;
    if (corsOrigin.includes('localhost') || appUrl.includes('localhost')) {
      console.warn('*** WARNING: CORS_ORIGIN/APP_URL is still set to a localhost address in a production environment. ***');
      console.warn('*** Emailed links (appraisals, invites) will be unreachable for employees until these are set to the real public URL. ***');
    }
  }
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`MitraHR API running on http://localhost:${port}`);
}
bootstrap();
