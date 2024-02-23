import { Stack, StackProps } from '@shopify/retail-ui-extensions-react';
import { ScreenSize, useScreenSize } from '../providers/ScreenSizeProvider.js';

export type ResponsiveStackProps = StackProps & { [K in ScreenSize]?: Partial<StackProps> };

/**
 * Stack component that accepts props as usual, but allows overriding depending on the screen size.
 */
export function ResponsiveStack({ children, tablet, mobile, ...props }: ResponsiveStackProps) {
  const screenSize = useScreenSize();
  const overrideProps = screenSize === 'tablet' ? tablet : mobile;

  return <Stack {...{ ...props, ...overrideProps }}>{children}</Stack>;
}
