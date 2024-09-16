import { Liquid } from 'liquidjs';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export async function renderLiquid(template: string, variables: object) {
  const liquid = new Liquid();
  return liquid.parseAndRender(template, variables).catch(error => {
    throw new HttpError('Failed to render liquid template, please check your Liquid syntax and try again', 400);
  });
}
