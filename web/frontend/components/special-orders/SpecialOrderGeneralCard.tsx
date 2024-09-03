import {
  getCreateSpecialOrderSetter,
  WIPCreateSpecialOrder,
} from '@work-orders/common/create-special-order/default.js';
import { Dispatch, SetStateAction, useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import { useStorePropertiesQuery } from '@work-orders/common/queries/use-store-properties-query.js';
import { SHOPIFY_B2B_PLANS } from '@work-orders/common/util/shopify-plans.js';
import { useCompanyQuery } from '@work-orders/common/queries/use-company-query.js';
import { useCompanyLocationQuery } from '@work-orders/common/queries/use-company-location-query.js';
import { DateModal } from '@web/frontend/components/shared-orders/modals/DateModal.js';
import { DateTime } from '@web/schemas/generated/create-special-order.js';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';
import { CustomerSelectorModal } from '@web/frontend/components/shared-orders/modals/CustomerSelectorModal.js';
import { CompanySelectorModal } from '@web/frontend/components/work-orders/modals/CompanySelectorModal.js';
import { CompanyLocationSelectorModal } from '@web/frontend/components/work-orders/modals/CompanyLocationSelectorModal.js';

export function SpecialOrderGeneralCard({
  createSpecialOrder,
  setCreateSpecialOrder,
  disabled,
}: {
  createSpecialOrder: WIPCreateSpecialOrder;
  setCreateSpecialOrder: Dispatch<SetStateAction<WIPCreateSpecialOrder>>;
  disabled: boolean;
}) {
  const setCustomerId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'customerId');
  const setCompanyId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'companyId');
  const setCompanyContactId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'companyContactId');
  const setCompanyLocationId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'companyLocationId');
  const setLocationId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'locationId');
  const setNote = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'note');
  const setRequiredBy = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'requiredBy');

  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [isCompanySelectorOpen, setIsCompanySelectorOpen] = useState(false);
  const [isCompanyLocationSelectorOpen, setIsCompanyLocationSelectorOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const storePropertiesQuery = useStorePropertiesQuery({ fetch });
  const locationQuery = useLocationQuery({ fetch, id: createSpecialOrder.locationId });
  const customerQuery = useCustomerQuery({ fetch, id: createSpecialOrder.customerId });
  const companyQuery = useCompanyQuery({ fetch, id: createSpecialOrder.companyId });
  const companyLocationQuery = useCompanyLocationQuery({ fetch, id: createSpecialOrder.companyLocationId });

  const canSelectCompany =
    storePropertiesQuery.data && SHOPIFY_B2B_PLANS.includes(storePropertiesQuery.data?.storeProperties.plan);

  return (
    <Card>
      <BlockStack gap={'400'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          General
        </Text>

        <CompanySelectorModal
          open={isCompanySelectorOpen}
          onClose={() => setIsCompanySelectorOpen(false)}
          onSelect={(companyId, customerId, companyContactId) => {
            setCompanyId(companyId);
            setCompanyContactId(companyContactId);
            setCustomerId(customerId);
            setIsCompanyLocationSelectorOpen(true);
          }}
          setToastAction={setToastAction}
        />

        {canSelectCompany && (
          <TextField
            label={'Company'}
            autoComplete={'off'}
            value={
              createSpecialOrder.companyId === null
                ? ''
                : companyQuery.isLoading
                  ? 'Loading...'
                  : companyQuery.data?.name ?? 'Unknown company'
            }
            onFocus={() => setIsCompanySelectorOpen(true)}
            disabled={disabled || createSpecialOrder.name !== null}
            readOnly
          />
        )}

        {createSpecialOrder.companyId && (
          <CompanyLocationSelectorModal
            open={isCompanyLocationSelectorOpen}
            onClose={() => setIsCompanyLocationSelectorOpen(false)}
            onSelect={companyLocation => setCompanyLocationId(companyLocation.id)}
            setToastAction={setToastAction}
            companyId={createSpecialOrder.companyId}
          />
        )}

        {createSpecialOrder.companyId && (
          <TextField
            label={'Company Location'}
            requiredIndicator
            autoComplete={'off'}
            value={
              createSpecialOrder.companyLocationId === null
                ? ''
                : companyLocationQuery.isLoading
                  ? 'Loading...'
                  : companyLocationQuery.data?.name ?? 'Unknown location'
            }
            onFocus={() => {
              if (!createSpecialOrder.companyId) {
                setToastAction({ content: 'You must select a company to select a company location' });
                return;
              }

              setIsCompanyLocationSelectorOpen(true);
            }}
            disabled={disabled || createSpecialOrder.name !== null}
            readOnly
          />
        )}

        <CustomerSelectorModal
          open={isCustomerSelectorOpen}
          onClose={() => setIsCustomerSelectorOpen(false)}
          onSelect={customerId => {
            setCompanyId(null);
            setCompanyContactId(null);
            setCompanyLocationId(null);
            setCustomerId(customerId);
          }}
          setToastAction={setToastAction}
        />

        <TextField
          label={'Customer'}
          autoComplete={'off'}
          requiredIndicator
          value={
            createSpecialOrder.customerId === null
              ? ''
              : customerQuery.isLoading
                ? 'Loading...'
                : customerQuery.data?.displayName ?? 'Unknown customer'
          }
          disabled={disabled || createSpecialOrder.name !== null}
          readOnly
          onFocus={() => setIsCustomerSelectorOpen(true)}
        />

        <LocationSelectorModal
          open={isLocationSelectorOpen}
          onClose={() => setIsLocationSelectorOpen(false)}
          onSelect={setLocationId}
          setToastAction={setToastAction}
        />

        <TextField
          label={'Location'}
          requiredIndicator
          autoComplete={'off'}
          value={
            createSpecialOrder.locationId === null
              ? ''
              : locationQuery.isLoading
                ? 'Loading...'
                : locationQuery.data?.name ?? 'Unknown location'
          }
          disabled={disabled || createSpecialOrder.name !== null}
          readOnly
          onFocus={() => setIsLocationSelectorOpen(true)}
        />

        <DateModal
          open={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          timezone
          onUpdate={date => setRequiredBy(date.toISOString() as DateTime)}
          initialDate={createSpecialOrder.requiredBy ? new Date(createSpecialOrder.requiredBy) : undefined}
        />

        <TextField
          label={'Required By'}
          autoComplete={'off'}
          value={
            createSpecialOrder.requiredBy === null ? '' : new Date(createSpecialOrder.requiredBy).toLocaleDateString()
          }
          labelAction={
            !!createSpecialOrder.requiredBy
              ? {
                  content: 'Remove',
                  onAction: () => setRequiredBy(null),
                }
              : undefined
          }
          onFocus={() => setIsDatePickerOpen(true)}
          disabled={disabled}
          readOnly
        />

        <TextField
          label={'Note'}
          autoComplete={'off'}
          value={createSpecialOrder.note}
          multiline={2}
          onChange={note => setNote(note)}
          disabled={disabled}
        />
      </BlockStack>

      {toast}
    </Card>
  );
}
