import { createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useParams } from 'react-router-dom';
import { useLabourQuery } from '@work-orders/common/queries/use-labour-query.js';
import { useLabourMutation } from '@work-orders/common/queries/use-labour-mutation.js';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { UpsertLabour } from '@web/schemas/upsert-labour.js';
import { useEffect, useState } from 'react';
import { BigDecimal, Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { match } from 'ts-pattern';
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Form,
  FormLayout,
  Frame,
  InlineStack,
  Layout,
  Page,
  Select,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { Redirect } from '@shopify/app-bridge/actions';

export default function Labour() {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const app = useAppBridge();

  const params = useParams<'id'>();
  const id = params.id && params.id !== 'new' ? createGid('Metaobject', params.id) : null;
  const labourQuery = useLabourQuery({ fetch, id });
  const labourMutation = useLabourMutation({ fetch });

  const lastResult = labourMutation.data?.submissionResult;

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: UpsertLabour });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  const [name, setName] = useState('');
  const [removable, setRemovable] = useState(false);
  const [type, setType] = useState<UpsertLabour['type']>('fixed');
  const [rate, setRate] = useState<Money>();
  const [hours, setHours] = useState<Decimal>();
  const [customizeRate, setCustomizeRate] = useState(false);
  const [customizeHours, setCustomizeHours] = useState(false);
  const [amount, setAmount] = useState<Money>();
  const [customizeAmount, setCustomizeAmount] = useState(false);

  useEffect(() => {
    if (!labourQuery.data) return;
    const labour = labourQuery.data;

    setName(labour.name);
    setRemovable(labour.removable);
    setType(
      match(labour.type)
        .returnType<UpsertLabour['type']>()
        .with('fixed-price-labour-charge', () => 'fixed')
        .with('hourly-labour-charge', () => 'hourly')
        .exhaustive(),
    );

    if (labour.type === 'fixed-price-labour-charge') {
      setAmount(labour.amount);
      setCustomizeAmount(labour.customizeAmount);
    } else if (labour.type === 'hourly-labour-charge') {
      setRate(labour.rate);
      setHours(labour.hours);
      setCustomizeRate(labour.customizeRate);
      setCustomizeHours(labour.customizeHours);
    } else {
      return labour satisfies never;
    }
  }, [labourQuery.data]);

  return (
    <Frame>
      <Page narrowWidth>
        <Card padding={'800'}>
          <Layout>
            <Layout.Section>
              <Text as="h1" variant="heading2xl">
                Labour
              </Text>
            </Layout.Section>

            {labourQuery.isError && (
              <Layout.Section>
                <Banner title="Error loading labour" tone="warning">
                  {extractErrorMessage(labourQuery.error, 'An error occurred while loading labour')}
                </Banner>
              </Layout.Section>
            )}

            {labourQuery.isLoading && (
              <Layout.Section>
                <Box padding={'3200'}>
                  <BlockStack align="center" inlineAlign="center">
                    <Spinner />
                  </BlockStack>
                </Box>
              </Layout.Section>
            )}

            {!!id && !labourQuery.isLoading && !labourQuery.data && (
              <Layout.Section>
                <Text as="p" variant="headingLg" fontWeight="bold" tone="subdued">
                  Labour not found
                </Text>
              </Layout.Section>
            )}

            {(!id || !!labourQuery.data) && (
              <Layout.Section>
                <Form
                  name={form.name}
                  noValidate={form.noValidate}
                  onSubmit={event => {
                    event.preventDefault();
                    labourMutation.mutate(event.currentTarget, {
                      onSuccess(result) {
                        if (result.labour) {
                          setToastAction({ content: 'Saved labour!' });
                          Redirect.create(app).dispatch(
                            Redirect.Action.APP,
                            `/labour/${parseGid(result.labour.id).id}`,
                          );
                        }
                      },
                    });
                  }}
                >
                  <FormLayout>
                    {id && <input type="hidden" name="metaobjectId" value={createGid('Metaobject', id)} />}
                    <TextField
                      label={'Name'}
                      autoComplete="off"
                      value={name}
                      onChange={setName}
                      name={fields.name.name}
                      requiredIndicator={fields.name.required}
                      error={fields.name.errors?.join(', ')}
                    />

                    <Checkbox
                      label={'Removable'}
                      checked={removable}
                      onChange={setRemovable}
                      name={fields.removable.name}
                      error={fields.removable.errors?.join(', ')}
                      helpText={'If enabled, this labour cannot be removed from a line item once added'}
                    />

                    <Select
                      label={'Labour Type'}
                      options={[
                        {
                          value: 'fixed' satisfies UpsertLabour['type'],
                          label: 'Fixed Price',
                        },
                        {
                          value: 'hourly' satisfies UpsertLabour['type'],
                          label: 'Hourly',
                        },
                      ]}
                      value={type}
                      onChange={selected => setType(selected as UpsertLabour['type'])}
                      requiredIndicator={fields.type.required}
                      name={!id ? fields.type.name : undefined}
                      error={fields.type.errors?.join(', ')}
                      disabled={!!id}
                      helpText={!!id ? 'Labour type cannot be changed after creation' : ''}
                    />
                    {!!id && <input type="hidden" name={fields.type.name} value={type} />}

                    {type === 'fixed' && (
                      <FormLayout>
                        <TextField
                          label={'Price'}
                          autoComplete="off"
                          value={amount}
                          onChange={money => {
                            if (BigDecimal.isValid(money)) {
                              setAmount(BigDecimal.fromString(money).toMoney());
                            }
                          }}
                          name={fields.amount.name}
                          requiredIndicator={fields.amount.required}
                          error={fields.amount.errors?.join(', ')}
                          prefix={'$'}
                        />

                        <Checkbox
                          label={'Customizable Price'}
                          checked={customizeAmount}
                          onChange={setCustomizeAmount}
                          name={fields.customizeAmount.name}
                          error={fields.customizeAmount.errors?.join(', ')}
                        />
                      </FormLayout>
                    )}

                    {type === 'hourly' && (
                      <FormLayout>
                        <TextField
                          label={'Rate'}
                          autoComplete="off"
                          value={rate}
                          onChange={money => {
                            if (BigDecimal.isValid(money)) {
                              setRate(BigDecimal.fromString(money).toMoney());
                            }
                          }}
                          name={fields.rate.name}
                          requiredIndicator={fields.rate.required}
                          error={fields.rate.errors?.join(', ')}
                          prefix={'$'}
                        />

                        <Checkbox
                          label={'Customizable Rate'}
                          checked={customizeRate}
                          onChange={setCustomizeRate}
                          name={fields.customizeRate.name}
                          error={fields.customizeRate.errors?.join(', ')}
                        />

                        <TextField
                          label={'Hours'}
                          autoComplete="off"
                          value={hours}
                          onChange={hours => {
                            if (BigDecimal.isValid(hours)) {
                              setHours(BigDecimal.fromString(hours).toDecimal());
                            }
                          }}
                          name={fields.hours.name}
                          requiredIndicator={fields.hours.required}
                          error={fields.hours.errors?.join(', ')}
                        />

                        <Checkbox
                          label={'Customizable Hours'}
                          checked={customizeHours}
                          onChange={setCustomizeHours}
                          name={fields.customizeHours.name}
                          error={fields.customizeHours.errors?.join(', ')}
                        />
                      </FormLayout>
                    )}

                    <InlineStack align="end">
                      <Button submit variant="primary" loading={labourMutation.isPending}>
                        Save
                      </Button>
                    </InlineStack>
                  </FormLayout>
                </Form>
              </Layout.Section>
            )}
          </Layout>
        </Card>
      </Page>

      {toast}
    </Frame>
  );
}
