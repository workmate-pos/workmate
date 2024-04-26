import { BlockStack, Link, Text } from '@shopify/polaris';
import React from 'react';

export function WelcomeSection({}: {}) {
  return (
    <BlockStack gap="800">
      <BlockStack gap="200">
        <Text variant="headingXl" as={'h1'}>
          Welcome to WorkMate
        </Text>
        <Text variant="bodyLg" as={'p'}>
          WorkMate helps you manage work orders, inventory, and employee scheduling through Shopify Point of Sale and
          Shopify Admin.
        </Text>
      </BlockStack>

      <BlockStack gap="200">
        <Text variant={'headingLg'} as={'h2'}>
          Frequently Asked Questions
        </Text>
        <Text variant="bodyMd" as={'p'}>
          Frequently asked questions can be found{' '}
          <Link
            url="https://docs.google.com/document/d/1QHo_-8kUdccklh8wuc0iY5TTclw6UK5MqaUnWFQIYMI/edit?usp=sharing"
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

        <iframe
          width="560"
          height="315"
          src="https://www.youtube.com/embed/hCvzMtb0MxE?si=uivVnLXOg9zUtKsl"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />

        <Text variant="bodyMd" as={'p'} tone={'subdued'}>
          <Link monochrome url="https://www.youtube.com/watch?v=hCvzMtb0MxE" target="_blank">
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
  );
}
