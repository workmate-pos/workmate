import { createContext, ReactNode, useContext, useState } from 'react';
import { DialogProps } from '@shopify/retail-ui-extensions';
import { Dialog } from '@shopify/retail-ui-extensions-react';

const DialogContext = createContext<DialogContextValue | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }

  return context;
};

type DialogContextValue = {
  show: (options: ShowDialogOptions) => void;
  isVisible: boolean;
};

export type ShowDialogOptions = {
  onAction: () => void;
  onSecondaryAction?: () => void;
  /**
   * Optional boolean to make it easy to conditionally show the dialog.
   * If undefined, the dialog will always be shown.
   * If set to false, the action will immediately be invoked without showing the dialog.
   */
  showDialog?: boolean;
  /**
   * Props to pass to the dialog.
   */
  props: Omit<DialogProps, 'onAction' | 'onSecondaryAction' | 'isVisible'>;
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [{ onAction, onSecondaryAction, ...dialogProps }, setDialogProps] = useState<DialogProps>({
    title: 'Top text',
    actionText: 'Bottom text',
    isVisible: false,
    onAction: () => {},
  });

  const show = ({ showDialog, props, onAction, onSecondaryAction }: ShowDialogOptions) => {
    const isVisible = showDialog !== false;
    setDialogProps(current => ({ ...current, ...props, isVisible, onAction, onSecondaryAction }));

    if (!isVisible) {
      onAction();
    }
  };

  return (
    <DialogContext.Provider value={{ show, isVisible: dialogProps.isVisible }}>
      <Dialog
        {...dialogProps}
        onAction={() => {
          setDialogProps(current => ({ ...current, isVisible: false }));
          onAction();
        }}
        onSecondaryAction={() => {
          setDialogProps(current => ({ ...current, isVisible: false }));
          onSecondaryAction?.();
        }}
      />
      {children}
    </DialogContext.Provider>
  );
}
