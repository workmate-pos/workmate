import { Screen, ScreenProps, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useCallback, useEffect, useState } from 'react';
import { useId } from './use-id.js';
import type { ScreenInputOutput } from '../screens/routes.js';

/**
 * Hook that provides:
 * - type-safe navigation
 * - inverses control flow of navigation
 *
 * The latter is especially important for the reusability of pop-up screens.
 */
export function useScreen<const ScreenName extends ScreenNames>(
  screenName: ScreenName,
  onInput?: (input: ScreenInputOutput[ScreenName][0]) => void,
) {
  const [params, setParams] = useState<Params | null>(null);

  // if this screen is a pop up, we must track the id s.t. we can return the result with the correct id
  const [id, setId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!params) return;
    if (params.isPopupClose) return;
    onInput?.(params.input);
    setId(params.id);
  }, [params]);

  /**
   * A managed navigation function and event handler that returns the popup result.
   */
  const usePopup: UsePopupFn = (destinationScreenName, onResult) => {
    const api = useExtensionApi<'pos.home.modal.render'>();

    // using an id ensures we can use the same pop-up screen for multiple purposes. it identifies a specific instance of a pop up
    const id = `${destinationScreenName}:${useId()}`;

    useEffect(() => {
      if (params?.id !== id) return;
      if (!params?.isPopupClose) return;
      onResult?.(params.result);
    }, [params]);

    const navigate: PopupNavigateFn<typeof destinationScreenName> = (input = undefined) => {
      api.navigation.navigate(destinationScreenName, {
        returnTo: [...(params?.returnTo ?? []), screenName],
        id,
        input,
        isPopupClose: false,
      } satisfies Params);
    };

    return { navigate };
  };

  const api = useExtensionApi<'pos.home.modal.render'>();

  /**
   * Navigates back to the screen that opened this screen, and provides it with a result.
   */
  const closePopup: ClosePopupFn<ScreenName> = (result: ScreenInputOutput[ScreenName][1]) => {
    if (!params) {
      api.navigation.navigate('Error', {
        error: `No params received ${JSON.stringify({ params, result })}`,
      });
      return;
    }

    if (!params.returnTo!.length) {
      api.navigation.navigate('Error', {
        error: 'No returnTo',
      });
      return;
    }

    api.navigation.navigate(params.returnTo!.at(-1)!, {
      id,
      result,
      returnTo: params.returnTo!.slice(0, -1),
      isPopupClose: true,
    } satisfies Params);
  };

  /**
   * Navigates back to the screen that opened this screen, without providing a result.
   * @TODO: Check if this works
   */
  const cancelPopup: CancelPopupFn = () =>
    api.navigation.navigate(params!.returnTo!.at(-1)!, {
      id,
      returnTo: params!.returnTo!.slice(0, -1),
      isPopupClose: false,
    } satisfies Params);

  const dismiss = () => api.navigation.dismiss();

  /**
   * Anonymous navigation function.
   * Can only be used if the destination screen does not require any input.
   */
  const navigate: NavigateFn = (destinationScreenName, input = undefined) => {
    api.navigation.navigate(destinationScreenName, { input, isPopupClose: false } satisfies Params);
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
    cancelPopup,
    navigate,
    dismiss,
    Screen: WrappedScreen,
  };
}

type Params = {
  returnTo?: string[];
  id?: string;
  input?: any;
  result?: any;
  /**
   * Used to determine whether to update input or result.
   */
  isPopupClose: boolean;
};

type ScreenNames = keyof ScreenInputOutput;
type PopupScreenNames = { [K in ScreenNames]: ScreenInputOutput[K][1] extends undefined ? never : K }[ScreenNames];
type NormalScreenNames = { [K in ScreenNames]: ScreenInputOutput[K][1] extends undefined ? K : never }[ScreenNames];

export type PopupNavigateFn<DestinationScreenName extends ScreenNames> = (
  ...args: ScreenInputOutput[DestinationScreenName][0] extends undefined
    ? []
    : [input: ScreenInputOutput[DestinationScreenName][0]]
) => void;

export type NavigateFn = <const DestinationScreenName extends NormalScreenNames>(
  ...args: ScreenInputOutput[DestinationScreenName][0] extends undefined
    ? [destinationScreenName: DestinationScreenName]
    : [destinationScreenName: DestinationScreenName, input: ScreenInputOutput[DestinationScreenName][0]]
) => void;

export type UsePopupFn = <const DestinationScreenName extends ScreenNames>(
  destinationScreenName: DestinationScreenName,
  onResult?: (result: ScreenInputOutput[DestinationScreenName][1]) => void,
) => {
  navigate: PopupNavigateFn<DestinationScreenName>;
};

export type ClosePopupFn<ScreenName extends ScreenNames> = (result: ScreenInputOutput[ScreenName][1]) => void;
export type CancelPopupFn = () => void;
