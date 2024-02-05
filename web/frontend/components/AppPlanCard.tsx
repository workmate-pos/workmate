import { ToastActionCallable, useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Badge,
  Banner,
  BlockStack,
  Card,
  Icon,
  InlineStack,
  LegacyCard,
  Link,
  Spinner,
  Text,
} from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { SearchMinor } from '@shopify/polaris-icons';
import { useAppPlanSubscriptionQuery } from '@work-orders/common/queries/use-app-plan-subscription-query.js';
import { useAvailableAppPlansQuery } from '@work-orders/common/queries/use-available-app-plans-query.js';
import { useAppPlanSubscriptionMutation } from '@work-orders/common/queries/use-app-plan-subscription-mutation.js';

export type AppPlanCardProps = {
  setToastAction: ToastActionCallable;
};

export function AppPlanCard({ setToastAction }: AppPlanCardProps) {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch(setToastAction);
  const redirect = Redirect.create(app);

  const appPlanSubscriptionMutation = useAppPlanSubscriptionMutation(
    { fetch },
    {
      onSuccess: appSubscription => {
        setToastAction({ content: 'Redirecting you to the confirmation page!' });
        redirect.dispatch(Redirect.Action.REMOTE, String(appSubscription.confirmationUrl));
      },
    },
  );

  const appPlanSubscriptionQuery = useAppPlanSubscriptionQuery({ fetch });
  const availableAppPlansQuery = useAvailableAppPlansQuery({ fetch });
  const isLoadingAppPlans = appPlanSubscriptionQuery.isLoading || availableAppPlansQuery.isLoading;

  const appPlanSubscription = appPlanSubscriptionQuery.data;
  const availableAppPlans = availableAppPlansQuery.data ?? [];

  const planActive = appPlanSubscription?.appSubscriptionStatus === 'ACTIVE';
  const availableAppPlanOptions = useMemo(() => {
    return availableAppPlans.map(plan => ({
      value: String(plan.id),
      label: (
        <BlockStack>
          <Text variant="headingSm" as="span">
            {plan.name}
          </Text>
          <Text variant="bodyMd" as="span" tone="subdued">
            {plan.price} {plan.currencyCode} {plan.interval === 'ANNUAL' ? 'per year' : 'per month'}
          </Text>
          <Text variant="bodyMd" as="span" tone="subdued">
            {plan.trialDays} day trial
          </Text>
        </BlockStack>
      ),
    }));
  }, [availableAppPlans]);

  const isChangingPlan = appPlanSubscriptionMutation.isLoading;
  const [chosenAppPlanId, setChosenAppPlanId] = useState<string>();
  const [chosenAppPlanIdInputValue, setChosenAppPlanIdInputValue] = useState<string>();
  const [chosenAppPlanIdError, setChosenAppPlanIdError] = useState<string>();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const error = appPlanSubscriptionMutation.error ?? availableAppPlansQuery.error ?? appPlanSubscriptionQuery.error;

    if (!error) {
      setError(null);
      return;
    }

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && 'error' in error
          ? String(error.error)
          : String(error);

    setError(message);
  }, [appPlanSubscriptionMutation.error, availableAppPlansQuery.error, appPlanSubscriptionQuery.error]);

  if (isLoadingAppPlans) {
    return (
      <Card>
        <Spinner accessibilityLabel="App Plan is loading" size="small" />
      </Card>
    );
  }

  if (error) {
    return (
      <Banner title="Error while creating an app subscription" tone="critical" onDismiss={() => setError(null)}>
        <p>
          It seems something went wrong. Please contact us at{' '}
          <Link url="mailto:hello@workmatepos.co" target="_blank">
            hello@workmatepos.co
          </Link>
          , and notify us of the following error:
        </p>
        <p>{error}</p>
      </Banner>
    );
  }

  return (
    <LegacyCard
      title={
        planActive ? (
          <InlineStack gap="100">
            <Text variant="headingSm" as="span">
              WorkMate {appPlanSubscription.appPlanName}
            </Text>
            <Badge tone="success">{appPlanSubscription.appSubscriptionStatus}</Badge>
          </InlineStack>
        ) : (
          'Subscribe to WorkMate'
        )
      }
      primaryFooterAction={{
        content: planActive ? 'Change Plan' : 'Subscribe',
        onAction: () => {
          if (!chosenAppPlanId) {
            setChosenAppPlanIdError('Please choose a plan');
            return;
          }

          setChosenAppPlanIdError(undefined);

          appPlanSubscriptionMutation.mutate({ appPlanId: chosenAppPlanId });
        },
        loading: appPlanSubscriptionMutation.isLoading,
      }}
      sectioned
    >
      <BlockStack gap="100">
        <Text variant="bodyMd" as="p">
          {planActive
            ? 'You may change your plan at any time.'
            : 'You need to be subscribed to a plan to use WorkMate.'}{' '}
          Only the store owner can subscribe to a plan.
        </Text>
        {(!planActive || isChangingPlan) && (
          <Autocomplete
            options={availableAppPlanOptions}
            selected={chosenAppPlanId == null ? [] : [chosenAppPlanId]}
            onSelect={([chosenAppPlanId]) => {
              const appPlan = availableAppPlans?.find(plan => plan.id === Number(chosenAppPlanId));
              setChosenAppPlanId(chosenAppPlanId);
              setChosenAppPlanIdError(undefined);
              setChosenAppPlanIdInputValue(appPlan.name);
            }}
            textField={
              <Autocomplete.TextField
                label={planActive ? 'Choose your new plan' : 'Choose your plan'}
                value={chosenAppPlanIdInputValue}
                onChange={setChosenAppPlanIdInputValue}
                prefix={<Icon source={SearchMinor} tone="base" />}
                placeholder="Search"
                autoComplete="off"
                error={
                  availableAppPlans.length === 0 ? (
                    <p>
                      No {isChangingPlan ? 'other ' : ''}app plans are available. Please contact us at{' '}
                      <Link url="mailto:hello@workmatepos.co" target="_blank">
                        hello@workmatepos.co
                      </Link>
                      .
                    </p>
                  ) : (
                    chosenAppPlanIdError
                  )
                }
                helpText={
                  <>
                    Check the{' '}
                    <Link url="https://www.workmatepos.co/#pricing" target="_blank">
                      pricing page
                    </Link>{' '}
                    for more information.
                  </>
                }
              />
            }
          />
        )}
      </BlockStack>
    </LegacyCard>
  );
}
