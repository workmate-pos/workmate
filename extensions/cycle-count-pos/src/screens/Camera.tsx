import { BannerProps, CameraScanner } from '@shopify/ui-extensions-react/point-of-sale';

export function Camera({ banner }: { banner?: BannerProps }) {
  return <CameraScanner bannerProps={banner} />;
}
