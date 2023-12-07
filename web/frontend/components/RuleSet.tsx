import React, { ReactNode, useEffect, useState } from 'react';
import { ChoiceList, ChoiceListProps, Text } from '@shopify/polaris';
import { FeedbackLoopAdjacencyList, findInfiniteFeedbackLoop } from '../util/infinite-feedback-loop-detector';

export type Rule = {
  /**
   * String used to identify this rule within this rule set
   */
  value: string;
  title: string;
  description?: string;
  /**
   * Rules values that must be selected for this rule to be selectable
   */
  requiredRules?: string[];
  /**
   * Rule values that disable this rule when selected
   */
  conflictingRules?: string[];
  renderChildren?: () => ReactNode;
  onSelect?: () => void;
  onDeselect?: () => void;
};

/**
 * A set of selectable, possibly interdependent rules that may have their own content
 */
export function RuleSet({
  title,
  rules,
  onChange,
  activeRules,
}: {
  title: string;
  rules: Rule[];
  onChange?: (activeRules: string[]) => void;
  activeRules: string[];
}) {
  const ruleValidationError = validateRules(rules);

  const [disabledRuleValues, setDisabledRuleValues] = useState<string[]>([]);

  const choices: ChoiceListProps['choices'] = rules.map(rule => {
    return {
      value: rule.value,
      label: rule.title,
      helpText: rule.description,
      disabled: disabledRuleValues.includes(rule.value),
      renderChildren(isSelected: boolean): React.ReactNode | false {
        if (!isSelected || !rule.renderChildren) {
          return false;
        }

        return rule.renderChildren();
      },
    };
  });

  useEffect(
    function processConflicts() {
      if (ruleValidationError) return;

      const newDisabledRuleValues = [...disabledRuleValues];
      const newActiveRules = [...activeRules];

      let changed = true;
      let shouldUpdate = false;

      let remainingIterations = rules.length;

      while (changed) {
        // just in case
        if (remainingIterations-- <= 0) {
          break;
        }

        changed = false;

        for (const rule of rules) {
          const allRequiredRulesActive = (rule.requiredRules ?? []).every(requiredRule =>
            newActiveRules.includes(requiredRule),
          );
          const noConflictingRulesActive = (rule.conflictingRules ?? [])?.every(
            conflictingRule => !newActiveRules.includes(conflictingRule),
          );

          const shouldBeEnabled = allRequiredRulesActive && noConflictingRulesActive;
          const isEnabled = !newDisabledRuleValues.includes(rule.value);

          if (shouldBeEnabled && !isEnabled) {
            newDisabledRuleValues.splice(newDisabledRuleValues.indexOf(rule.value), 1);
            changed = true;
          } else if (!shouldBeEnabled && isEnabled) {
            newDisabledRuleValues.push(rule.value);
            changed = true;
          }
        }

        shouldUpdate ||= changed;
      }

      if (shouldUpdate) {
        setDisabledRuleValues(newDisabledRuleValues);
        _onChange(newActiveRules);
      }
    },
    [rules, activeRules],
  );

  function _onChange(selected: string[]) {
    const newlySelected = selected.filter(v => !activeRules.includes(v));
    const unselected = activeRules.filter(v => !selected.includes(v));

    for (const rule of rules) {
      if (newlySelected.includes(rule.value)) rule.onSelect?.();
      if (unselected.includes(rule.value)) rule.onDeselect?.();
    }

    onChange?.(selected);
  }

  if (ruleValidationError) {
    return (
      <Text as="p" tone="critical">
        Detected an infinite feedback loop in the rules: {ruleValidationError}
      </Text>
    );
  }

  return <ChoiceList title={title} choices={choices} selected={activeRules} onChange={_onChange} allowMultiple />;
}

function validateRules(rules: Rule[]): string | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const adjacencyList: FeedbackLoopAdjacencyList = {};

  for (const rule of rules) {
    adjacencyList[rule.value] ??= { positive: new Set(), negative: new Set() };

    for (const requiredRuleValue of rule.requiredRules ?? []) {
      adjacencyList[rule.value].positive.add(requiredRuleValue);
    }

    for (const conflictingRuleValue of rule.conflictingRules ?? []) {
      adjacencyList[conflictingRuleValue] ??= { positive: new Set(), negative: new Set() };
      adjacencyList[conflictingRuleValue].negative.add(rule.value);
    }
  }

  const infiniteFeedbackLoop = findInfiniteFeedbackLoop(adjacencyList);

  if (!infiniteFeedbackLoop) {
    return null;
  }

  let errorMessage = '';

  for (let i = 0; i < infiniteFeedbackLoop.length - 1; i++) {
    const [[rule, feedback], [nextRule, nextFeedback]] = infiniteFeedbackLoop.slice(i, i + 2);

    const relation = nextFeedback === feedback ? 'requires' : 'conflicts with';

    if (i === 0) errorMessage += `[${rule}]`;
    errorMessage += ` ${relation} [${nextRule}]`;
  }

  return errorMessage;
}
