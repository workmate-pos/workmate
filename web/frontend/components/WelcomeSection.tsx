import { BlockStack, LegacyCard, Link, Text } from '@shopify/polaris';
import React from 'react';

export function WelcomeSection({}: {}) {
  return (
    <LegacyCard
      sectioned
      title={
        <Text variant="headingXl" as={'h1'}>
          Welcome to WorkMate
        </Text>
      }
    >
      <BlockStack gap="400">
        <Text variant="bodyLg" as={'p'}>
          WorkMate helps you manage work orders, inventory, and employee scheduling through Shopify Point of Sale and
          Shopify Admin.
        </Text>

        <BlockStack gap="200">
          <Text variant={'headingLg'} as={'h2'}>
            Frequently Asked Questions
          </Text>
          <Text variant="bodyMd" as={'p'}>
            Frequently asked questions can be found{' '}
            <Link
              url="https://workmate.gitbook.io/workmate-knowledge-base/frequently-asked-questions/faq"
              target="_blank"
            >
              here
            </Link>
            . Do not hesitate to contact us at{' '}
            <Link url="mailto:hello@workmatepos.co" target="_blank">
              hello@workmatepos.co
            </Link>{' '}
            if you have any remaining questions.
          </Text>
        </BlockStack>

        <BlockStack gap="200">
          <Text variant={'headingLg'} as={'h2'}>
            Demo Video
          </Text>

          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src="https://www.loom.com/embed/eaa1d1ed1b604436863ba38316cb327a?sid=75344420-004f-4924-bab3-1f9f5bcdef15"
              frameBorder="0"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            ></iframe>
          </div>

          <Text variant="bodyMd" as={'p'} tone={'subdued'}>
            <Link
              monochrome
              url="https://www.loom.com/share/eaa1d1ed1b604436863ba38316cb327a?sid=b3ab7af8-67cc-406c-88a2-bc206899d50c"
              target="_blank"
            >
              Video not loading?
            </Link>
          </Text>
        </BlockStack>

        <BlockStack gap="200">
          <Text variant={'headingLg'} as={'h2'}>
            Contact
          </Text>
          <Text variant="bodyMd" as={'p'}>
            If you have any questions, need support, or would like to request a feature, please contact us at{' '}
            <Link url="mailto:hello@workmatepos.co" target="_blank">
              hello@workmatepos.co
            </Link>
          </Text>
        </BlockStack>
      </BlockStack>
    </LegacyCard>
  );
}
