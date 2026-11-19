import { createContext } from 'react';
import type { BackTarget } from './links';

/**
 * Lets a page put its back link in the app's top bar, which stays on screen while the page
 * scrolls. The Shell provides the setter; PageHeader's BackLink calls it.
 */
export const HeaderBackContext = createContext<(target: BackTarget | null) => void>(() => {});
