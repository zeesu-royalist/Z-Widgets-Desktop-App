import { BrowserWindow } from 'electron';
export declare const setIsQuitting: (q: boolean) => void;
export declare const getIsQuitting: () => boolean;
export declare const getMainWindow: () => BrowserWindow | null;
export declare function createMainWindow(): BrowserWindow;
export declare function showMainWindow(): void;
export declare function hideMainWindow(): void;
export declare function toggleMainWindow(): void;
