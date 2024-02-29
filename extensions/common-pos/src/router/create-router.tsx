import { createContext, FC, useCallback, useContext, useEffect, useState } from 'react';
import { Navigator, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ControllableScreen } from './controllable-screen.js';

/**
 * Custom router.
 * Needed because the default Navigator + Screen mechanism is not flexible enough.
 * This router solves:
 * - automatic mounting and unmounting of popups
 * - tracking navigation history
 * - passing props to screens
 * - nested popups of the same type
 */
export function createRouter<const Routes extends Record<string, Route<any>>>(
  main: Route<Record<string, never>>,
  routes: Routes,
) {
  const RouterContext = createContext<RouterContextValue<Routes> | null>(null);

  /**
   * Access router internals
   */
  const useRouter = () => {
    const router = useContext(RouterContext);

    if (router === null) {
      throw new Error('Router is not provided');
    }

    return router;
  };

  const Router = () => {
    const { navigation, toast } = useExtensionApi<'pos.home.modal.render'>();

    const [stack, setStack] = useState<RouteStack<Routes>>([]);

    const push = useCallback(
      <const K extends keyof Routes>(route: K, props: FunctionComponentArg<Routes[K]['Component']>) => {
        setStack(stack => [...stack, [route, props]]);

        const idx = stack.length;
        navigation.navigate(`popup-${idx}`);
      },
      [stack, setStack],
    );

    const pop = useCallback(() => navigation.pop(), [navigation]);
    const popStack = useCallback(() => setStack(stack => stack.slice(0, -1)), [setStack]);

    const SCREEN_COUNT = 15;

    useEffect(() => {
      if (stack.length > SCREEN_COUNT) {
        toast.show('Popup depth exceeded - please contact support');
        setStack(stack => stack.slice(0, SCREEN_COUNT));
      }
    }, [toast, stack, setStack]);

    const routerContextValue: RouterContextValue<Routes> = {
      push,
      pop,
      popStack,
      stack,
    };

    // Screens must be preallocated since Navigator does not support dynamically adding/removing screens.
    // Using `key` to re-render makes it flicker.
    const popups = Array.from({ length: SCREEN_COUNT }, (_, i) => i).map(i => {
      const stackElement = stack[i];
      const route = stackElement ? routes[stackElement[0]] : null;
      const props = stackElement ? stackElement[1] : null;

      return (
        <ControllableScreen
          name={`popup-${i}`}
          title={route?.title ?? 'Unallocated popup'}
          presentation={{ sheet: true }}
          router={routerContextValue}
        >
          {route && props && <route.Component {...props} />}
        </ControllableScreen>
      );
    });

    return (
      <RouterContext.Provider value={routerContextValue}>
        <Navigator>
          <ControllableScreen name={'main'} title={main.title} router={routerContextValue}>
            <main.Component />
          </ControllableScreen>
          {popups}
        </Navigator>
      </RouterContext.Provider>
    );
  };

  return { Router, useRouter };
}

export type RouterContextValue<Routes extends Record<string, Route<any>>> = {
  /**
   * Pushes to the stack and calls api.navigation.navigate to the new screen.
   */
  push: <const K extends keyof Routes>(route: K, props: FunctionComponentArg<Routes[K]['Component']>) => void;
  /**
   * Calls api.navigation.pop() without popping the stack.
   * This will result in onNavigateBack being called, which will call popStack();
   */
  pop: () => void;
  /**
   * Pops the stack without navigating back.
   */
  popStack: () => void;
  stack: Readonly<RouteStack<Routes>>;
};

type Route<P extends object> = {
  Component: FC<P>;
  /**
   * Initial screen title. Can be changed through useScreen.
   */
  title: string;
};

// type RouteStack<Routes extends Record<string, Route<any>>> = (keyof Routes extends infer K
//   ? K extends keyof Routes
//     ? [K, FunctionComponentArg<Routes[K]['Component']>]
//     : never
//   : never)[];

type RouteStack<Routes extends Record<string, Route<any>>> = {
  [K in keyof Routes]: [K, FunctionComponentArg<Routes[K]['Component']>];
}[keyof Routes][];

type FunctionComponentArg<Component extends FC<any>> = Component extends FC<infer P> ? P & object : never;
