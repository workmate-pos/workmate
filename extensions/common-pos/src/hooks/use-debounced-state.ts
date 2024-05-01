import { createUseDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { useRef, useState } from 'react';

export const useDebouncedState = createUseDebouncedState({ useRef, useState });
