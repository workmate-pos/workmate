import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export function httpError(...args: ConstructorParameters<typeof HttpError>): never {
  throw new HttpError(...args);
}
