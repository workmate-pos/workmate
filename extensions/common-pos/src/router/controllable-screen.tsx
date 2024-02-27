import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Screen, ScreenProps } from '@shopify/retail-ui-extensions-react';
import { RouterContextValue } from './create-router.js';

const ScreenContext = createContext<ScreenContextValue | null>(null);

export type ScreenContextValue = {
  setTitle: (title: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  addOverrideNavigateBack: (id: string, override: (next: () => void) => void) => void;
  clear: (id: string) => void;
};

/**
 * Hook that can be used to control screen props, e.g. setting the title, composing navigation overrides, etc.
 */
export function useScreen() {
  const screen = useContext(ScreenContext);

  if (screen === null) {
    throw new Error('Screen is not provided');
  }

  // Generate a unique id for the useScreen so we can keep track of its overrides and clear them when the screen is unmounted.
  const id = useMemo(() => Math.random().toString(36).substring(7), []);

  useEffect(() => {
    return () => {
      screen.clear(id);
    };
  }, []);

  return {
    ...screen,
    addOverrideNavigateBack: useCallback(
      (override: (next: () => void) => void) => screen.addOverrideNavigateBack(id, override),
      [screen.addOverrideNavigateBack, id],
    ),
  };
}

/**
 * Screen that is controllable through useScreen.
 */
export function ControllableScreen({
  title: initialTitle,
  overrideNavigateBack: initialOverrideNavigateBack,
  isLoading: initialIsLoading,
  onNavigateBack,
  isActive,
  router,
  ...props
}: ScreenProps & { isActive: boolean; router: RouterContextValue<any> }) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [overrideNavigateBackFunctions, setOverrideNavigateBackFunctions] = useState<
    Record<string, (next: () => void) => void>
  >({});

  useEffect(() => {
    setTitle(initialTitle ?? '');
  }, [initialTitle]);

  useEffect(() => {
    setIsLoading(initialIsLoading ?? false);
  }, [initialIsLoading]);

  const _onNavigateBack = useCallback(() => {
    if (!isActive) {
      // we only want to listen for navigate back when the screen is in view.
      // this way we can detect the 'swipe down' motion.
      // listening when not active means that calling pop() inside overrideNavigateBack will cause an infinite pop() loop
      return;
    }

    (onNavigateBack ?? router.popStack)();
  }, [onNavigateBack, router.popStack, isActive]);

  const clear = useCallback(
    (id: string) =>
      setOverrideNavigateBackFunctions(overrides =>
        Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== id)),
      ),
    [setOverrideNavigateBackFunctions],
  );

  const addOverrideNavigateBack = useCallback(
    (id: string, override: (next: () => void) => void) =>
      setOverrideNavigateBackFunctions(overrides => ({ ...overrides, [id]: override })),
    [setOverrideNavigateBackFunctions],
  );

  const composedOverrideNavigateBack = useCallback(() => {
    const composed = Object.values(overrideNavigateBackFunctions).reduce(
      (prev, override) => next => override(() => prev(next)),
      () => (initialOverrideNavigateBack ?? onNavigateBack ?? router.pop)(),
    );

    composed(function noop() {});
  }, [overrideNavigateBackFunctions, initialOverrideNavigateBack, router.pop]);

  // TODO: Fix this (or does it work???)
  // overrideNavigateBack={composedOverrideNavigateBack}
  return (
    <ScreenContext.Provider value={{ setTitle, clear, addOverrideNavigateBack, setIsLoading }}>
      <Screen {...props} onNavigateBack={_onNavigateBack} title={title} isLoading={isLoading} />
    </ScreenContext.Provider>
  );
}
