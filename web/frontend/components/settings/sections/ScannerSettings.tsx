import { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction, useEffect, useId, useState } from 'react';
import {
  Banner,
  BlockStack,
  Button,
  Checkbox,
  Collapsible,
  Icon,
  InlineStack,
  ProgressBar,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useScanVariantMetafieldsQuery } from '@work-orders/common/queries/use-scan-variant-metafields-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useSyncProductMetafieldsMutation } from '@work-orders/common/queries/use-sync-product-metafields-mutation.js';
import { useSyncVariantMetafieldsMutation } from '@work-orders/common/queries/use-sync-variant-metafields-mutation.js';
import { useSyncProductMetafieldsTaskQuery } from '@work-orders/common/queries/use-sync-product-metafields-task-query.js';
import { useSyncVariantMetafieldsTaskQuery } from '@work-orders/common/queries/use-sync-variant-metafields-task-query.js';
import { SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { SearchMinor } from '@shopify/polaris-icons';
import { Fetch } from '@work-orders/common/queries/fetch.js';
import { useDebounce } from '@uidotdev/usehooks';

const SHOW_LESS_AMOUNT = 5;

export function ScannerSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const scanVariantMetafieldsQuery = useScanVariantMetafieldsQuery({ fetch });

  const syncMetafieldsMutation = useSyncTaskMutation(fetch);
  const syncMetafieldsTaskQuery = useSyncTaskQuery(fetch, syncMetafieldsMutation.isPending);

  useEffect(() => {
    if (syncMetafieldsMutation.isSuccess && syncMetafieldsTaskQuery.isSuccess) {
      setToastAction({
        content: 'Metafields re-indexed successfully!',
      });
    }
  }, [syncMetafieldsMutation.isSuccess, syncMetafieldsTaskQuery.isSuccess]);

  // remember the last-known progress max >= 1 so we don't suddenly display 0 / 0 when the task finishes
  const [lastKnownProgressMax, setLastKnownProgressMax] = useState(0);

  useEffect(() => {
    if (syncMetafieldsTaskQuery.progressMax >= 1) {
      setLastKnownProgressMax(syncMetafieldsTaskQuery.progressMax);
    }
  }, [syncMetafieldsTaskQuery.progressMax]);

  // debounce makes sure to show the progress bar after the task has finished.
  // this ensures that the user sees it fill to 100% before it disappears
  const shouldShowSyncProgress =
    useDebounce(syncMetafieldsTaskQuery.isSyncing, 1000) || syncMetafieldsTaskQuery.isSyncing;

  const metafieldsSpinner = scanVariantMetafieldsQuery.isLoading && <Spinner />;
  const metafieldsError = scanVariantMetafieldsQuery.error && (
    <Banner
      title="Error loading metafields"
      tone="critical"
      action={{
        onAction: () => scanVariantMetafieldsQuery.refetch(),
        content: 'Retry',
      }}
    >
      {extractErrorMessage(scanVariantMetafieldsQuery.error, 'Unknown error')}
    </Banner>
  );

  const productMetafieldChoices =
    scanVariantMetafieldsQuery.data?.product.map(metafield => ({
      label: metafield.name,
      helpText: metafield.description ?? undefined,
      value: `${metafield.namespace}.${metafield.key}`,
    })) ?? [];

  const variantMetafieldChoices =
    scanVariantMetafieldsQuery.data?.variant.map(metafield => ({
      label: metafield.name,
      helpText: metafield.description ?? undefined,
      value: `${metafield.namespace}.${metafield.key}`,
    })) ?? [];

  const collapsibleId = useId();

  return (
    <BlockStack gap="400">
      <BlockStack gap="200">
        <Text as="h2" variant="headingMd" fontWeight="bold">
          Scanner
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          The WorkMate scanner allows you to scan products using more than just their barcodes. You can scan products by
          their SKU, tags, or by product metafields.
        </Text>
      </BlockStack>

      <Checkbox
        label={'Barcodes'}
        checked={settings.scanner.variants.barcode}
        onChange={barcode =>
          setSettings({
            ...settings,
            scanner: { ...settings.scanner, variants: { ...settings.scanner.variants, barcode } },
          })
        }
      />
      <Checkbox
        label={'SKUs'}
        checked={settings.scanner.variants.sku}
        onChange={sku =>
          setSettings({
            ...settings,
            scanner: { ...settings.scanner, variants: { ...settings.scanner.variants, sku } },
          })
        }
      />
      <Checkbox
        label={'Tags'}
        checked={settings.scanner.variants.tags}
        onChange={tags =>
          setSettings({
            ...settings,
            scanner: { ...settings.scanner, variants: { ...settings.scanner.variants, tags } },
          })
        }
      />

      <BlockStack gap="200">
        <Text as="h2" variant="headingMd" fontWeight="bold">
          Metafields
        </Text>

        <Text as="p" variant="bodyMd" tone="subdued">
          WorkMate indexes product metafields to allow you to scan products by their metafield values. We currently
          support single line text product metafields.
        </Text>

        <Text as="p" variant="bodySm" tone="subdued">
          Notice any un-indexed metafields?{' '}
          <Button
            variant="plain"
            onClick={() => {
              syncMetafieldsMutation.mutate();
              setToastAction({
                content: 'Re-indexing metafields...',
              });
            }}
            disabled={shouldShowSyncProgress}
          >
            Click here to re-index metafields
          </Button>
        </Text>

        <Collapsible id={collapsibleId} open={shouldShowSyncProgress}>
          <InlineStack gap="200">
            <ProgressBar
              progress={syncMetafieldsTaskQuery.isSyncing ? syncMetafieldsTaskQuery.progressPercentage : 100}
            />
            <Text as="p" variant="bodyMd" tone="subdued">
              {syncMetafieldsTaskQuery.isSyncing
                ? syncMetafieldsTaskQuery.progress.toFixed(0)
                : lastKnownProgressMax.toFixed(0)}{' '}
              / {lastKnownProgressMax.toFixed(0)} metafields
            </Text>
          </InlineStack>
        </Collapsible>
      </BlockStack>

      <SearchableChoiceList
        title="Product Metafields"
        choices={productMetafieldChoices}
        onChange={product =>
          setSettings({
            ...settings,
            scanner: {
              ...settings.scanner,
              variants: {
                ...settings.scanner.variants,
                metafields: { ...settings.scanner.variants.metafields, product },
              },
            },
          })
        }
        selected={settings.scanner.variants.metafields.product}
        resourceName={{ singular: 'metafield', plural: 'metafields' }}
        limit={SHOW_LESS_AMOUNT}
        searchable
      />
      {metafieldsSpinner}
      {metafieldsError}

      {/*<SearchableChoiceList*/}
      {/*  title="Product Variant Metafields"*/}
      {/*  choices={variantMetafieldChoices}*/}
      {/*  onChange={variant =>*/}
      {/*    setSettings({*/}
      {/*      ...settings,*/}
      {/*      scanner: {*/}
      {/*        ...settings.scanner,*/}
      {/*        variants: {*/}
      {/*          ...settings.scanner.variants,*/}
      {/*          metafields: { ...settings.scanner.variants.metafields, variant },*/}
      {/*        },*/}
      {/*      },*/}
      {/*    })*/}
      {/*  }*/}
      {/*  selected={settings.scanner.variants.metafields.variant}*/}
      {/*  resourceName={{ singular: 'metafield', plural: 'metafields' }}*/}
      {/*  limit={SHOW_LESS_AMOUNT}*/}
      {/*  searchable*/}
      {/*/>*/}
      {/*{metafieldsSpinner}*/}
      {/*{metafieldsError}*/}

      {toast}
    </BlockStack>
  );
}

