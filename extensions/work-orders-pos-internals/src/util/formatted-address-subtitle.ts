import { ListRow } from '@shopify/ui-extensions-react/point-of-sale';

export function getFormattedAddressSubtitle(formattedAddress: string[]): ListRow['leftSide']['subtitle'] {
  if (formattedAddress.length === 0) return ['No address'] as const;
  if (formattedAddress.length === 1) return [formattedAddress[0]!] as const;
  if (formattedAddress.length === 2) return [formattedAddress[0]!, formattedAddress[1]!] as const;
  return [formattedAddress[0]!, formattedAddress[1]!, formattedAddress[2]!] as const;
}
