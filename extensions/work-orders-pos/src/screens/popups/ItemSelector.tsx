import {
  List,
  ListRow,
  ListRowLeftSide,
  ScrollView,
  SearchBar,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { useScreen } from '../../hooks/use-screen';
import { useDynamicRef } from '../../hooks/use-dynamic-ref';

export function ItemSelector() {
  const { Screen, closePopup } = useScreen('ItemSelector');
  const api = useExtensionApi<'pos.home.modal.render'>();

  const [query, setQuery] = useState<string | null>(null);
  const [rows, setRows] = useState<ListRow[]>([]);

  const closeRef = useDynamicRef(() => closePopup, [closePopup]);

  useEffect(() => {
    // TODO: infinite scroller instead of fetching one batch
    async function fetchProducts() {
      const products = await api.productSearch.searchProducts({ first: 10 });

      setRows(
        products.items.flatMap(product =>
          product.variants.map(variant => ({
            id: String(variant.id),
            onPress: () => {
              closeRef.current({
                productId: String(variant.id),
                name: variant.displayName,
                sku: variant.sku ?? '',
                quantity: 1,
                unitPrice: Number(variant.price),
              });
            },
            leftSide: {
              label: variant.displayName,
              subtitle: [product.description],
              image: { source: variant.image ?? product.featuredImage },
            },
            rightSide: {
              showChevron: true,
            },
          })),
        ),
      );
    }

    fetchProducts();
  }, []);

  const getSubtitleText = (subtitle: NonNullable<ListRowLeftSide['subtitle']>[0]): string => {
    if (typeof subtitle === 'string') {
      return subtitle;
    }

    return subtitle.content;
  };

  const filteredRows = rows.filter(
    row =>
      !query ||
      row.leftSide.label.toLowerCase().includes(query.toLowerCase()) ||
      row.leftSide.subtitle?.some(
        subtitle => subtitle && getSubtitleText(subtitle).toLowerCase().includes(query.toLowerCase()),
      ),
  );

  return (
    <Screen title="Select item" presentation={{ sheet: true }}>
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search items" />
        <List data={filteredRows} />
      </ScrollView>
    </Screen>
  );
}
