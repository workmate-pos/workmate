import { Dispatch, ReactNode, SetStateAction } from 'react';
import { Icon, Image, Section, Selectable, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';

// TODO: Put something like this in universal-ui (POS list sucks because elements are not components)

export function List({
  children,
  title,
  action,
  pre,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  pre?: ReactNode;
}) {
  return (
    <Stack direction="vertical" spacing={2}>
      {(!!title || !!action) && (
        <Stack direction="horizontal" alignment="space-between">
          <Text variant="headingLarge">{title}</Text>

          {action}
        </Stack>
      )}

      {pre}

      <Section>{children}</Section>
    </Stack>
  );
}

List.EmptyState = ListEmptyState;

function ListEmptyState({ title }: { title: string }) {
  return (
    <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
      <Text variant="body" color="TextSubdued">
        {title}
      </Text>
    </Stack>
  );
}

List.Item = ListItem;

function ListItem({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <Selectable onPress={onClick ?? (() => {})} disabled={disabled || !onClick}>
      <Stack
        direction="horizontal"
        spacing={2}
        alignment="space-between"
        paddingVertical="Small"
        paddingHorizontal="Small"
        flexChildren
        flexWrap="nowrap"
      >
        {children}
      </Stack>
    </Selectable>
  );
}

ListItem.Left = ListItemLeft;

function ListItemLeft({
  title,
  subtitle,
  imageUrl,
  alwaysShowImage,
}: {
  imageUrl?: string;
  title: string;
  subtitle?: string;
  alwaysShowImage?: boolean;
}) {
  return (
    <Stack direction="horizontal" spacing={1} alignment="flex-start">
      {(!!imageUrl || alwaysShowImage) && <Image src={imageUrl} />}

      <Stack direction="vertical" spacing={0.5}>
        <Text variant="headingSmall">{title}</Text>

        {!!subtitle && (
          <Text variant="captionMedium" color="TextSubdued">
            {subtitle}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

ListItem.Chevron = ListItemChevron;
ListItem.Toggle = ListItemToggle;

function ListItemChevron() {
  return <Icon size="major" name="chevron-right" />;
}

function ListItemToggle({ value, onChange }: { value: boolean; onChange: Dispatch<SetStateAction<boolean>> }) {
  return (
    <Selectable onPress={() => onChange(x => !x)}>
      <Icon size="major" name={value ? 'checkmark-active' : 'checkmark-inactive'} />
    </Selectable>
  );
}
