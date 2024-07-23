import { BlockStack, Card, EmptyState, Text } from '@shopify/polaris';
import { emptyState } from '../assets/index.js';
export function NoPermissionCard({ missingPermissions }) {
    return (<Card>
      <EmptyState heading="No Permission" image={emptyState}>
        <BlockStack gap={'200'}>
          <Text as={'p'} variant={'bodyLg'}>
            You do not have permission to view this page.
          </Text>
          {!!(missingPermissions === null || missingPermissions === void 0 ? void 0 : missingPermissions.length) && (<Text as={'p'} variant={'bodyMd'}>
              You are missing the following permissions:{' '}
              <Text as={'p'} variant={'bodyMd'} fontWeight={'semibold'}>
                {missingPermissions.join(', ')}
              </Text>
            </Text>)}
          <Text as={'p'} variant={'bodyMd'}>
            Please contact the store owner to request access.
          </Text>
        </BlockStack>
      </EmptyState>
    </Card>);
}
