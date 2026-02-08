import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuditService } from './audit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Reduce default NestJS logging (audit module handles it)
  });

  const auditService = app.get(AuditService);
  const port = process.env.PORT || 3000;
  const env = process.env.NODE_ENV || 'development';

  await app.listen(port);

  auditService.startupBanner('Sentinel', Number(port), env);
  auditService.info(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
}
void bootstrap();
