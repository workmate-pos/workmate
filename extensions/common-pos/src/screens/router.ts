import { createRouter } from '@teifi-digital/pos-tools/router';
import { FC } from 'react';

export type Route<P extends object> = {
  Component: FC<P>;
  title: string;
};

export type Router<Routes extends Record<string, Route<any>> = {}> = ReturnType<
  ReturnType<typeof createRouter<Routes>>['useRouter']
>;

export type UseRouter<Routes extends Record<string, Route<any>> = {}> = ReturnType<
  typeof createRouter<Routes>
>['useRouter'];
