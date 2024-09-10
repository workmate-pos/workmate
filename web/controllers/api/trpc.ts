import {
  Authenticated,
  Delete,
  Get,
  Head,
  Options,
  Patch,
  Post,
  Put,
} from '@teifi-digital/shopify-app-express/decorators';
import { trpcHandler } from '../../trpc/router.js';

export default class TrpcController {
  @Authenticated()
  @Get('*')
  @Post('*')
  @Put('*')
  @Delete('*')
  @Patch('*')
  @Options('*')
  @Head('*')
  _ = trpcHandler;
}
