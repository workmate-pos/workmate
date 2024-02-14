import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { useDynamicRef } from './use-dynamic-ref.js';

const FormContext = createContext<FormContextValue | null>(null);

type FormContextValue = {
  disabled: boolean;
  setValidity: (name: string, validity: boolean) => void;
  /**
   * Removes any validity state for the given field.
   * Should be called when unmounting a field to prevent memory leaks.
   */
  clearValidity: (name: string) => void;
};

export const useFormContext = () => useContext(FormContext);

export const useForm = () => {
  const [validityStates, setValidityStates] = useState<Record<string, boolean>>({});
  const isValid = Object.values(validityStates).every(isValid => isValid);

  const setValidityStatesRef = useDynamicRef(() => setValidityStates, [setValidityStates]);

  const Form = useCallback(
    ({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) => {
      const setValidity = (name: string, valid: boolean) =>
        setValidityStatesRef.current(prev => ({ ...prev, [name]: valid }));
      const clearValidity = (name: string) =>
        setValidityStatesRef.current(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== name)));

      return <FormContext.Provider value={{ disabled, setValidity, clearValidity }}>{children}</FormContext.Provider>;
    },
    [setValidityStatesRef],
  );

  return { Form, isValid };
};
