import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useExtensionApi } from '@shopify/retail-ui-extensions-react';

export type ScreenSize = 'mobile' | 'tablet';

const ScreenSizeContext = createContext<ScreenSize>('tablet');

export const useScreenSize = () => useContext(ScreenSizeContext);

export function ScreenSizeProvider(props: { children: ReactNode }) {
  const [screenSize, setScreenSize] = useState<ScreenSize>('tablet');
  const { device } = useExtensionApi<'pos.home.modal.render'>();

  useEffect(() => {
    device.isTablet().then(isTablet => setScreenSize(isTablet ? 'tablet' : 'mobile'));
  }, []);

  return <ScreenSizeContext.Provider value={screenSize}>{props.children}</ScreenSizeContext.Provider>;
}
