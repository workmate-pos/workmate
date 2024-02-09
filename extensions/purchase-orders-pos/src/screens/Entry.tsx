import {
  ScrollView,
  TextArea,
  TextField,
  useExtensionApi,
  Button,
  List,
  SearchBar,
} from '@shopify/retail-ui-extensions-react';
import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';

export function Entry() {
  const { Screen } = useScreen('Entry');
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  return (
    <Screen title={'Purchase Orders'}>
      <ScrollView>
        <ResponsiveGrid columns={2}>
          <TextField label={'Vendor Name'} onFocus={() => toast.show('Open menu')} />
          <ResponsiveGrid columns={2}>
            <TextField label={'PO #'} />
            <TextField label={'Date'} />
          </ResponsiveGrid>

          <TextArea label={'Ship From'} rows={2} />
          <TextArea label={'Ship To'} rows={2} />

          <ResponsiveGrid columns={2}>
            <TextField label={'Sales Order #'} />
            <TextField label={'Vendor Ref #'} />
          </ResponsiveGrid>
          <ResponsiveGrid columns={2}>
            <TextField label={'Expected'} />
            <TextField label={'Terms'} />
          </ResponsiveGrid>

          <ResponsiveGrid columns={2}>
            <TextField label={'Ship via'} />
            <TextField label={'Charge via'} />
          </ResponsiveGrid>
          <TextField label={'Assign Employees'} />

          <TextField label={'Location'} />
          <TextField label={'Comments'} />
        </ResponsiveGrid>

        <ResponsiveGrid columns={2}>
          <ResponsiveGrid columns={1}>
            <Button title={'Add Product'} type={'primary'} onPress={() => toast.show('Add Item Menu')} />
            <SearchBar placeholder={'Search products'} onSearch={() => {}} />
            <List
              data={[
                { id: '1', leftSide: { label: 'Product 1' } },
                { id: '2', leftSide: { label: 'Product 2' } },
              ]}
              isLoadingMore={false}
              onEndReached={() => {}}
              imageDisplayStrategy={'always'}
            />
          </ResponsiveGrid>

          <ResponsiveGrid columns={1}>
            <ResponsiveGrid columns={2}>
              <TextField label={'Subtotal'} />
              <TextField label={'Discount'} />
              <TextField label={'Tax'} />
              <TextField label={'Shipping'} />
            </ResponsiveGrid>
            <TextField label={'Total'} />
            <ResponsiveGrid columns={2}>
              <TextField label={'Deposited'} />
              <TextField label={'Paid'} />
            </ResponsiveGrid>
            <TextField label={'Balance Due'} />
            <Button title={'Create Order'} type={'primary'} onPress={() => toast.show('Save')} />
          </ResponsiveGrid>
        </ResponsiveGrid>
      </ScrollView>
    </Screen>
  );
}
