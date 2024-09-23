import { match, P } from 'ts-pattern';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ListRowLeftSide, ListRowSubtitle } from '@shopify/ui-extensions/point-of-sale';

export function getSubtitle(
  subtitle: (ListRowSubtitle | undefined | null)[] | undefined | null,
): ListRowLeftSide['subtitle'] {
  return match(
    subtitle
      ?.filter(isNonNullable)
      .filter(str => typeof str !== 'string' || str.trim().length > 0)
      .slice(0, 3),
  )
    .with([P._, P._, P._], identity)
    .with([P._, P._], identity)
    .with([P._], identity)
    .otherwise(() => undefined);
}
