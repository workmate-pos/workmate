import type { ScreenInputOutput } from '../screens/routes.js';

declare module '@work-orders/common-pos/hooks/use-screen.js' {
  interface ScreenRegister {
    Routes: ScreenInputOutput;
  }
}

export * from '@work-orders/common-pos/hooks/use-screen.js';
