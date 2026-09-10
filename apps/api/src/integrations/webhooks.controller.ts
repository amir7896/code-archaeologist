import { Controller, Headers, HttpCode, Inject, Param, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type Request } from 'express';
import { IntegrationsService } from './integrations.service';
import { GithubWebhookDocs } from './swagger/integration.swagger';
import { WebhookAckDto } from './dto/integration.dto';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(@Inject(IntegrationsService) private readonly integrations: IntegrationsService) {}

  @Post('github/:workspaceId')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @GithubWebhookDocs()
  receive(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-github-delivery') deliveryId: string | undefined,
    @Headers('x-github-event') event: string | undefined,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<WebhookAckDto> {
    const rawBody = request.rawBody;
    if (!rawBody) {
      return Promise.resolve({ status: 'ignored' });
    }
    return this.integrations.receiveWebhook({
      workspaceId,
      deliveryId,
      event,
      signature,
      rawBody,
    });
  }
}
