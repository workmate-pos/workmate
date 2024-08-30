import { match, P } from 'ts-pattern';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ListRowSubtitle } from '@shopify/retail-ui-extensions';

export function getSubtitle(subtitle: (ListRowSubtitle | undefined | null)[] | undefined | null) {
  return match(subtitle?.filter(isNonNullable).slice(0, 3))
    .with([P._, P._, P._], identity)
    .with([P._, P._], identity)
    .with([P._], identity)
    .otherwise(() => undefined);
}
