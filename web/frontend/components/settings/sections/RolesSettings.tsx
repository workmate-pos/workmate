import { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  BlockStack,
  Box,
  Button,
  Checkbox,
  FormLayout,
  IndexTable,
  InlineStack,
  Page,
  Text,
  TextField,
} from '@shopify/polaris';
import type { permissions as AllPermissions } from '@web/services/permissions/permissions.js';
import { CircleMinusMinor } from '@shopify/polaris-icons';

const permissions: typeof AllPermissions = [
  'read_settings',
  'write_settings',
  'read_employees',
  'write_employees',
  'read_work_orders',
  'write_work_orders',
  'read_app_plan',
  'write_app_plan',
  'read_purchase_orders',
  'write_purchase_orders',
  'cycle_count',
  'read_stock_transfers',
  'write_stock_transfers',
  'read_special_orders',
  'write_special_orders',
];

export function RolesSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
}) {
  // we need a stable order to prevent roles from jumping around when typing
  const [roleNames, setRoleNames] = useState(Object.keys(settings.roles));
  const [roleNameInputValues, setRoleNameInputValues] = useState(Object.keys(settings.roles));

  useEffect(() => {
    // react is great i swear
    setRoleNames(roleNames => {
      const newRoleNames = Object.keys(settings.roles).filter(name => !roleNames.includes(name));

      if (!roleNames.includes('')) {
        newRoleNames.push('');
      }

      setRoleNameInputValues(roleNameInputValues => [
        ...roleNameInputValues.filter((_, i) => roleNames[i]! in settings.roles || i === roleNames.length - 1),
        ...newRoleNames,
      ]);

      return [...roleNames.filter((name, i) => name in settings.roles || i === roleNames.length - 1), ...newRoleNames];
    });
  }, [settings]);

  return (
    <BlockStack gap="400">
      <Page>
        <Text as="h2" variant="headingMd" fontWeight="bold">
          Roles
        </Text>

        <Text as="p" variant="bodyMd" tone="subdued">
          WorkMate uses a role-based system to restrict permissions. This page allows you to configure roles and their
          permissions.
        </Text>

        <Box paddingBlockStart={'200'}>
          <Text as="p" variant="bodyXs" tone="subdued">
            WorkMate previously configured permissions on a per-employee basis. Your configured permissions have
            automatically been migrated to roles.
          </Text>
        </Box>
      </Page>

      <IndexTable
        headings={[
          {
            title: 'Remove',
            hidden: true,
          },
          {
            title: 'Role',
          },
          {
            title: 'Default',
          },
          ...permissions.map(permission => ({ title: permission, alignment: 'end' }) as const),
        ]}
        selectable={false}
        itemCount={1 + roleNames.length}
      >
        {roleNames.map((name, i) => {
          const role = settings.roles[name] ?? { isDefault: false, permissions: [] };

          return (
            <IndexTable.Row key={i} position={i} selected={false} id={i.toString()}>
              <IndexTable.Cell>
                <InlineStack align="end">
                  {!!name && (
                    <Button
                      variant="plain"
                      icon={CircleMinusMinor}
                      tone="critical"
                      onClick={() => {
                        setSettings(current => ({
                          ...current,
                          roles: Object.fromEntries(
                            Object.entries(current.roles)
                              .filter(([x]) => x !== name)
                              .map(([name, role], i) => [name, { ...role, isDefault: i === 0 }]),
                          ),
                        }));
                      }}
                    ></Button>
                  )}
                </InlineStack>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <FormLayout>
                  <TextField
                    label={'Role Name'}
                    labelHidden
                    autoComplete="off"
                    value={roleNameInputValues[i]}
                    onChange={value => {
                      setRoleNameInputValues(current => [...current.slice(0, i), value, ...current.slice(i + 1)]);

                      if (!!value && !roleNameInputValues.includes(value)) {
                        setRoleNames(current => [...current.slice(0, i), value, ...current.slice(i + 1)]);
                        setSettings(current => ({
                          ...current,
                          roles: {
                            ...Object.fromEntries(Object.entries(current.roles).filter(([x]) => x !== name)),
                            [value]: role,
                          },
                        }));
                      }
                    }}
                    placeholder={i === roleNames.length - 1 ? 'New Role' : undefined}
                    error={
                      i !== roleNames.length - 1 && !roleNameInputValues[i]
                        ? 'Role name is required'
                        : roleNameInputValues[i] !== name
                          ? 'Role name already exists'
                          : undefined
                    }
                  />
                </FormLayout>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Checkbox
                  label={'Default'}
                  labelHidden
                  checked={role.isDefault}
                  disabled={!name}
                  onChange={checked => {
                    // if unchecking just move the check to the first role
                    let indexToCheck = checked ? i : 0;

                    // without this unchecking the first role would be impossible
                    // it will just move to the second role now if it exists
                    if (!checked && i === 0 && roleNames.length > 1) {
                      indexToCheck = 1;
                    }

                    setSettings(current => ({
                      ...current,
                      roles: Object.fromEntries(
                        Object.entries(current.roles).map(([name, role]) => [
                          name,
                          { ...role, isDefault: name === roleNames[indexToCheck] },
                        ]),
                      ),
                    }));
                  }}
                />
              </IndexTable.Cell>

              {permissions.map(permission => (
                <IndexTable.Cell key={permission}>
                  <Checkbox
                    label={permission}
                    disabled={!name}
                    labelHidden
                    checked={role.permissions.includes(permission)}
                    onChange={checked => {
                      setSettings(current => ({
                        ...current,
                        roles: {
                          ...Object.fromEntries(Object.entries(current.roles).filter(([x]) => x !== name)),
                          [name]: {
                            ...role,
                            permissions: [
                              ...role.permissions.filter(p => p !== permission),
                              ...(checked ? [permission] : []),
                            ],
                          },
                        },
                      }));
                    }}
                  />
                </IndexTable.Cell>
              ))}
            </IndexTable.Row>
          );
        })}
      </IndexTable>
    </BlockStack>
  );
}
