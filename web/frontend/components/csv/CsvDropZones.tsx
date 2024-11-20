import { BlockStack, DropZone, Icon, InlineGrid, Text } from '@shopify/polaris';
import { FileMinor } from '@shopify/polaris-icons';
import { useToast } from '@teifi-digital/shopify-app-react';

export function CsvDropZones({
  files,
  columns = files.length,
}: {
  files: {
    name: string;
    file: File | undefined;
    setFile: (file: File | undefined) => void;
  }[];
  columns?: number;
}) {
  const [toast, setToastAction] = useToast();

  return (
    <InlineGrid gap={'200'} columns={columns} alignItems="end">
      {files.map(({ name, file, setFile }) => (
        <DropZone
          key={name}
          label={name}
          active={!file}
          type="file"
          allowMultiple={false}
          onDropAccepted={([file]) => setFile(file)}
          onDropRejected={() => setToastAction({ content: 'Invalid file type' })}
          accept="text/csv"
        >
          {!file && <DropZone.FileUpload actionTitle="Upload" />}
          {file && (
            <BlockStack align="center" inlineAlign="center">
              <Icon source={FileMinor} tone="base" />
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                {file.name}
              </Text>
            </BlockStack>
          )}
        </DropZone>
      ))}

      {toast}
    </InlineGrid>
  );
}
