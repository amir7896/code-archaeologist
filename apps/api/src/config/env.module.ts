import { Global, Module } from '@nestjs/common';
import { APP_ENV, EnvService } from './env.service';

@Global()
@Module({
  providers: [EnvService, { provide: APP_ENV, useFactory: (env: EnvService) => env.load(), inject: [EnvService] }],
  exports: [EnvService, APP_ENV],
})
export class EnvModule {}
