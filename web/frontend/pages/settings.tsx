import { useToast } from '@teifi-digital/shopify-app-react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  Card,
  Frame,
  BlockStack,
  Page,
  Text,
  Box,
  TextField,
  InlineStack,
  Tag,
  Select,
  InlineGrid,
  Checkbox,
  Combobox,
  Listbox,
  Autocomplete,
  Icon,
  Button,
  Modal,
  DescriptionList,
} from '@shopify/polaris';
import { CirclePlusMinor, SearchMinor } from '@shopify/polaris-icons';
import { Loading, TitleBar } from '@shopify/app-bridge-react';
import invariant from 'tiny-invariant';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { CurrencyFormatter, useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { NumberField } from '../components/NumberField.js';
import type { ID, ShopSettings } from '../../schemas/generated/shop-settings.js';
import { Rule, RuleSet } from '../components/RuleSet.js';
import { AnnotatedRangeSlider } from '../components/AnnotatedRangeSlider.js';
import { useSettingsMutation } from '../queries/use-settings-mutation.js';
import { useCollectionsQuery } from '../queries/use-collections-query.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { Money, Decimal, BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { string } from '@teifi-digital/shopify-app-toolbox';
import { useDebouncedState } from '../hooks/use-debounced-state.js';

const ONLY_SHORTCUTS = 'ONLY_SHORTCUTS';
const CURRENCY_RANGE = 'CURRENCY_RANGE';
const PERCENTAGE_RANGE = 'PERCENTAGE_RANGE';

export default function () {
  return (
    <Frame>
      <Page narrowWidth>
        <PermissionBoundary permissions={['read_settings']}>
          <Settings />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function Settings() {
  const [toast, setToastAction] = useToast();
  const [settings, setSettings] = useState<ShopSettings>(null!);

  const [defaultPurchaseOrderStatusValue, setDefaultPurchaseOrderStatusValue] = useState('');
  const [defaultWorkOrderStatusValue, setDefaultWorkOrderStatusValue] = useState('');

  const [purchaseOrderWebhookIsValid, setPurchaseOrderWebhookIsValid] = useState(true);

  const isValid = purchaseOrderWebhookIsValid;

  const fetch = useAuthenticatedFetch({ setToastAction });
  const settingsQuery = useSettingsQuery(
    { fetch },
    {
      refetchOnWindowFocus: false,
      onSuccess({ settings }) {
        setSettings(settings);
        setDefaultWorkOrderStatusValue(settings.defaultStatus);
        setDefaultPurchaseOrderStatusValue(settings.defaultPurchaseOrderStatus);
      },
      onError() {
        setToastAction({
          content: 'Could not load settings',
          action: {
            content: 'Retry',
            onAction() {
              settingsQuery.refetch();
            },
          },
        });
      },
    },
  );

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  const saveSettingsMutation = useSettingsMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({
          content: 'Saved settings',
        });
      },
    },
  );

  if (!settings) {
    return <Loading />;
  }

  const superuser = currentEmployeeQuery?.data?.superuser ?? false;
  const canWriteSettings = superuser || (currentEmployeeQuery?.data?.permissions?.includes('write_settings') ?? false);

  return (
    <>
      <TitleBar
        title="Settings"
        primaryAction={{
          content: 'Save',
          target: 'APP',
          loading: saveSettingsMutation.isLoading,
          disabled:
            settingsQuery.isLoading ||
            saveSettingsMutation.isLoading ||
            currentEmployeeQuery.isLoading ||
            !canWriteSettings ||
            !isValid,
          onAction() {
            saveSettingsMutation.mutate(settings);
          },
        }}
      />

      <BlockStack gap={{ xs: '800', sm: '400' }}>
        <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
          <DiscountSettings settings={settings} setSettings={setSettings} />
          <WorkOrderSettings
            settings={settings}
            setSettings={setSettings}
            defaultWorkOrderStatusValue={defaultWorkOrderStatusValue}
          />
          <PurchaseOrderSettings
            settings={settings}
            setSettings={setSettings}
            defaultPurchaseOrderStatusValue={defaultPurchaseOrderStatusValue}
          />
          <LabourSettings settings={settings} setSettings={setSettings} />
          <RatesSettings settings={settings} setSettings={setSettings} />
          <WorkOrderRequestSettings settings={settings} setSettings={setSettings} />
          <EmailSettings settings={settings} setSettings={setSettings} />
          <PrintSettings settings={settings} setSettings={setSettings} />
          <PurchaseOrderWebhookSettings
            settings={settings}
            setSettings={setSettings}
            onIsValid={setPurchaseOrderWebhookIsValid}
          />
        </InlineGrid>
      </BlockStack>

      {toast}
    </>
  );
}

function DiscountSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const [discountShortcutValue, setDiscountShortcutValue] = useState('');

  const discountRules = useDiscountRules(settings, setSettings, currencyFormatter);
  const activeDiscountRules = getActiveDiscountRules(settings);

  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Discounts
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <CurrencyOrPercentageInput
            value={discountShortcutValue}
            setValue={setDiscountShortcutValue}
            onSelect={unit => {
              setSettings({
                ...settings,
                discountShortcuts: [
                  ...settings.discountShortcuts,
                  {
                    currency: { unit: 'currency', money: discountShortcutValue as Money } as const,
                    percentage: { unit: 'percentage', percentage: discountShortcutValue as Decimal } as const,
                  }[unit],
                ],
              });
              setDiscountShortcutValue('');
            }}
          />
          <InlineStack gap="200">
            {settings.discountShortcuts.map((shortcut, i) => (
              <Tag
                key={i}
                onRemove={() =>
                  setSettings({
                    ...settings,
                    discountShortcuts: settings.discountShortcuts.filter((_, j) => i !== j),
                  })
                }
              >
                {shortcut.unit === 'currency' && currencyFormatter(shortcut.money)}
                {shortcut.unit === 'percentage' && `${shortcut.percentage}%`}
              </Tag>
            ))}
          </InlineStack>
          <RuleSet title="Discount Rules" rules={discountRules} activeRules={activeDiscountRules} />
        </BlockStack>
      </Card>
      {toast}
    </>
  );
}

function WorkOrderSettings({
  settings,
  setSettings,
  defaultWorkOrderStatusValue: initialDefaultWorkOrderStatusValue,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
  defaultWorkOrderStatusValue: string;
}) {
  const [workOrderStatusValue, setWorkOrderStatusValue] = useState('');
  const [defaultWorkOrderStatusValue, setDefaultWorkOrderStatusValue] = useState('');

  useEffect(() => {
    setDefaultWorkOrderStatusValue(initialDefaultWorkOrderStatusValue);
  }, [initialDefaultWorkOrderStatusValue]);

  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Work Orders
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <Autocomplete
            options={[]}
            selected={[]}
            textField={
              <Autocomplete.TextField
                label="Statuses"
                autoComplete="off"
                value={workOrderStatusValue}
                onChange={setWorkOrderStatusValue}
              />
            }
            onSelect={() => {}}
            actionBefore={
              workOrderStatusValue.length > 0
                ? {
                    content: `Create status "${workOrderStatusValue}"`,
                    prefix: <Icon source={CirclePlusMinor} />,
                    onAction: () => {
                      setSettings({
                        ...settings,
                        statuses: [...settings.statuses, workOrderStatusValue],
                      });
                      setWorkOrderStatusValue('');
                    },
                  }
                : undefined
            }
          />

          <InlineStack gap="200">
            {settings.statuses.map((status, i) => (
              <Tag
                key={i}
                onRemove={() =>
                  setSettings({
                    ...settings,
                    statuses: settings.statuses.filter((_, j) => i !== j),
                  })
                }
              >
                {status}
              </Tag>
            ))}
          </InlineStack>
          <Autocomplete
            options={settings.statuses.map(status => ({ id: status, label: status, value: status }))}
            selected={[settings.defaultStatus]}
            onSelect={([defaultStatus]) => {
              setSettings(current => ({
                ...current,
                defaultStatus: defaultStatus ?? current.defaultStatus,
              }));
              setDefaultWorkOrderStatusValue(defaultStatus ?? settings.defaultStatus);
            }}
            textField={
              <Autocomplete.TextField
                label="Default Status"
                autoComplete="off"
                requiredIndicator
                value={defaultWorkOrderStatusValue}
                onChange={setDefaultWorkOrderStatusValue}
                onBlur={() => setDefaultWorkOrderStatusValue(settings.defaultStatus)}
              />
            }
          />
          <TextField
            label="ID Format"
            autoComplete="off"
            requiredIndicator
            helpText={
              <>
                You can use variables by surrounding them in curly braces.
                <br />
                Available variables:{' '}
                <Text as="p" fontWeight="semibold">
                  {'{{id}}, {{year}}, {{month}}, {{day}}, {{hour}}, {{minute}}'}
                </Text>
              </>
            }
            value={settings.idFormat}
            onChange={value =>
              setSettings({
                ...settings,
                idFormat: value,
              })
            }
          />
        </BlockStack>
      </Card>
    </>
  );
}

