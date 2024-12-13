import { Card, EmptyState, Page } from '@shopify/polaris';
import React from 'react';
import { emptyState } from '../assets/index.js';

export default function NotFound() {
  return (
    <Page>
      <Card>
        <EmptyState heading="There is no page at this address" image={emptyState}>
          <p>Check the URL and try again, or use the search bar to find what you need.</p>
        </EmptyState>
      </Card>
    </Page>
  );
}
