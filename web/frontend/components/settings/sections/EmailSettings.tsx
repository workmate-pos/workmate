import type { ShopSettings } from '@web/services/settings/schema.js';
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  Collapsible,
  FormLayout,
  Icon,
  InlineStack,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ReactNode, useEffect, useId, useState } from 'react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { CaretUpMinor } from '@shopify/polaris-icons';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';

// TODO: Uniform <SettingsSection /> component with title etc

export function EmailSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  const [toast, setToastAction] = useToast();

  const [wipLocationPrintSettings, setWipLocationPrintSettings] = useState<
    ShopSettings['printing']['global'] & { locationId: ID | null }
  >();

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingLg" fontWeight="bold">
        Email Settings
      </Text>

      <PrintSettingsForm
        printSettings={settings.printing.global}
        onChange={global => setSettings({ ...settings, printing: { ...settings.printing, global } })}
      />

      {settings.franchises.enabled && (
        <BlockStack gap="600">
          <BlockStack gap="100">
            <Text as="h2" variant="headingLg" fontWeight="bold">
              Location Email Settings
            </Text>

            <Text as="p" variant="bodyMd" tone="subdued" truncate>
              You can configure email settings for individual locations. These settings override the global email.
              settings.
            </Text>
          </BlockStack>

          {Object.entries(settings.printing.locationOverrides).length === 0 && !wipLocationPrintSettings && (
            <BlockStack inlineAlign="center" gap={'400'}>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                No locations configured
              </Text>
            </BlockStack>
          )}

          {(Object.entries(settings.printing.locationOverrides).length > 0 || !!wipLocationPrintSettings) && (
            <BlockStack gap="200">
              {Object.entries(settings.printing.locationOverrides).map(([locationId, printSettings], i) => (
                <LocationPrintSettingsCard
                  key={i}
                  locationId={locationId as ID}
                  printSettings={printSettings}
                  onChange={(newLocationId, newPrintSettings) => {
                    const locationOverrides = { ...settings.printing.locationOverrides };

                    if (newLocationId !== locationId) {
                      delete locationOverrides[locationId];
                    }

                    locationOverrides[newLocationId] = newPrintSettings;
                    setSettings({ ...settings, printing: { ...settings.printing, locationOverrides } });
                  }}
                  onRemove={() => {
                    const locationOverrides = { ...settings.printing.locationOverrides };
                    delete locationOverrides[locationId as ID];
                    setSettings({ ...settings, printing: { ...settings.printing, locationOverrides } });
                  }}
                  disabledLocationIds={Object.keys(settings.printing.locationOverrides) as ID[]}
                />
              ))}

              {!!wipLocationPrintSettings && (
                <LocationPrintSettingsCard
                  locationId={wipLocationPrintSettings.locationId}
                  printSettings={wipLocationPrintSettings}
                  onChange={(locationId, printSettings) =>
                    setWipLocationPrintSettings({ ...printSettings, locationId })
                  }
                  onSave={() => {
                    if (!wipLocationPrintSettings.locationId) {
                      setToastAction({ content: 'Location is required' });
                      return;
                    }

                    if (wipLocationPrintSettings.locationId in settings.printing.locationOverrides) {
                      setToastAction({ content: 'This location is already configured' });
                      return;
                    }

                    const locationOverrides = { ...settings.printing.locationOverrides };
                    locationOverrides[wipLocationPrintSettings.locationId] = wipLocationPrintSettings;
                    setSettings({ ...settings, printing: { ...settings.printing, locationOverrides } });
                    setWipLocationPrintSettings(undefined);
                  }}
                  onRemove={() => {
                    setWipLocationPrintSettings(undefined);
                  }}
                  disabledLocationIds={Object.keys(settings.printing.locationOverrides) as ID[]}
                />
              )}
            </BlockStack>
          )}

          {!wipLocationPrintSettings && (
            <InlineStack align="center">
              <Button
                onClick={() =>
                  setWipLocationPrintSettings({
                    locationId: null,
                    allowCustomEmail: true,
                    allowCustomReplyTo: true,
                    allowCustomFrom: true,
                    defaultEmail: '',
                    defaultFrom: '',
                    defaultReplyTo: '',
                  })
                }
              >
                Configure new location
              </Button>
            </InlineStack>
          )}
        </BlockStack>
      )}

      {toast}
    </BlockStack>
  );
}

