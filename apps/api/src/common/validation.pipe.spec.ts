import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { createValidationPipe } from './validation.pipe';

class SampleDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();

  it('transforms and keeps allowed fields', async () => {
    const value = await pipe.transform(
      { name: 'ab' },
      { type: 'body', metatype: SampleDto, data: '' },
    );
    expect(value).toEqual({ name: 'ab' });
  });

  it('rejects unknown fields', async () => {
    await expect(
      pipe.transform({ name: 'ab', extra: true }, { type: 'body', metatype: SampleDto, data: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid DTO values with VALIDATION_ERROR', async () => {
    await expect(
      pipe.transform({ name: 'a' }, { type: 'body', metatype: SampleDto, data: '' }),
    ).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });
  });
});
