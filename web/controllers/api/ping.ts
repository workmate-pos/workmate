import { Authenticated, Get } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Permission } from '../../decorators/permission.js';

@Authenticated()
@Permission('none')
export default class PingController {
  @Get('/')
  async pong(req: Request, response: Response) {
    return response.send('pong');
  }
}