type Choice = {
  label: string;
  helpText?: string;
  value: string;
};

/**
 * Choice list + searching + "show more/less" buttons
 */
function SearchableChoiceList({
  searchable = false,
  limit = Infinity,

  title,
  choices,
  selected,
  onChange,
  resourceName = { singular: 'choice', plural: 'choices' },
}: {
  title: string;
  limit?: number;
  searchable?: boolean;
  choices: Choice[];
  selected: string[];
  onChange: (selected: string[]) => void;
  resourceName?: { singular: string; plural: string };
}) {
  const [query, setQuery] = useState('');
  const [displayHiddenChoices, setDisplayHiddenChoices] = useState(false);

  const queryFilter = (choice: Choice) => {
    return (
      choice.value.toLowerCase().includes(query.toLowerCase()) ||
      choice.label.toLowerCase().includes(query.toLowerCase()) ||
      choice.helpText?.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filteredChoices = choices.filter(choice => !searchable || !query || queryFilter(choice));
  const shownChoices = filteredChoices.slice(0, limit);
  const hiddenChoices = filteredChoices.slice(limit);

  const renderChoice = (choice: Choice) => (
    <Checkbox
      label={choice.label}
      value={choice.value}
      helpText={choice.helpText}
      checked={selected.includes(choice.value)}
      onChange={checked => {
        if (checked) {
          onChange([...selected, choice.value]);
        } else {
          onChange(selected.filter(v => v !== choice.value));
        }
      }}
    />
  );

  const collapsibleId = useId();

  return (
    <BlockStack gap="200">
      <Text as="h2" variant="headingMd" fontWeight="bold">
        {title}
      </Text>

      <TextField
        label={'Search'}
        labelHidden
        autoComplete="off"
        value={query}
        onChange={setQuery}
        size="slim"
        placeholder={`Search ${resourceName.plural}`}
        clearButton
        onClearButtonClick={() => setQuery('')}
        prefix={<Icon source={SearchMinor} tone="base" />}
      />

      {shownChoices.length === 0 && (
        <Text as="p" variant="bodyMd" tone="subdued">
          No {resourceName.plural} found
        </Text>
      )}

      {shownChoices.map(renderChoice)}

      <Collapsible id={collapsibleId} open={hiddenChoices.length > 0 && displayHiddenChoices}>
        <BlockStack gap="200">{hiddenChoices.map(renderChoice)}</BlockStack>
      </Collapsible>

      {displayHiddenChoices && hiddenChoices.length > 0 && (
        <InlineStack>
          <Button onClick={() => setDisplayHiddenChoices(false)} variant="plain">
            Show less
          </Button>
        </InlineStack>
      )}

      {!displayHiddenChoices && hiddenChoices.length > 0 && (
        <InlineStack>
          <Button onClick={() => setDisplayHiddenChoices(true)} variant="plain">
            Show more ({hiddenChoices.length.toString()})
          </Button>
        </InlineStack>
      )}
    </BlockStack>
  );
}

/**
 * Combines product and variant metafield sync.
 */
function useSyncTaskQuery(fetch: Fetch, mutationIsPending: boolean) {
  const [refetchInterval, setRefetchInterval] = useState(5 * SECOND_IN_MS);

  const syncProductMetafieldsTaskQuery = useSyncProductMetafieldsTaskQuery({ fetch }, { refetchInterval });
  const syncVariantMetafieldsTaskQuery = useSyncVariantMetafieldsTaskQuery({ fetch }, { refetchInterval });

  const isSyncing = mutationIsPending || !!syncProductMetafieldsTaskQuery.data || !!syncVariantMetafieldsTaskQuery.data;

  useEffect(() => {
    if (isSyncing) {
      setRefetchInterval(1 * SECOND_IN_MS);
    } else {
      setRefetchInterval(5 * SECOND_IN_MS);
    }
  }, [isSyncing]);

  const progress = [
    syncProductMetafieldsTaskQuery.data?.progress ?? 0,
    syncVariantMetafieldsTaskQuery.data?.progress ?? 0,
  ].reduce((a, b) => a + b, 0);

  const progressMax = [
    syncProductMetafieldsTaskQuery.data?.progressMax ?? Number.EPSILON,
    syncVariantMetafieldsTaskQuery.data?.progressMax ?? Number.EPSILON,
  ].reduce((a, b) => a + b, 0);

  return {
    isLoading: syncProductMetafieldsTaskQuery.isLoading || syncVariantMetafieldsTaskQuery.isLoading,
    isSuccess: syncProductMetafieldsTaskQuery.isSuccess && syncVariantMetafieldsTaskQuery.isSuccess,
    isError: syncProductMetafieldsTaskQuery.isError || syncVariantMetafieldsTaskQuery.isError,
    error: syncProductMetafieldsTaskQuery.error || syncVariantMetafieldsTaskQuery.error,
    isSyncing,
    progress: progress,
    progressMax: progressMax,
    progressPercentage: (100 * progress) / progressMax,
  };
}

function useSyncTaskMutation(fetch: Fetch) {
  const syncProductMetafieldsMutation = useSyncProductMetafieldsMutation({ fetch });
  const syncVariantMetafieldsMutation = useSyncVariantMetafieldsMutation({ fetch });

  return {
    isPending: syncProductMetafieldsMutation.isPending || syncVariantMetafieldsMutation.isPending,
    isSuccess: syncProductMetafieldsMutation.isSuccess && syncVariantMetafieldsMutation.isSuccess,
    isError: syncProductMetafieldsMutation.isError || syncVariantMetafieldsMutation.isError,
    error: syncProductMetafieldsMutation.error || syncVariantMetafieldsMutation.error,
    mutate: () => {
      syncProductMetafieldsMutation.mutate();
      syncVariantMetafieldsMutation.mutate();
    },
  };
}
