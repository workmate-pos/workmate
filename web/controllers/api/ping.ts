import { Get } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Request, Response } from 'express-serve-static-core';

export default class PingController {
  @Get('/')
  async pong(req: Request, response: Response) {
    return response.send('pong');
  }
}
