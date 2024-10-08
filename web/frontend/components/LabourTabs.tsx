import { TabsProps, Tabs } from '@shopify/polaris';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export type LabourType = 'fixed' | 'hourly';
export const LabourTabIndex: Record<LabourType, number> = {
  fixed: 0,
  hourly: 1,
};
export const ReverseLabourTabIndex: Record<number, LabourType> = Object.fromEntries(
  Object.entries(LabourTabIndex).map(([key, value]) => [value, key as LabourType]),
);

const labourTypes: LabourType[] = Object.keys(LabourTabIndex) as LabourType[];

export function LabourTabs({
  labourType,
  onSelect,
  ...props
}: Omit<TabsProps, 'tabs' | 'selected' | 'onSelect'> & {
  labourType: LabourType;
  onSelect: (tab: LabourType) => void;
}) {
  return (
    <Tabs
      tabs={labourTypes.map(tab => ({ id: tab, content: sentenceCase(tab) }))}
      selected={LabourTabIndex[labourType]}
      onSelect={idx => {
        const labourType = ReverseLabourTabIndex[idx];
        if (labourType) onSelect(labourType);
      }}
      {...props}
    />
  );
}
