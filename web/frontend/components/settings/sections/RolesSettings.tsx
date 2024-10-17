import { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
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
import { uuid } from '@work-orders/common/util/uuid.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';

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
  'manage_schedules',
];

export function RolesSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
}) {
  // we need a stable order to prevent roles from jumping around when typing
  const [roleUuids, setRoleUuids] = useState(Object.keys(settings.roles));
  const [roleUuidInputValues, setRoleUuidInputValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(settings.roles).map(([uuid, role]) => [uuid, role.name])),
  );

  const newRoleUuid = useMemo(uuid, [roleUuids.length]);

  useEffect(() => {
    setRoleUuids(current => [
      ...current.filter(uuid => uuid in settings.roles),
      ...Object.keys(settings.roles).filter(uuid => !current.includes(uuid)),
    ]);
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
            alignment: 'center',
          },
          ...permissions.map(permission => ({ title: sentenceCase(permission), alignment: 'center' }) as const),
        ]}
        selectable={false}
        itemCount={1 + roleUuids.length}
      >
        {[...roleUuids, newRoleUuid].map((roleUuid, i) => {
          const role = settings.roles[roleUuid] ?? { name: '', isDefault: i === 0, permissions: [] };

          return (
            <IndexTable.Row key={i} position={i} selected={false} id={i.toString()}>
              <IndexTable.Cell>
                <InlineStack align="end">
                  {roleUuid in settings.roles && (
                    <Button
                      variant="plain"
                      icon={CircleMinusMinor}
                      tone="critical"
                      onClick={() => {
                        // without this there will be 1 render where the role is removed from settings but is still in roleUuids
                        // this would cause the "Role name is already taken" error to be shown for 1 render cycle
                        setRoleUuids(current => current.filter(uuid => uuid !== roleUuid));

                        setSettings(current => ({
                          ...current,
                          roles: Object.fromEntries(
                            Object.entries(current.roles)
                              .filter(([x]) => x !== roleUuid)
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
                    label={'Role name'}
                    labelHidden
                    autoComplete="off"
                    value={roleUuidInputValues[roleUuid]}
                    onChange={value => {
                      setRoleUuidInputValues(current => ({ ...current, [roleUuid]: value }));

                      if (!!value && !Object.values(settings.roles).some(role => role.name === value)) {
                        setRoleUuids(current => [...current.slice(0, i), roleUuid, ...current.slice(i + 1)]);
                        setSettings(current => ({
                          ...current,
                          roles: {
                            ...current.roles,
                            [roleUuid]: { ...role, name: value },
                          },
                        }));
                      }
                    }}
                    placeholder={roleUuid === newRoleUuid ? 'New role' : undefined}
                    error={
                      roleUuid !== newRoleUuid && !roleUuidInputValues[roleUuid]
                        ? 'Role name is required'
                        : (roleUuidInputValues[roleUuid] ?? '') !== role.name
                          ? 'Role name already exists'
                          : undefined
                    }
                  />
                </FormLayout>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <InlineStack align="center">
                  <Checkbox
                    label={'Default'}
                    labelHidden
                    checked={role.isDefault}
                    disabled={!roleUuid}
                    onChange={checked => {
                      const checkRoleUuid = checked ? roleUuid : roleUuids.find(uuid => uuid !== roleUuid);

                      setRoleUuids(current => [...current.slice(0, i), roleUuid, ...current.slice(i + 1)]);
                      setSettings(current => ({
                        ...current,
                        roles: {
                          ...Object.fromEntries(
                            Object.entries(current.roles).map(([uuid, role]) => [
                              uuid,
                              { ...role, isDefault: uuid === checkRoleUuid },
                            ]),
                          ),
                          [roleUuid]: { ...role, isDefault: roleUuid === checkRoleUuid },
                        },
                      }));
                    }}
                  />
                </InlineStack>
              </IndexTable.Cell>

              {permissions.map(permission => (
                <IndexTable.Cell key={permission}>
                  <InlineStack align="center">
                    <Checkbox
                      label={permission}
                      disabled={!roleUuid}
                      labelHidden
                      checked={role.permissions.includes(permission)}
                      onChange={checked => {
                        setSettings(current => ({
                          ...current,
                          roles: {
                            ...Object.fromEntries(Object.entries(current.roles).filter(([x]) => x !== roleUuid)),
                            [roleUuid]: {
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
                  </InlineStack>
                </IndexTable.Cell>
              ))}
            </IndexTable.Row>
          );
        })}
      </IndexTable>
    </BlockStack>
  );
}
