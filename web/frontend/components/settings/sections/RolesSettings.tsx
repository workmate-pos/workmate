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
  const [newRoleName, setNewRoleName] = useState('');

  // we need a stable order to prevent roles from jumping around when typing
  const [roleNames, setRoleNames] = useState(Object.keys(settings.roles));
  const [roleNameInputValues, setRoleNameInputValues] = useState(Object.keys(settings.roles));

  useEffect(() => {
    // react is great i swear
    setRoleNames(roleNames => {
      const newRoleNames = Object.keys(settings.roles).filter(name => !roleNames.includes(name));

      setRoleNameInputValues(roleNameInputValues => [
        ...roleNameInputValues.filter((_, i) => roleNames[i]! in settings.roles),
        ...newRoleNames,
      ]);

      return [...roleNames.filter(name => name in settings.roles), ...newRoleNames];
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

        <Box paddingBlockStart={'100'}>
          <Text as="p" variant="bodySm" tone="subdued">
            Note that WorkMate previously used permissions on a per-employee basis. Your configured permissions have
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
          const role = settings.roles[name];

          if (!role) {
            // impossible
            return null;
          }

          return (
            <IndexTable.Row key={i} position={i} selected={false} id={i.toString()}>
              <IndexTable.Cell>
                <InlineStack align="end">
                  <Button
                    variant="plain"
                    icon={CircleMinusMinor}
                    tone="critical"
                    onClick={() => {
                      setSettings(current => ({
                        ...current,
                        roles: Object.fromEntries(Object.entries(current.roles).filter(([x]) => x !== name)),
                      }));
                    }}
                  ></Button>
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
                    error={
                      !roleNameInputValues[i]
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

        <IndexTable.Row position={Object.entries(settings.roles).length} selected={false} id={'new-role'}>
          <IndexTable.Cell />
          <IndexTable.Cell>
            <FormLayout>
              <TextField
                label={'Role Name'}
                labelHidden
                placeholder="New Role"
                autoComplete="off"
                value={newRoleName}
                onChange={value => setNewRoleName(value)}
                onBlur={() => {
                  if (!newRoleName || roleNameInputValues.includes(newRoleName)) {
                    return;
                  }

                  setNewRoleName('');
                  setRoleNameInputValues(current => [...current, newRoleName]);
                  setSettings(current => {
                    current.roles[newRoleName] = { isDefault: false, permissions: [] };
                    return { ...current };
                  });
                }}
                error={roleNameInputValues.includes(newRoleName) ? 'Role name already exists' : undefined}
              />
            </FormLayout>
          </IndexTable.Cell>
          {permissions.map(permission => (
            <IndexTable.Cell key={permission}>
              <Checkbox label={permission} labelHidden checked={false} disabled />
            </IndexTable.Cell>
          ))}
        </IndexTable.Row>
      </IndexTable>
    </BlockStack>
  );
}
