import { Badge, Banner, BlockStack, Box, FormLayout, InlineGrid, InlineStack, Modal, ResourceItem, ResourceList, SkeletonThumbnail, Text, TextField, Thumbnail, } from '@shopify/polaris';
import { usePurchaseOrderReceiptMutation } from '@work-orders/common/queries/use-purchase-order-receipt-mutation.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { useEffect, useState } from 'react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
export function PurchaseOrderReceiptModal({ open, onClose, name, id, }) {
    var _a, _b, _c;
    const [toast, setToastAction] = useToast();
    const fetch = useAuthenticatedFetch({ setToastAction });
    const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });
    const purchaseOrderReceiptMutation = usePurchaseOrderReceiptMutation({ fetch });
    const [receiptName, setReceiptName] = useState('');
    const [description, setDescription] = useState('');
    const [lineItems, setLineItems] = useState([]);
    useEffect(() => {
        var _a, _b, _c, _d, _e, _f;
        if (id === null) {
            setReceiptName('');
            setDescription('');
            setLineItems((_b = (_a = purchaseOrderQuery.data) === null || _a === void 0 ? void 0 : _a.lineItems.map(lineItem => {
                var _a, _b;
                const availableQuantity = (_b = (_a = purchaseOrderQuery.data) === null || _a === void 0 ? void 0 : _a.receipts.flatMap(receipt => receipt.lineItems).filter(hasPropertyValue('uuid', lineItem.uuid)).map(lineItem => lineItem.quantity).reduce((a, b) => a + b, 0)) !== null && _b !== void 0 ? _b : 0;
                return Object.assign(Object.assign({}, lineItem), { availableQuantity });
            }).filter(lineItem => lineItem.quantity > lineItem.availableQuantity).map(({ uuid, quantity, availableQuantity }) => ({
                uuid,
                quantity: Math.max(0, quantity - availableQuantity),
            }))) !== null && _b !== void 0 ? _b : []);
        }
        else if (purchaseOrderQuery.isSuccess) {
            const receipt = (_c = purchaseOrderQuery.data) === null || _c === void 0 ? void 0 : _c.receipts.find(receipt => receipt.id === id);
            setReceiptName((_d = receipt === null || receipt === void 0 ? void 0 : receipt.name) !== null && _d !== void 0 ? _d : '');
            setDescription((_e = receipt === null || receipt === void 0 ? void 0 : receipt.description) !== null && _e !== void 0 ? _e : '');
            setLineItems((_f = receipt === null || receipt === void 0 ? void 0 : receipt.lineItems) !== null && _f !== void 0 ? _f : []);
        }
    }, [purchaseOrderQuery.data]);
    const productVariantIds = unique((_b = (_a = purchaseOrderQuery.data) === null || _a === void 0 ? void 0 : _a.lineItems.map(li => li.productVariant.id)) !== null && _b !== void 0 ? _b : []);
    const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });
    if (purchaseOrderQuery.isError) {
        return (<>
        <Modal title={'Purchase Order Receipt'} open={open} onClose={onClose}>
          <Modal.Section>
            <Banner title="Error loading purchase order" action={{
                content: 'Retry',
                onAction: purchaseOrderQuery.refetch,
            }}>
              {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading purchase order')}
            </Banner>
          </Modal.Section>
        </Modal>

        {toast}
      </>);
    }
    const receiptNotFound = id !== null &&
        purchaseOrderQuery.isSuccess &&
        !((_c = purchaseOrderQuery.data) === null || _c === void 0 ? void 0 : _c.receipts.some(receipt => receipt.id === id));
    if (receiptNotFound) {
        return (<>
        <Modal title={'Purchase Order Receipt'} open={open} onClose={onClose}>
          <Modal.Section>
            <Text as="p" variant="bodyMd" fontWeight="bold" tone="critical">
              Receipt not found
            </Text>
          </Modal.Section>
        </Modal>

        {toast}
      </>);
    }
    return (<>
      <Modal title={'Purchase Order Receipt'} open={open} onClose={onClose} loading={purchaseOrderQuery.isLoading} primaryAction={{
            content: 'Save',
            disabled: !receiptName || !lineItems.length || !purchaseOrderQuery.isSuccess,
            loading: purchaseOrderReceiptMutation.isPending,
            onAction: () => purchaseOrderReceiptMutation.mutate({
                purchaseOrderName: name,
                id: id !== null && id !== void 0 ? id : undefined,
                name: receiptName,
                description,
                lineItems: id !== null ? [] : lineItems.filter(li => li.quantity > 0),
            }, {
                onSuccess() {
                    setToastAction({ content: 'Saved purchase order receipt' });
                    onClose();
                },
            }),
        }}>
        <Modal.Section>
          <FormLayout>
            <TextField label={'Name'} autoComplete="off" value={receiptName} onChange={setReceiptName} requiredIndicator/>

            <TextField label={'Description'} autoComplete="off" multiline value={description} onChange={setDescription}/>

            <BlockStack gap={'100'}>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Line items
              </Text>

              {/*TODO: Loop through line items*/}
              <ResourceList items={lineItems} resourceName={{ singular: 'line item', plural: 'line items' }} emptyState={<Text as="p" variant="bodyMd" tone="subdued">
                    No line items available to add to a receipt
                  </Text>} renderItem={({ uuid, quantity: selectedQuantity }) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            const productVariantId = (_c = (_b = (_a = purchaseOrderQuery.data) === null || _a === void 0 ? void 0 : _a.lineItems.find(li => li.uuid === uuid)) === null || _b === void 0 ? void 0 : _b.productVariant) === null || _c === void 0 ? void 0 : _c.id;
            const productVariant = (_d = productVariantQueries[productVariantId !== null && productVariantId !== void 0 ? productVariantId : '']) === null || _d === void 0 ? void 0 : _d.data;
            const imageUrl = (_f = (_e = productVariant === null || productVariant === void 0 ? void 0 : productVariant.image) === null || _e === void 0 ? void 0 : _e.url) !== null && _f !== void 0 ? _f : (_h = (_g = productVariant === null || productVariant === void 0 ? void 0 : productVariant.product) === null || _g === void 0 ? void 0 : _g.featuredImage) === null || _h === void 0 ? void 0 : _h.url;
            const label = (_j = getProductVariantName(productVariant)) !== null && _j !== void 0 ? _j : 'Unknown product';
            const availableQuantity = (_l = (_k = purchaseOrderQuery.data) === null || _k === void 0 ? void 0 : _k.receipts.flatMap(receipt => receipt.lineItems).filter(hasPropertyValue('uuid', uuid)).map(lineItem => lineItem.quantity).reduce((a, b) => a + b, 0)) !== null && _l !== void 0 ? _l : 0;
            const quantity = (_p = (_o = (_m = purchaseOrderQuery.data) === null || _m === void 0 ? void 0 : _m.lineItems.find(hasPropertyValue('uuid', uuid))) === null || _o === void 0 ? void 0 : _o.quantity) !== null && _p !== void 0 ? _p : 0;
            const maxQuantity = Math.max(0, quantity - availableQuantity);
            const saveLineItemQuantity = (quantity) => {
                setLineItems(current => [...current.filter(x => x.uuid !== uuid), { uuid, quantity }].filter(isNonNullable));
            };
            return (<ResourceItem id={uuid} disabled={id !== null} onClick={() => saveLineItemQuantity(selectedQuantity === 0 ? maxQuantity : 0)}>
                      <InlineGrid gap={'200'} columns={['twoThirds', 'oneThird']}>
                        <InlineStack gap={'400'} wrap={false} blockAlign="center">
                          <Box>
                            <Badge tone="info">{selectedQuantity.toString()}</Badge>
                          </Box>
                          {imageUrl && <Thumbnail source={imageUrl} alt={label}/>}
                          {!imageUrl && <SkeletonThumbnail />}
                          <BlockStack gap={'200'}>
                            <Text as="p" variant="bodyMd" fontWeight="bold">
                              {label}
                            </Text>
                            <Text as="p" variant="bodyMd" tone="subdued">
                              {productVariant === null || productVariant === void 0 ? void 0 : productVariant.sku}
                            </Text>
                          </BlockStack>
                        </InlineStack>

                        {id === null && (<span onClick={event => event.stopPropagation()}>
                            <TextField label="Quantity" autoComplete="off" type="number" labelAction={maxQuantity === 0
                        ? undefined
                        : selectedQuantity !== maxQuantity
                            ? {
                                content: 'Max',
                                onAction: () => saveLineItemQuantity(maxQuantity),
                            }
                            : {
                                content: 'Clear',
                                onAction: () => saveLineItemQuantity(0),
                            }} min={0} max={maxQuantity} value={selectedQuantity.toString()} onChange={value => {
                        if (!!value && Number.isFinite(Number(value)) && Math.round(Number(value)) >= 0) {
                            saveLineItemQuantity(Math.round(Number(value)));
                        }
                    }} onBlur={() => saveLineItemQuantity(Math.max(0, Math.min(maxQuantity, selectedQuantity)))}/>
                          </span>)}
                      </InlineGrid>
                    </ResourceItem>);
        }}/>
            </BlockStack>
          </FormLayout>
        </Modal.Section>
      </Modal>

      {toast}
    </>);
}