function PurchaseOrderSettings({
  settings,
  setSettings,
  defaultPurchaseOrderStatusValue: initialDefaultPurchaseOrderStatusValue,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
  defaultPurchaseOrderStatusValue: string;
}) {
  const [purchaseOrderStatusValue, setPurchaseOrderStatusValue] = useState('');
  const [defaultPurchaseOrderStatusValue, setDefaultPurchaseOrderStatusValue] = useState('');

  useEffect(() => {
    setDefaultPurchaseOrderStatusValue(initialDefaultPurchaseOrderStatusValue);
  }, [initialDefaultPurchaseOrderStatusValue]);

  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Purchase Orders
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <Autocomplete
            options={[]}
            selected={[]}
            textField={
              <Autocomplete.TextField
                label="Statuses"
                autoComplete="off"
                value={purchaseOrderStatusValue}
                onChange={setPurchaseOrderStatusValue}
              />
            }
            onSelect={() => {}}
            actionBefore={
              purchaseOrderStatusValue.length > 0
                ? {
                    content: `Create status "${purchaseOrderStatusValue}"`,
                    prefix: <Icon source={CirclePlusMinor} />,
                    onAction: () => {
                      setSettings({
                        ...settings,
                        purchaseOrderStatuses: [...settings.purchaseOrderStatuses, purchaseOrderStatusValue],
                      });
                      setPurchaseOrderStatusValue('');
                    },
                  }
                : undefined
            }
          />

          <InlineStack gap="200">
            {settings.purchaseOrderStatuses.map((status, i) => (
              <Tag
                key={i}
                onRemove={() =>
                  setSettings({
                    ...settings,
                    purchaseOrderStatuses: settings.purchaseOrderStatuses.filter((_, j) => i !== j),
                  })
                }
              >
                {status}
              </Tag>
            ))}
          </InlineStack>
          <Autocomplete
            options={settings.purchaseOrderStatuses.map(status => ({ id: status, label: status, value: status }))}
            selected={[settings.defaultPurchaseOrderStatus]}
            onSelect={([defaultPurchaseOrderStatus]) => {
              setSettings(current => ({
                ...current,
                defaultPurchaseOrderStatus: defaultPurchaseOrderStatus ?? current.defaultPurchaseOrderStatus,
              }));
              setDefaultPurchaseOrderStatusValue(defaultPurchaseOrderStatus ?? settings.defaultPurchaseOrderStatus);
            }}
            textField={
              <Autocomplete.TextField
                label="Default Status"
                autoComplete="off"
                requiredIndicator
                value={defaultPurchaseOrderStatusValue}
                onChange={setDefaultPurchaseOrderStatusValue}
                onBlur={() => setDefaultPurchaseOrderStatusValue(settings.defaultPurchaseOrderStatus)}
              />
            }
          />
          <TextField
            label="ID Format"
            autoComplete="off"
            requiredIndicator
            helpText={
              <>
                You can use variables by surrounding them in curly braces.
                <br />
                Available variables:{' '}
                <Text as="p" fontWeight="semibold">
                  {'{{id}}, {{year}}, {{month}}, {{day}}, {{hour}}, {{minute}}'}
                </Text>
              </>
            }
            value={settings.purchaseOrderIdFormat}
            onChange={value =>
              setSettings({
                ...settings,
                purchaseOrderIdFormat: value,
              })
            }
          />
        </BlockStack>
      </Card>
    </>
  );
}

function LabourSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Labour
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <CollectionPicker
            label={'Fixed-Price Services Collection'}
            initialCollectionId={settings.fixedServiceCollectionId}
            onSelect={collectionId => setSettings({ ...settings, fixedServiceCollectionId: collectionId })}
          />
          <CollectionPicker
            label={'Dynamically-Priced Services Collection'}
            initialCollectionId={settings.mutableServiceCollectionId}
            onSelect={collectionId => setSettings({ ...settings, mutableServiceCollectionId: collectionId })}
          />
          <TextField
            label={'Default Labour Line Item Name'}
            autoComplete={'off'}
            value={settings.labourLineItemName}
            onChange={value => setSettings({ ...settings, labourLineItemName: value })}
          />
          <TextField
            label={'Labour Line Item SKU'}
            autoComplete={'off'}
            value={settings.labourLineItemSKU}
            onChange={value => setSettings({ ...settings, labourLineItemSKU: value })}
          />
          <BlockStack>
            <Text as={'p'}>Enabled Labour Options</Text>
            <Checkbox
              label={'Employee Assignments'}
              checked={settings.chargeSettings.employeeAssignments}
              onChange={enabled =>
                setSettings({
                  ...settings,
                  chargeSettings: { ...settings.chargeSettings, employeeAssignments: enabled },
                })
              }
            />
            <Checkbox
              label={'Hourly Labour'}
              checked={settings.chargeSettings.hourlyLabour}
              onChange={enabled =>
                setSettings({
                  ...settings,
                  chargeSettings: { ...settings.chargeSettings, hourlyLabour: enabled },
                })
              }
            />
            <Checkbox
              label={'Fixed-Price Labour'}
              checked={settings.chargeSettings.fixedPriceLabour}
              onChange={enabled =>
                setSettings({
                  ...settings,
                  chargeSettings: { ...settings.chargeSettings, fixedPriceLabour: enabled },
                })
              }
            />
          </BlockStack>
        </BlockStack>
      </Card>
    </>
  );
}

function RatesSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Rates
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <NumberField
            decimals={2}
            type={'number'}
            label={'Default hourly rate'}
            value={String(settings.defaultRate)}
            prefix={currencyFormatter.prefix}
            suffix={currencyFormatter.suffix}
            step={0.01}
            largeStep={1}
            min={0}
            inputMode={'decimal'}
            requiredIndicator
            onChange={(value: Money) => setSettings({ ...settings, defaultRate: value })}
            autoComplete={'off'}
            helpText={'Used for employees without a set hourly rate'}
          />
        </BlockStack>
      </Card>
      {toast}
    </>
  );
}

function WorkOrderRequestSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Work Order Requests
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <Checkbox
            label={'Enable work order requests'}
            checked={settings.workOrderRequests.enabled}
            onChange={enabled =>
              setSettings({
                ...settings,
                workOrderRequests: enabled ? { enabled, status: settings.statuses[0]! } : { enabled, status: null },
              })
            }
          />
          <Select
            label={'Request Status'}
            helpText={'The status that work order requests will be set to when created'}
            disabled={!settings.workOrderRequests.enabled}
            options={settings.statuses}
            placeholder={'Select a status'}
            value={settings.workOrderRequests?.status ?? undefined}
            onChange={status =>
              setSettings({
                ...settings,
                workOrderRequests: {
                  enabled: true,
                  status,
                },
              })
            }
          />
        </BlockStack>
      </Card>
    </>
  );
}

function EmailSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Email Settings
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <TextField
            label={'From Title'}
            autoComplete={'off'}
            value={settings.emailFromTitle}
            onChange={value => setSettings({ ...settings, emailFromTitle: value })}
            helpText={'The name that will appear in the From field of emails sent from WorkMate'}
          />
          <TextField
            label={'Reply To'}
            autoComplete={'off'}
            value={settings.emailReplyTo}
            onChange={value => setSettings({ ...settings, emailReplyTo: value })}
            helpText={'The email address that will appear in the Reply-To field of emails sent from WorkMate'}
          />
        </BlockStack>
      </Card>
    </>
  );
}

function PrintSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  // one part for purchase order print templates, and one for work order print templates. subject should be text field and template text area

  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Print Settings
          </Text>
        </BlockStack>
      </Box>
      <BlockStack gap="400">
        <Card roundedAbove="sm">
          <BlockStack gap="400">
            <TextField
              label={'Print Email'}
              autoComplete={'off'}
              value={settings.printEmail}
              onChange={value => setSettings({ ...settings, printEmail: value })}
              helpText={'The email address that WorkMate will send print jobs to'}
            />
          </BlockStack>
        </Card>
        <PrintTemplateGroup settings={settings} setSettings={setSettings} templateType={'workOrderPrintTemplates'} />
        <PrintTemplateGroup
          settings={settings}
          setSettings={setSettings}
          templateType={'purchaseOrderPrintTemplates'}
        />
      </BlockStack>
    </>
  );
}

