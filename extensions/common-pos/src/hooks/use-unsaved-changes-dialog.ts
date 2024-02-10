import { ShowDialogOptions, useDialog } from '../providers/DialogProvider.js';
import { useExtensionApi } from '@shopify/retail-ui-extensions-react';

/**
 * Unsaved changes dialog. onAction defaults to `navigation.pop()`, but can be overriden.
 */
export const useUnsavedChangesDialog = (options: {
  onAction?: ShowDialogOptions['onAction'];
  hasUnsavedChanges: boolean;
}) => {
  const dialog = useDialog();
  const { navigation } = useExtensionApi<'pos.home.modal.render'>();

  return {
    show: () => {
      dialog.show({
        onAction: options.onAction ?? navigation.pop,
        showDialog: options.hasUnsavedChanges,
        props: {
          title: 'Unsaved Changes',
          type: 'alert',
          content: 'You have unsaved changes. Are you sure you want to proceed?',
          actionText: 'Discard Changes',
          showSecondaryAction: true,
          secondaryActionText: 'Cancel',
        },
      });
    },
  };
};
