import { Screen, ScreenProps, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useCallback, useEffect, useState } from 'react';
import { useId } from './use-id';
import { ScreenInputOutput } from '../screens/routes';

/**
 * Hook that provides:
 * - type-safe navigation
 * - inverses control flow of navigation
 *
 * The latter is especially important for the reusability of pop-up screens.
 */
export const useScreen = <const ScreenName extends ScreenNames>(
  screenName: ScreenName,
  onInput?: (input: ScreenInputOutput[ScreenName][0]) => void,
) => {
  const [params, setParams] = useState<Params | null>(null);

  useEffect(() => {
    if (!params) return;
    onInput?.(params.input);
  }, [params]);

  /**
   * A managed navigation function and event handler that returns the popup result.
   */
  const usePopup = <DestinationScreenName extends PopupScreenNames>(
    destinationScreenName: DestinationScreenName,
    onResult?: (result: ScreenInputOutput[DestinationScreenName][1]) => void,
  ) => {
    const api = useExtensionApi<'pos.home.modal.render'>();

    // using an id ensures we can use the same pop-up screen for multiple purposes
    const id = `${destinationScreenName}:${useId()}`;

    useEffect(() => {
      if (params?.id !== id) return;
      onResult?.(params.result);
    }, [params]);

    type PopupNavigateFn = <const DestinationScreenName extends PopupScreenNames>(
      ...args: ScreenInputOutput[DestinationScreenName][0] extends undefined
        ? []
        : [input: ScreenInputOutput[DestinationScreenName][0]]
    ) => void;

    const navigate: PopupNavigateFn = (input = undefined) => {
      api.navigation.navigate(destinationScreenName, {
        returnTo: [...(params?.returnTo ?? []), screenName],
        id,
        input,
      } satisfies Params);
    };

    return { navigate };
  };

  const api = useExtensionApi<'pos.home.modal.render'>();

  /**
   * Navigates back to the screen that opened this screen, and provides it with a result.
   */
  const closePopup = (result: ScreenInputOutput[ScreenName][1]) => {
    if (!params) {
      api.navigation.navigate('Error', {
        error: `No params received ${JSON.stringify({ params, result })}`,
      });
      return;
    }

    if (!params.returnTo.length) {
      api.navigation.navigate('Error', {
        error: 'No returnTo',
      });
      return;
    }

    api.navigation.navigate(params.returnTo.at(-1), {
      id: params.id,
      result,
      returnTo: params.returnTo.slice(0, -1),
    } satisfies Params);
  };

  type NavigateFn = <const DestinationScreenName extends NormalScreenNames>(
    ...args: ScreenInputOutput[DestinationScreenName][0] extends undefined
      ? [destinationScreenName: DestinationScreenName]
      : [destinationScreenName: DestinationScreenName, input: ScreenInputOutput[DestinationScreenName][0]]
  ) => void;

  /**
   * Anonymous navigation function.
   * Can only be used if the destination screen does not require any input.
   */
  const navigate: NavigateFn = (destinationScreenName, input = undefined) => {
    api.navigation.navigate(destinationScreenName, { input } satisfies Params);
  };

  const WrappedScreen = useCallback(
    (props: Omit<ScreenProps, 'name' | 'onReceiveParams'>) => (
      <Screen {...props} name={screenName} onReceiveParams={setParams} />
    ),
    [screenName, setParams],
  );

  return {
    usePopup,
    closePopup,
    navigate,
    Screen: WrappedScreen,
  };
};

type Params = {
  returnTo?: string[];
  id?: string;
  input?: any;
  result?: any;
};

type ScreenNames = keyof ScreenInputOutput;
type PopupScreenNames = { [K in ScreenNames]: ScreenInputOutput[K][1] extends undefined ? never : K }[ScreenNames];
type NormalScreenNames = { [K in ScreenNames]: ScreenInputOutput[K][1] extends undefined ? K : never }[ScreenNames];
