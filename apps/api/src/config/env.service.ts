import { Injectable } from '@nestjs/common';
import { type AppEnv, validateEnv } from '@code-archaeologist/shared';

export const APP_ENV = Symbol('APP_ENV');

@Injectable()
export class EnvService {
  load(source: NodeJS.ProcessEnv = process.env): AppEnv {
    return validateEnv(source);
  }
}
