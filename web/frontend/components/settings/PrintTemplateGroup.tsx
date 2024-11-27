import type { ShopSettings } from '@web/services/settings/schema.js';
import { string } from '@teifi-digital/shopify-app-toolbox';
import { useState } from 'react';
import { BlockStack, Button, DescriptionList, InlineStack, Modal, Text } from '@shopify/polaris';
import { PrintTemplate } from '@web/frontend/components/settings/PrintTemplate.js';

/**
 * A group of print templates. Includes a description of variables that can be used within the template.
 */
export function PrintTemplateGroup({
  settings,
  setSettings,
  templateType,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
  templateType: 'workOrders' | 'purchaseOrders';
}) {
  const templates = settings[templateType].printTemplates;
  const [templateNames, setTemplateNames] = useState(Object.keys(templates));

  const title = string.sentenceCase(templateType);

  const [modalOpened, setModalOpened] = useState(false);

  const availableVariables = {
    workOrders: {
      '{{ name }}': 'The name of the work order',
      '{{ date }}': 'The current date',
      '{{ dueDate }}': 'The due date of the work order',
      '{{ status }}': 'The status of the work order',
      '{{ note }}': 'The note attached to the work order',
      '{{ hiddenNote }}': 'The hidden note attached to the work order',
      '{{ shopifyOrderNames }}': 'A list of the names of the shopify orders that are linked to this work order',
      '{{ purchaseOrderNames }}': 'A list of the names of the purchase orders that are linked to this work order',
      '{{ fullyPaid }}': 'Whether the work order has been fully paid for',
      '{{ customer.name }}': 'The name of the customer',
      '{{ customer.email }}': 'The email address of the customer',
      '{{ customer.phone }}': 'The phone number of the customer',
      '{{ customer.address }}': 'The address of the customer',
      '{{ items[*].name }}': 'The name of the item at index x',
      '{{ items[*].description }}': 'The description of the item at index x',
      '{{ items[*].sku }}': 'The SKU of the item at index x',
      '{{ items[*].shopifyOrderName }}': 'The name of the shopify order that the item is in at index x',
      '{{ items[*].purchaseOrderNames }}': 'The name of the purchase orders that the item is in at index x',
      '{{ items[*].quantity }}': 'The quantity of the item at index x',
      '{{ items[*].unitPrice }}': 'The unit price of the item at index x',
      '{{ items[*].totalPrice }}': 'The total price of the item at index x',
      '{{ items[*].fullyPaid }}': 'Whether the item at index x has been fully paid for',
      '{{ items[*].purchaseOrderQuantities.orderedQuantity }}':
        'The quantity of this item that has been ordered in linked purchase orders',
      '{{ items[*].purchaseOrderQuantities.availableQuantity }}':
        'The quantity of this item ordered in linked purchase orders that is now available',
      '{{ items[*].charges[y].name }}': 'The name of the charge at index y of the item at index x',
      '{{ items[*].charges[y].shopifyOrderName }}':
        'The name of the shopify order that the charge is in at index y of the item at index x',
      '{{ items[*].charges[y].details }}': 'Additional details about the charge at index y of the item at index x',
      '{{ items[*].charges[y].totalPrice }}': 'The total price of the charge at index y of the item at index x',
      '{{ items[*].charges[y].fullyPaid }}':
        'Whether the charge at index y of the item at index x has been fully paid for',
      '{{ items[*].customFields[y] }}': 'The value of the custom field with key y of the item at index x',
      '{{ tax }}': 'The total tax of the work order',
      '{{ subtotal }}': 'The total subtotal of the work order',
      '{{ total }}': 'The total of the work order',
      '{{ outstanding }}': 'The amount that still has to be paid',
      '{{ paid }}': 'The amount that has been paid already',
      '{{ discount }}': 'The total discount of the work order (both order-level and line-item-level)',
      '{{ customFields.x }}': 'The value of the custom field with key x',
      '{{ charges[*].name }}': 'The name of the charge at index x',
      '{{ charges[*].shopifyOrderName }}': 'The name of the shopify order that the charge is in at index x',
      '{{ charges[*].details }}': 'Additional details about the charge at index x',
      '{{ charges[*].totalPrice }}': 'The total price of the charge at index x',
      '{{ charges[*].fullyPaid }}': 'Whether the charge at index x has been fully paid for',
    },
    purchaseOrders: {
      '{{ name }}': 'The name of the purchase order',
      '{{ date }}': 'The current date',
      '{{ shipFrom }}': 'The address the purchase order will be shipped from',
      '{{ shipTo }}': 'The address the purchase order will be shipped to',
      '{{ locationName }}': 'The name of the location the purchase order is in',
      '{{ vendor.name }}': 'The name of the vendor the purchase order is for',
      '{{ vendor.metafields.x }}': 'The value of the vendor metafield with key x',
      '{{ note }}': 'The note of the purchase order',
      '{{ discount }}': 'The discount amount of the purchase order',
      '{{ tax }}': 'The tax expense of the purchase order',
      '{{ shipping }}': 'The shipping cost of the purchase order',
      '{{ deposited }}': 'The amount deposited for the purchase order',
      '{{ paid }}': 'The amount paid for the purchase order',
      '{{ status }}': 'The status of the purchase order',
      '{{ customFields.x }}': 'The value of the custom field with key x',
      '{{ lineItems[*].name }}': 'The name of the line item at index x',
      '{{ lineItems[*].sku }}': 'The sku of the line item at index x',
      '{{ lineItems[*].unitCost }}': 'The unit cost of the line item at index x',
      '{{ lineItems[*].quantity }}': 'The quantity of the line item at index x',
      '{{ lineItems[*].totalCost }}': 'The total cost of the line item at index x',
      '{{ lineItems[*].customFields[y] }}': 'The value of the custom field with key y of the item at index x',
    },
  }[templateType];

  return (
    <BlockStack gap="400">
      <InlineStack align={'space-between'}>
        <Text as="h3" variant="headingMd">
          {title}
        </Text>

        <Button onClick={() => setModalOpened(true)} variant={'plain'}>
          View template variables
        </Button>
      </InlineStack>

      <Modal
        open={modalOpened}
        title={`${title} - Available Variables`}
        onClose={() => setModalOpened(false)}
        size={'large'}
      >
        <Modal.Section>
          <DescriptionList
            items={Object.entries(availableVariables).map(([term, description]) => ({
              term,
              description,
            }))}
          />
        </Modal.Section>
      </Modal>

      {templateNames
        .map(name => [name, templates[name]!] as const)
        .map(([name, template], i) => (
          <PrintTemplate
            key={i}
            name={name}
            template={template.template}
            subject={template.subject}
            setTemplate={(template: string) =>
              setSettings({
                ...settings,
                [templateType]: {
                  printTemplates: {
                    ...settings[templateType].printTemplates,
                    [name]: { ...settings[templateType].printTemplates[name], template },
                  },
                },
              })
            }
            setSubject={(subject: string) => {
              setSettings({
                ...settings,
                [templateType]: {
                  printTemplates: {
                    ...settings[templateType].printTemplates,
                    [name]: { ...settings[templateType].printTemplates[name], subject },
                  },
                },
              });
            }}
            onRemove={() => {
              const printTemplates = { ...settings[templateType].printTemplates };
              delete printTemplates[name];
              setSettings({
                ...settings,
                [templateType]: { ...settings[templateType], printTemplates },
              });
            }}
            setName={(newName: string) => {
              const printTemplates = {
                ...settings[templateType].printTemplates,
                [newName]: settings[templateType].printTemplates[name],
              };
              delete printTemplates[name];
              setSettings({
                ...settings,
                [templateType]: { ...settings[templateType], printTemplates },
              });

              setTemplateNames(templateNames =>
                templateNames.map(templateName => (templateName === name ? newName : templateName)),
              );
            }}
          />
        ))}
      <Button
        onClick={() => {
          let name = 'New template';
          if (name in settings[templateType]) {
            let i = 2;
            while (`${name} (${i})` in settings[templateType]) {
              i++;
            }
            name = `${name} (${i})`;
          }
          setSettings({
            ...settings,
            [templateType]: {
              ...settings[templateType],
              [name]: {
                template: '',
                subject: '',
              },
            },
          });
        }}
      >
        New template
      </Button>
    </BlockStack>
  );
}