/**
 * A group of print templates. Includes a description of variables that can be used within the template.
 */
function PrintTemplateGroup({
  settings,
  setSettings,
  templateType,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
  templateType: 'workOrderPrintTemplates' | 'purchaseOrderPrintTemplates';
}) {
  const templates = settings[templateType];
  const title = string.titleCase(templateType);

  const [modalOpened, setModalOpened] = useState(false);

  const availableVariables = {
    workOrderPrintTemplates: {
      '{{ name }}': 'The name of the work order',
      '{{ date }}': 'The current date',
      '{{ status }}': 'The status of the work order',
      '{{ shopifyOrderNames }}': 'A list of the names of the shopify orders that are linked to this work order',
      '{{ purchaseOrderNames }}': 'A list of the names of the purchase orders that are linked to this work order',
      '{{ fullyPaid }}': 'Whether the work order has been fully paid for',
      '{{ customer.name }}': 'The name of the customer',
      '{{ customer.email }}': 'The email address of the customer',
      '{{ customer.phone }}': 'The phone number of the customer',
      '{{ customer.address }}': 'The address of the customer',
      '{{ items[x].name }}': 'The name of the item at index x',
      '{{ items[x].description }}': 'The description of the item at index x',
      '{{ items[x].sku }}': 'The SKU of the item at index x',
      '{{ items[x].shopifyOrderName }}': 'The name of the shopify order that the item is in at index x',
      '{{ items[x].purchaseOrderNames }}': 'The name of the purchase orders that the item is in at index x',
      '{{ items[x].quantity }}': 'The quantity of the item at index x',
      '{{ items[x].originalUnitPrice }}': 'The original unit price of the item at index x',
      '{{ items[x].discountedUnitPrice }}': 'The discounted unit price of the item at index x',
      '{{ items[x].originalTotalPrice }}': 'The original total price of the item at index x',
      '{{ items[x].discountedTotalPrice }}': 'The discounted total price of the item at index x',
      '{{ items[x].fullyPaid }}': 'Whether the item at index x has been fully paid for',
      '{{ items[x].purchaseOrderQuantities.orderedQuantity }}':
        'The quantity of this item that has been ordered in linked purchase orders',
      '{{ items[x].purchaseOrderQuantities.availableQuantity }}':
        'The quantity of this item ordered in linked purchase orders that is now available',
      '{{ items[x].charges[y].name }}': 'The name of the charge at index y of the item at index x',
      '{{ items[x].charges[y].shopifyOrderName }}':
        'The name of the shopify order that the charge is in at index y of the item at index x',
      '{{ items[x].charges[y].details }}': 'Additional details about the charge at index y of the item at index x',
      '{{ items[x].charges[y].totalPrice }}': 'The total price of the charge at index y of the item at index x',
      '{{ items[x].charges[y].fullyPaid }}':
        'Whether the charge at index y of the item at index x has been fully paid for',
      '{{ tax }}': 'The total tax of the work order',
      '{{ subtotal }}': 'The total subtotal of the work order',
      '{{ total }}': 'The total of the work order',
      '{{ outstanding }}': 'The amount that still has to be paid',
      '{{ paid }}': 'The amount that has been paid already',
      '{{ customFields.x }}': 'The value of the custom field with key x',
      '{{ charges[x].name }}': 'The name of the charge at index x',
      '{{ charges[x].shopifyOrderName }}': 'The name of the shopify order that the charge is in at index x',
      '{{ charges[x].details }}': 'Additional details about the charge at index x',
      '{{ charges[x].totalPrice }}': 'The total price of the charge at index x',
      '{{ charges[x].fullyPaid }}': 'Whether the charge at index x has been fully paid for',
    },
    purchaseOrderPrintTemplates: {
      '{{ name }}': 'The name of the purchase order',
      '{{ date }}': 'The current date',
      '{{ shipFrom }}': 'The address the purchase order will be shipped from',
      '{{ shipTo }}': 'The address the purchase order will be shipped to',
      '{{ locationName }}': 'The name of the location the purchase order is in',
      '{{ vendorName }}': 'The name of the vendor the purchase order is for',
      '{{ note }}': 'The note of the purchase order',
      '{{ discount }}': 'The discount amount of the purchase order',
      '{{ tax }}': 'The tax expense of the purchase order',
      '{{ shipping }}': 'The shipping cost of the purchase order',
      '{{ deposited }}': 'The amount deposited for the purchase order',
      '{{ paid }}': 'The amount paid for the purchase order',
      '{{ status }}': 'The status of the purchase order',
      '{{ customFields.x }}': 'The value of the custom field with key x',
      '{{ lineItems[x].name }}': 'The name of the line item at index x',
      '{{ lineItems[x].unitCost }}': 'The unit cost of the line item at index x',
      '{{ lineItems[x].quantity }}': 'The quantity of the line item at index x',
      '{{ lineItems[x].totalCost }}': 'The total cost of the line item at index x',
    },
  }[templateType];

  return (
    <Card roundedAbove="sm">
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">
          {title}
        </Text>

        <Modal
          activator={
            <Button onClick={() => setModalOpened(true)} variant={'plain'}>
              View Template Variables
            </Button>
          }
          open={modalOpened}
          title={`${title} - Available Variables`}
          onClose={() => setModalOpened(false)}
          size={'large'}
        >
          <Modal.Section>
            <DescriptionList
              items={Object.entries(availableVariables).map(([term, description]) => ({
                term,
                description,
              }))}
            />
          </Modal.Section>
        </Modal>

        {Object.entries(templates).map(([name, template]) => (
          <PrintTemplate
            key={name}
            name={name}
            template={template.template}
            subject={template.subject}
            setTemplate={(template: string) =>
              setSettings({
                ...settings,
                [templateType]: { ...settings[templateType], [name]: { ...settings[templateType][name], template } },
              })
            }
            setSubject={(subject: string) => {
              setSettings({
                ...settings,
                [templateType]: { ...settings[templateType], [name]: { ...settings[templateType][name], subject } },
              });
            }}
            onRemove={() => {
              const groupContent = { ...settings[templateType] };
              delete groupContent[name];
              setSettings({
                ...settings,
                [templateType]: groupContent,
              });
            }}
            setName={(newName: string) => {
              const groupContent = { ...settings[templateType], [newName]: settings[templateType][name] };
              delete groupContent[name];
              setSettings({
                ...settings,
                [templateType]: groupContent,
              });
            }}
          />
        ))}
        <Button
          onClick={() => {
            let name = 'New Template';
            if (name in settings[templateType]) {
              let i = 2;
              while (`${name} (${i})` in settings[templateType]) {
                i++;
              }
              name = `${name} (${i})`;
            }
            setSettings({
              ...settings,
              [templateType]: {
                ...settings[templateType],
                [name]: {
                  template: '',
                  subject: '',
                },
              },
            });
          }}
        >
          New Template
        </Button>
      </BlockStack>
    </Card>
  );
}