function LocationPrintSettingsCard({
  locationId,
  printSettings,
  onChange,
  onSave,
  onRemove,

  disabledLocationIds,
}: {
  locationId: ID | null;
  printSettings: ShopSettings['printing']['global'];
  onChange: (locationId: ID, printSettings: ShopSettings['printing']['global']) => void;
  onRemove: () => void;
  onSave?: () => void;

  /**
   * Locations that are in use already so cannot be selected
   */
  disabledLocationIds?: ID[];
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const locationsQuery = useLocationsQuery({ fetch, params: { first: 50 } });

  useEffect(() => {
    if (locationsQuery.hasNextPage && !locationsQuery.isFetching) {
      locationsQuery.fetchNextPage();
    }
  }, [locationsQuery.hasNextPage, locationsQuery.isFetching]);

  const locationQuery = useLocationQuery({ fetch, id: locationId });
  const location = locationQuery.data;

  const id = useId();
  const [open, setOpen] = useState(locationId === null);

  return (
    <Card>
      <BlockStack gap={'400'}>
        <span onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
          <InlineStack align="space-between" gap={'200'}>
            <Text as="p" variant="bodyMd" fontWeight="bold">
              {location?.name}
            </Text>

            <span
              style={{
                transform: open ? 'rotate(180deg)' : undefined,
                transition: 'all 0.2s ease-in-out',
              }}
              onClick={() => setOpen(current => !current)}
            >
              <Icon source={CaretUpMinor} tone={'subdued'} />
            </span>
          </InlineStack>
        </span>

        <Collapsible id={id} open={open}>
          <PrintSettingsForm
            top={
              <Select
                label={'Location'}
                options={[
                  {
                    label: 'Select a location',
                    disabled: true,
                    value: '',
                  },

                  ...(locationsQuery.data?.pages.flat().map(location => ({
                    label: location.name,
                    value: location.id,
                    disabled: disabledLocationIds?.includes(location.id),
                  })) ?? []),
                ]}
                onChange={locationId => onChange(locationId as ID, printSettings)}
                requiredIndicator
                value={locationId ?? undefined}
              />
            }
            bottom={
              <InlineStack align="end" gap={'200'}>
                <Button variant="primary" tone="critical" onClick={() => onRemove()}>
                  Remove
                </Button>
                {!!onSave && (
                  <Button
                    variant="primary"
                    onClick={() => onSave()}
                    disabled={!locationId || disabledLocationIds?.includes(locationId)}
                  >
                    Save
                  </Button>
                )}
              </InlineStack>
            }
            printSettings={printSettings}
            disabled={!locationId}
            onChange={printSettings => {
              if (!locationId) {
                return;
              }

              onChange(locationId, printSettings);
            }}
          />
        </Collapsible>
      </BlockStack>

      {toast}
    </Card>
  );
}

function PrintSettingsForm({
  printSettings,
  onChange,
  top,
  bottom,
  disabled = false,
}: {
  printSettings: ShopSettings['printing']['global'];
  onChange: (printSettings: ShopSettings['printing']['global']) => void;
  top?: ReactNode;
  bottom?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <FormLayout>
      {top}

      <TextField
        label={'Email address'}
        autoComplete="off"
        value={printSettings.defaultEmail}
        onChange={defaultEmail => onChange({ ...printSettings, defaultEmail })}
        helpText={'The email address that WorkMate will send print jobs to by default'}
        disabled={disabled}
      />

      <Checkbox
        label={'Allow custom email address'}
        checked={printSettings.allowCustomEmail}
        onChange={allowCustomEmail => onChange({ ...printSettings, allowCustomEmail })}
        helpText={
          'Allow staff members to override the default print email address. Can be used to send printable documents to customers, etc.'
        }
        disabled={disabled}
      />

      <TextField
        label={'From'}
        autoComplete="off"
        value={printSettings.defaultFrom}
        onChange={defaultFrom => onChange({ ...printSettings, defaultFrom })}
        helpText={'The default name that will appear in the From field of emails sent from WorkMate'}
        disabled={disabled}
      />

      <Checkbox
        label={'Allow custom from'}
        checked={printSettings.allowCustomFrom}
        onChange={allowCustomFrom => onChange({ ...printSettings, allowCustomFrom })}
        helpText={'Allow staff members to override the default from name, e.g. by setting it to their name.'}
        disabled={disabled}
      />

      <TextField
        label={'Reply-To'}
        autoComplete="off"
        value={printSettings.defaultReplyTo}
        onChange={defaultReplyTo => onChange({ ...printSettings, defaultReplyTo })}
        helpText={'The email address that will appear in the Reply-To field of emails sent from WorkMate'}
        disabled={disabled}
      />

      <Checkbox
        label={'Allow custom reply-to'}
        checked={printSettings.allowCustomReplyTo}
        onChange={allowCustomReplyTo => onChange({ ...printSettings, allowCustomReplyTo })}
        helpText={
          'Allow staff members to override the default reply-to address. Can be used to configure custom points of contact.'
        }
        disabled={disabled}
      />

      {bottom}
    </FormLayout>
  );
}
