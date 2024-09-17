import {
  reactExtension,
  useApi,
  BlockStack,
  Text,
  AdminBlock,
  Form,
  InlineStack,
  ChoiceList,
  Badge,
  Icon,
  Pressable,
  TextField,
  Select,
  Section,
  ProgressIndicator,
  Button,
  Checkbox,
} from '@shopify/ui-extensions-react/admin';
import { isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useEffect, useState } from 'react';
import { getAvailableMetafieldDefinitions } from './utils.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { XIcon } from '@shopify/polaris-icons';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.block.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  const { data, intents, query } = useApi(TARGET);

  const id = data.selected.map(order => order.id).filter(isGid)[0] ?? null;

  const [availableMetafields, setAvailableMetafields] = useState<{ namespace: string; key: string; name: string }[]>(
    [],
  );
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function go() {
      if (!id) {
        setError('No variant selected');
        return;
      }

      setIsLoading(true);
      const response = await getAvailableMetafieldDefinitions(id).catch((error: unknown) => {
        console.error(error);
        return null;
      });

      setIsLoading(false);

      if (!response) {
        setError('Error while fetching available metafields');
        return;
      }

      const {
        data: { variantMetafieldDefinitions, productMetafieldDefinitions, product },
      } = response;

      const availableMetafields = [
        ...(variantMetafieldDefinitions.nodes ?? []),
        ...(productMetafieldDefinitions.nodes ?? []),
      ];

      const scannableMetafields = (() => {
        const scannableMetafields = product?.scannableMetafields?.jsonValue;

        if (!Array.isArray(scannableMetafields)) {
          return [];
        }

        return scannableMetafields
          .map<null | {
            namespace: string;
            key: string;
            name: string;
          }>(jsonValue => {
            if (typeof jsonValue === 'object' && jsonValue !== null && 'namespace' in jsonValue && 'key' in jsonValue) {
              const metafield =
                availableMetafields.find(
                  availableMetafield =>
                    availableMetafield.namespace === jsonValue.namespace && availableMetafield.key === jsonValue.key,
                ) ?? null;

              return metafield;
            }

            return null;
          })
          .filter(isNonNullable)
          .filter(metafield =>
            availableMetafields.some(
              availableMetafield =>
                availableMetafield.namespace === availableMetafield.namespace &&
                availableMetafield.key === metafield.key,
            ),
          );
      })();

      setError(undefined);
      setAvailableMetafields(availableMetafields);
      setInitialScannableMetafields(scannableMetafields);
      setScannableMetafields(scannableMetafields);
    }

    go();
  }, [id]);

  const [initialScannableMetafields, setInitialScannableMetafields] = useState<typeof availableMetafields>([]);
  const [scannableMetafields, setScannableMetafields] = useState<typeof availableMetafields>([]);

  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <AdminBlock>
      {isLoading && <ProgressIndicator size="small-200" />}

      {!isLoading && (
        <BlockStack gap="large">
          <Text>
            The WorkMate Smart Scanner POS extension allows you to scan products by their barcode, SKU, or metafield
            values. Below, you can configure which of these values should be scannable.
          </Text>

          <Form
            onSubmit={() => {
              //
            }}
            onReset={() => {
              setScannableMetafields(initialScannableMetafields);
            }}
          >
            <BlockStack gap="base">
              {!isLoading && availableMetafields.length === 0 && (
                <InlineStack paddingBlockStart="base" paddingBlockEnd="large">
                  <Text>No metafields found</Text>
                </InlineStack>
              )}

              <InlineStack gap="small">
                {availableMetafields.map(metafield => (
                  <Checkbox value={scannableMetafields.indexOf(metafield) >= 0} label={metafield.name} />
                ))}
              </InlineStack>

              {/*<ChoiceList
                value={scannableMetafields.map(metafield => `${metafield.namespace}.${metafield.key}`)}
                choices={availableMetafields.map(metafield => ({
                  label: metafield.name,
                  value: `${metafield.namespace}.${metafield.key}`,
                }))}
                name="scannable-metafields"
                defaultValue={[]}
                multiple
                onChange={selected => {
                  setScannableMetafields(
                    availableMetafields.filter(
                      metafield => selected.indexOf(`${metafield.namespace}.${metafield.key}`) >= 0,
                    ),
                  );
                }}
              />*/}
            </BlockStack>
          </Form>
        </BlockStack>
      )}
    </AdminBlock>
  );
}