/**
 * Configuration for a specific print template.
 */
function PrintTemplate({
  name,
  template,
  subject,
  setName,
  setTemplate,
  setSubject,
  onRemove,
}: {
  name: string;
  template: string;
  subject: string;
  setName: (name: string) => void;
  setTemplate: (template: string) => void;
  setSubject: (subject: string) => void;
  onRemove: () => void;
}) {
  return (
    <Card roundedAbove="sm">
      <BlockStack gap="400">
        <TextField label="Name" autoComplete="off" value={name} onChange={setName} />
        <TextField label={`Subject`} autoComplete={'off'} value={subject} onChange={value => setSubject(value)} />
        <TextField
          label={`Template`}
          autoComplete={'off'}
          multiline
          maxHeight={350}
          value={template}
          onChange={value => setTemplate(value)}
        />
        <Button onClick={onRemove} tone={'critical'}>
          Remove
        </Button>
      </BlockStack>
    </Card>
  );
}

function PurchaseOrderWebhookSettings({
  settings,
  setSettings,
  onIsValid,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
  onIsValid: (isValid: boolean) => void;
}) {
  function getErrorMessage(endpointUrl: string | null) {
    if (endpointUrl === null) {
      return undefined;
    }

    try {
      new URL(endpointUrl);
    } catch (error) {
      return 'Invalid URL';
    }

    return undefined;
  }

  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Purchase Order Webhook
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <Checkbox
            label={'Enable purchase order webhook order requests'}
            checked={settings.purchaseOrderWebhook.endpointUrl !== null}
            onChange={enabled => {
              setSettings({
                ...settings,
                purchaseOrderWebhook: {
                  endpointUrl: enabled ? '' : null,
                },
              });
              onIsValid(!enabled);
            }}
          />
          <TextField
            label={'Webhook Endpoint URL'}
            autoComplete="off"
            value={settings.purchaseOrderWebhook.endpointUrl ?? ''}
            disabled={settings.purchaseOrderWebhook.endpointUrl === null}
            onChange={value => {
              setSettings({
                ...settings,
                purchaseOrderWebhook: {
                  endpointUrl: value,
                },
              });
              onIsValid(getErrorMessage(settings.purchaseOrderWebhook.endpointUrl) === undefined);
            }}
            error={getErrorMessage(settings.purchaseOrderWebhook.endpointUrl)}
          />
        </BlockStack>
      </Card>
    </>
  );
}

