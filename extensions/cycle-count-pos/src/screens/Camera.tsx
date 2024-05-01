import { BannerProps, CameraScanner } from '@shopify/retail-ui-extensions-react';

export function Camera({ banner }: { banner?: BannerProps }) {
  return <CameraScanner bannerProps={banner} />;
}
