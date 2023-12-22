import { Screen, ScreenProps, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useId } from './use-id.js';
import type { ScreenInputOutput } from '../screens/routes.js';
import { useDynamicRef } from './use-dynamic-ref.js';

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
  const [popupId, setPopupId] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  const { navigation } = useExtensionApi<'pos.home.modal.render'>();
  const popupResultEventTarget = useMemo(() => new EventTarget(), []);

  /**
   * A managed navigation function and event handler that returns the popup result.
   */
  const usePopup: UsePopupFn = useCallback(
    (destinationScreenName, onResult) => {
      const { navigation } = useExtensionApi<'pos.home.modal.render'>();

      // using an id ensures we can use the same pop-up screen for multiple purposes. it identifies a specific instance of a pop up
      const id = `${destinationScreenName}:${useId()}`;

      useEffect(() => {
        const eventHandler = (event: Event) => {
          if (event instanceof CustomEvent) {
            const params: ClosePopupParams = event.detail;
            onResult?.(params.output);
          }
        };

        popupResultEventTarget.addEventListener(id, eventHandler);

        return () => popupResultEventTarget.removeEventListener(id, eventHandler);
      }, []);

      const navigate: PopupNavigateFn<typeof destinationScreenName> = (input = undefined) => {
        const params: OpenPopupParams = {
          type: 'open-popup',
          returnTo: screenName,
          popupId: id,
          input,
        };

        navigation.navigate(destinationScreenName, params);
      };

      return { navigate };
    },
    [popupResultEventTarget],
  );

  /**
   * Navigates back to the screen that opened this screen, and provides it with a result.
   */
  const closePopup: ClosePopupFn<ScreenName> = (result: ScreenInputOutput[ScreenName][1]) => {
    if (!returnTo) {
      navigate('Error', 'No returnTo');
      return;
    }

    if (!popupId) {
      navigate('Error', 'No popupId');
      return;
    }

    const params: ClosePopupParams = {
      type: 'close-popup',
      popupId,
      output: result,
    };

    navigation.navigate(returnTo, params);
  };

  /**
   * Navigates back to the screen that opened this screen, without providing a result.
   */
  const cancelPopup: CancelPopupFn = () => navigation.pop();

  const dismiss = () => navigation.dismiss();

  /**
   * Anonymous navigation function.
   * Can only be used if the destination screen does not require any input.
   */
  const navigate: NavigateFn = (destinationScreenName, input = undefined) => {
    const params: OpenPopupParams = {
      type: 'open-popup',
      returnTo: screenName,
      popupId: destinationScreenName,
      input,
    };

    navigation.navigate(destinationScreenName, params);
  };

  const onReceiveParamsRef = useDynamicRef(
    () => (params: Params) => {
      switch (params.type) {
        case 'open-popup':
          setPopupId(params.popupId);
          setReturnTo(params.returnTo);
          onInput?.(params.input);
          break;

        case 'close-popup':
          popupResultEventTarget.dispatchEvent(new CustomEvent(params.popupId, { detail: params }));
          break;

        default:
          return params satisfies never;
      }
    },
    [setPopupId, onInput, popupResultEventTarget],
  );

  const WrappedScreen = useCallback(
    (props: Omit<ScreenProps, 'name' | 'onReceiveParams'>) => (
      <Screen {...props} name={screenName} onReceiveParams={onReceiveParamsRef.current} />
    ),
    [screenName],
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

type Params<I = ScreenInputOutput[keyof ScreenInputOutput][0], O = ScreenInputOutput[keyof ScreenInputOutput][1]> =
  | OpenPopupParams<I>
  | ClosePopupParams<O>;

type OpenPopupParams<I = ScreenInputOutput[keyof ScreenInputOutput][0]> = {
  type: 'open-popup';
  returnTo: keyof ScreenInputOutput;
  popupId: string;
  input: I;
};

type ClosePopupParams<O = ScreenInputOutput[keyof ScreenInputOutput][1]> = {
  type: 'close-popup';
  popupId: string;
  output: O;
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