const useCurrencyRangeBounds = (initialCurrencyRangeBounds: [number, number] = [100, 100]) => {
  const CURRENCY_RANGE_MAX_GROWTH_RATE = 1.25;

  const [min, initialMax] = initialCurrencyRangeBounds;

  const getMaxBound = (currentUpperBound: number) =>
    Math.round(Math.max(currentUpperBound * CURRENCY_RANGE_MAX_GROWTH_RATE, initialMax));

  const [max, setMax] = useDebouncedState(getMaxBound(initialMax));

  const update = ([, upper]: [number, number]) => {
    setMax(getMaxBound(upper));
  };

  return { min, max, update };
};

function useDiscountRules(
  settings: ShopSettings | null,
  setSettings: (settings: ShopSettings) => void,
  currencyFormatter: CurrencyFormatter,
): Rule[] {
  const initialCurrencyRangeBounds = [0, 100] as [number, number];
  const currencyRangeBounds = useCurrencyRangeBounds(initialCurrencyRangeBounds);

  if (!settings) {
    return [];
  }

  return [
    {
      value: ONLY_SHORTCUTS,
      title: 'Only allow discount shortcuts',
      conflictingRules: [CURRENCY_RANGE, PERCENTAGE_RANGE],
      onSelect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: true,
            allowedCurrencyRange: null,
            allowedPercentageRange: null,
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: false,
          },
        });
      },
    },
    {
      value: CURRENCY_RANGE,
      title: 'Restrict discounts to a range',
      conflictingRules: [ONLY_SHORTCUTS],
      onSelect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: false,
            allowedCurrencyRange: [
              initialCurrencyRangeBounds[0].toFixed(2) as Money,
              initialCurrencyRangeBounds[1].toFixed(2) as Money,
            ],
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            allowedCurrencyRange: null,
          },
        });
      },
      renderChildren() {
        invariant(settings.discountRules.allowedCurrencyRange, 'No currency range set');

        return (
          <AnnotatedRangeSlider
            label="Allowed discount range"
            labelHidden
            min={currencyRangeBounds.min}
            max={currencyRangeBounds.max}
            step={1}
            formatter={currencyFormatter}
            value={
              [
                Number(settings.discountRules.allowedCurrencyRange[0]),
                Number(settings.discountRules.allowedCurrencyRange[1]),
              ] as [number, number]
            }
            onChange={(allowedCurrencyRange: [number, number]) => {
              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedCurrencyRange: [
                    allowedCurrencyRange[0].toFixed(2) as Money,
                    allowedCurrencyRange[1].toFixed(2) as Money,
                  ],
                },
              });

              currencyRangeBounds.update(allowedCurrencyRange);
            }}
          />
        );
      },
    },
    {
      value: PERCENTAGE_RANGE,
      title: 'Restrict discounts to a percentage range',
      conflictingRules: [ONLY_SHORTCUTS],
      onSelect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: false,
            allowedPercentageRange: [BigDecimal.ZERO.toDecimal(), BigDecimal.fromString('100').toDecimal()],
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            allowedPercentageRange: null,
          },
        });
      },
      renderChildren() {
        invariant(settings.discountRules.allowedPercentageRange, 'No percentage range set');

        return (
          <AnnotatedRangeSlider
            label="Allowed discount percentage range"
            labelHidden
            min={0}
            max={100}
            step={1}
            formatter={num => `${num}%`}
            value={[
              Number(settings.discountRules.allowedPercentageRange[0]),
              Number(settings.discountRules.allowedPercentageRange[1]),
            ]}
            onChange={(allowedPercentageRange: [number, number]) =>
              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedPercentageRange: [
                    BigDecimal.fromString(String(allowedPercentageRange[0])).toDecimal(),
                    BigDecimal.fromString(String(allowedPercentageRange[1])).toDecimal(),
                  ],
                },
              })
            }
          />
        );
      },
    },
  ];
}

