// 徽章位置登記（相機聚焦用）— v1.0 · © SCOUT SYSTEM
import { createContext, useContext } from 'react';

export const RegistryContext = createContext(null);
export const useRegistry = () => useContext(RegistryContext);
export const createRegistry = () => new Map();
