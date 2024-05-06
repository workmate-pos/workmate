import { BlockStack, Button, Card, TextField } from '@shopify/polaris';

/**
 * Configuration for a specific print template.
 */
export function PrintTemplate({
  name,
  template,
  subject,
  setName,
  setTemplate,
  setSubject,
  onRemove,
}: {
  name: string;
  template: string;
  subject: string;
  setName: (name: string) => void;
  setTemplate: (template: string) => void;
  setSubject: (subject: string) => void;
  onRemove: () => void;
}) {
  return (
    <BlockStack gap="400">
      <TextField label="Name" autoComplete="off" value={name} onChange={setName} />
      <TextField label={`Subject`} autoComplete={'off'} value={subject} onChange={value => setSubject(value)} />
      <TextField
        label={`Template`}
        autoComplete={'off'}
        multiline
        maxHeight={350}
        value={template}
        onChange={value => setTemplate(value)}
      />
      <Button onClick={onRemove} tone={'critical'}>
        Remove
      </Button>
    </BlockStack>
  );
}
