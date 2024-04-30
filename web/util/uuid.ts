import { validate, version } from 'uuid';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export function assertValidUuid(uuid: string) {
  if (!validate(uuid)) {
    throw new HttpError(`Invalid uuid ${uuid}`, 400);
  }

  if (version(uuid) !== 4) {
    throw new HttpError(`Invalid uuid version ${uuid}`, 400);
  }
}
