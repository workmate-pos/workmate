import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDynamicRef } from './use-dynamic-ref.js';

// TODO: All form stuff in unified package: @teifi-digital/pos-form

const FormContext = createContext<FormContextValue | null>(null);

type FormContextValue = {
  disabled: boolean;
  setIsValid: (name: string, isValid: boolean) => void;
  getIsValid: (name: string) => boolean | undefined;
  clearIsValid: (name: string) => void;
};

export const useFormContext = (name?: string) => {
  const formContext = useContext(FormContext);

  const internalName = useMemo(() => name ?? Math.random().toString(36).substring(7), [name]);
  const previousInternalNameRef = useRef<string>();

  useEffect(() => {
    if (!formContext) return;

    if (previousInternalNameRef.current) {
      const isValid = formContext.getIsValid(previousInternalNameRef.current);

      if (isValid !== undefined) {
        formContext.setIsValid(internalName, isValid);
      }

      formContext.clearIsValid(previousInternalNameRef.current);
    }

    previousInternalNameRef.current = internalName;
  }, [internalName]);

  const setIsValid = useCallback(
    (isValid: boolean) => formContext?.setIsValid(internalName, isValid),
    [internalName, formContext?.setIsValid],
  );

  if (!formContext) {
    return null;
  }

  return {
    disabled: formContext.disabled,
    setIsValid,
  };
};

// TODO: Detect when some child is being modified and make all hide their errors
// TODO: Button component. allow first click and then show errors
// TODO: isLoading
export const useForm = () => {
  const [validityStates, setValidityStates] = useState<Record<string, boolean>>({});
  const isValid = Object.values(validityStates).every(isValid => isValid);

  const setValidityStatesRef = useDynamicRef(() => setValidityStates, [setValidityStates]);

  const Form = useCallback(
    ({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) => {
      const setIsValid = (name: string, isValid: boolean) =>
        setValidityStatesRef.current(prev => {
          if (prev[name] === isValid) return prev;
          return { ...prev, [name]: isValid };
        });
      const getIsValid = (name: string) => validityStates[name];
      const clearIsValid = (name: string) =>
        setValidityStatesRef.current(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== name)));

      return (
        <FormContext.Provider value={{ disabled, setIsValid, getIsValid, clearIsValid }}>
          {children}
        </FormContext.Provider>
      );
    },
    [setValidityStatesRef],
  );

  return { Form, isValid };
};
