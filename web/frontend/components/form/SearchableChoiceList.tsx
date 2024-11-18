import { useId, useState } from 'react';
import { BlockStack, Button, Checkbox, Collapsible, Icon, InlineStack, Text, TextField } from '@shopify/polaris';
import { SearchMinor } from '@shopify/polaris-icons';

export type SearchableChoiceListChoice = {
  label: string;
  helpText?: string;
  value: string;
};

/**
 * Choice list + searching + "show more/less" buttons
 */
export function SearchableChoiceList({
  searchable = false,
  limit = 5,

  title,
  choices,
  selected,
  onChange,
  resourceName = { singular: 'choice', plural: 'choices' },
  disabled,
}: {
  title?: string;
  limit?: number;
  searchable?: boolean;
  choices: SearchableChoiceListChoice[];
  selected: string[];
  onChange: (selected: string[]) => void;
  resourceName?: { singular: string; plural: string };
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [displayHiddenChoices, setDisplayHiddenChoices] = useState(false);

  const queryFilter = (choice: SearchableChoiceListChoice) => {
    return (
      choice.value.toLowerCase().includes(query.toLowerCase()) ||
      choice.label.toLowerCase().includes(query.toLowerCase()) ||
      choice.helpText?.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filteredChoices = choices.filter(choice => !searchable || !query || queryFilter(choice));
  const shownChoices = filteredChoices.slice(0, limit);
  const hiddenChoices = filteredChoices.slice(limit);

  const renderChoice = (choice: SearchableChoiceListChoice) => (
    <Checkbox
      label={choice.label}
      value={choice.value}
      helpText={choice.helpText}
      checked={selected.includes(choice.value)}
      onChange={checked => {
        if (checked) {
          onChange([...selected, choice.value]);
        } else {
          onChange(selected.filter(v => v !== choice.value));
        }
      }}
      disabled={disabled}
    />
  );

  const collapsibleId = useId();

  return (
    <BlockStack gap="200">
      {title && (
        <Text as="h2" variant="headingMd" fontWeight="bold">
          {title}
        </Text>
      )}

      {searchable && (
        <TextField
          label={'Search'}
          labelHidden
          autoComplete="off"
          value={query}
          onChange={setQuery}
          size="slim"
          placeholder={`Search ${resourceName.plural}`}
          clearButton
          onClearButtonClick={() => setQuery('')}
          prefix={<Icon source={SearchMinor} tone="base" />}
        />
      )}

      {shownChoices.length === 0 && (
        <Text as="p" variant="bodyMd" tone="subdued">
          No {resourceName.plural} found
        </Text>
      )}

      {shownChoices.map(renderChoice)}

      <Collapsible id={collapsibleId} open={hiddenChoices.length > 0 && displayHiddenChoices}>
        <BlockStack gap="200">{hiddenChoices.map(renderChoice)}</BlockStack>
      </Collapsible>

      {displayHiddenChoices && hiddenChoices.length > 0 && (
        <InlineStack>
          <Button onClick={() => setDisplayHiddenChoices(false)} variant="plain">
            Show less
          </Button>
        </InlineStack>
      )}

      {!displayHiddenChoices && hiddenChoices.length > 0 && (
        <InlineStack>
          <Button onClick={() => setDisplayHiddenChoices(true)} variant="plain">
            Show more ({hiddenChoices.length.toString()})
          </Button>
        </InlineStack>
      )}
    </BlockStack>
  );
}
