import { createContext, ReactNode, useContext, useState } from 'react';
import { Dialog } from '@shopify/retail-ui-extensions-react';

const UnsavedChangesDialogContext = createContext<UnsavedChangesDialogContextValue>(null!);

type ShowDialogOptions = {
  /**
   * Callback to run when the user wants to proceed with the action.
   * I.e. exiting the screen without saving changes.
   */
  onAction: () => void;
  /**
   * Optional boolean to make it easy to conditionally show the dialog.
   * If undefined, the dialog will always be shown.
   * If set to false, the action will immediately be invoked.
   * Handy for when there are no unsaved changes.
   */
  skipDialog?: boolean;
};

type UnsavedChangesDialogContextValue = {
  show: (options: ShowDialogOptions) => void;
};

export const useUnsavedChangesDialog = (): UnsavedChangesDialogContextValue => useContext(UnsavedChangesDialogContext);

// TODO: If ever needed, make this a general DialogProvider with a general useDialog. Then make useUnsavedChangesDialog an abstraction over useDialog
export function UnsavedChangesDialogProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [onAction, setOnAction] = useState<() => void>(() => {});

  const show = ({ onAction, skipDialog }: ShowDialogOptions) => {
    setOnAction(() => onAction);
    const visible = skipDialog !== true;
    setVisible(visible);

    if (!visible) {
      onAction();
    }
  };

  return (
    <UnsavedChangesDialogContext.Provider value={{ show }}>
      <Dialog
        title={'Unsaved changes'}
        isVisible={visible}
        type={'alert'}
        content={'You have unsaved changes. Are you sure you want to proceed?'}
        actionText={'Continue'}
        showSecondaryAction={true}
        secondaryAction={'Cancel'}
        onAction={() => {
          setVisible(false);
          onAction();
        }}
        onSecondaryAction={() => setVisible(false)}
      />
      {children}
    </UnsavedChangesDialogContext.Provider>
  );
}