function getActiveDiscountRules(settings: ShopSettings) {
  const activeRules: string[] = [];

  if (settings.discountRules.onlyAllowShortcuts) {
    activeRules.push(ONLY_SHORTCUTS);
  } else {
    if (settings.discountRules.allowedCurrencyRange) {
      activeRules.push(CURRENCY_RANGE);
    }
    if (settings.discountRules.allowedPercentageRange) {
      activeRules.push(PERCENTAGE_RANGE);
    }
  }

  return activeRules;
}

function CurrencyOrPercentageInput({
  value,
  setValue,
  onSelect,
}: {
  value: string;
  setValue: (value: string) => void;
  onSelect: (unit: 'percentage' | 'currency') => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  return (
    <>
      <Combobox
        activator={
          <Combobox.TextField
            type="number"
            label="Discount Shortcuts"
            autoComplete="off"
            value={value}
            onChange={setValue}
          />
        }
      >
        {value.length > 0 ? (
          <Listbox onSelect={onSelect}>
            <Listbox.Option value={'currency'}>{currencyFormatter(Number(value))}</Listbox.Option>
            <Listbox.Option value={'percentage'}>{value + '%'}</Listbox.Option>
          </Listbox>
        ) : null}
      </Combobox>
      {toast}
    </>
  );
}

function CollectionPicker({
  label,
  helpText,
  onSelect,
  initialCollectionId,
}: {
  label: string;
  helpText?: string;
  initialCollectionId?: ID | null;
  onSelect: (collectionId: ID | null) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery] = useState('');
  const collectionsQuery = useCollectionsQuery({ fetch, params: { query } });

  const [selectedCollectionId, setSelectedCollectionId] = useState<ID | null>(initialCollectionId ?? null);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);

  useEffect(() => {
    if (query) return;
    if (!selectedCollectionId) return;

    const selectedCollection = collectionsQuery.data?.pages.flat(1).find(page => page.id === selectedCollectionId);
    if (!selectedCollection) return;

    setSelectedCollectionName(selectedCollection.title);
    setQuery(selectedCollection.title);
  }, [collectionsQuery.data?.pages]);

  return (
    <>
      <Autocomplete
        options={
          collectionsQuery.data?.pages.flat().map(page => ({
            label: page.title,
            value: page.id,
          })) ?? []
        }
        allowMultiple={false}
        loading={collectionsQuery.isLoading}
        willLoadMoreResults={collectionsQuery.hasNextPage}
        onLoadMoreResults={collectionsQuery.fetchNextPage}
        selected={selectedCollectionId ? [selectedCollectionId] : []}
        emptyState={
          <BlockStack inlineAlign={'center'}>
            <Icon source={SearchMinor} />
            Could not find any collections
          </BlockStack>
        }
        textField={
          <Autocomplete.TextField
            label={label}
            helpText={helpText}
            autoComplete="off"
            value={query}
            onChange={setQuery}
            onBlur={() => setQuery(selectedCollectionName ?? '')}
          />
        }
        onSelect={([id]: ID[]) => {
          let name: string | null = null;
          let serviceCollectionId: ID | null = null;

          if (id !== undefined && id !== selectedCollectionId) {
            name = collectionsQuery.data?.pages.flat(1).find(page => page.id === id)?.title ?? '';
            serviceCollectionId = id;
          }

          setSelectedCollectionName(name ?? '');
          setSelectedCollectionId(serviceCollectionId ?? null);
          setQuery(name ?? '');
          onSelect(serviceCollectionId);
        }}
      />
      {toast}
    </>
  );
}
