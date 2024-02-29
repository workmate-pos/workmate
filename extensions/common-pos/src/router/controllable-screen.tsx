import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Screen, ScreenProps, useExtensionApi } from '@shopify/retail-ui-extensions-react';
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
  router,
  ...props
}: ScreenProps & { router: RouterContextValue<any> }) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [overrideNavigateBackFunctions, setOverrideNavigateBackFunctions] = useState<
    Record<string, (next: () => void) => void>
  >({});

  useLayoutEffect(() => {
    if (initialTitle !== undefined) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  useLayoutEffect(() => {
    if (initialIsLoading !== undefined) {
      setIsLoading(initialIsLoading);
    }
  }, [initialIsLoading]);

  const _onNavigateBack = useCallback(() => {
    onNavigateBack?.();
    router.popStack();
  }, [onNavigateBack, router.popStack]);

  const clear = useCallback(
    (id: string) =>
      setOverrideNavigateBackFunctions(overrides =>
        Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== id)),
      ),
    [],
  );

  const addOverrideNavigateBack = useCallback((id: string, override: (next: () => void) => void) => {
    return setOverrideNavigateBackFunctions(overrides => {
      if (overrides[id] === override) return overrides;
      return { ...overrides, [id]: override };
    });
  }, []);

  const composedOverrideNavigateBack = useCallback(() => {
    const composed = Object.values(overrideNavigateBackFunctions).reduce(
      (prev, override) => next => override(() => prev(next)),
      next => next(),
    );

    composed(initialOverrideNavigateBack ?? router.pop);
  }, [overrideNavigateBackFunctions, initialOverrideNavigateBack, router.pop]);

  return (
    <ScreenContext.Provider value={{ setTitle, clear, addOverrideNavigateBack, setIsLoading }}>
      <Screen
        {...props}
        title={title}
        isLoading={isLoading}
        onNavigateBack={_onNavigateBack}
        overrideNavigateBack={composedOverrideNavigateBack}
      />
    </ScreenContext.Provider>
  );
}
