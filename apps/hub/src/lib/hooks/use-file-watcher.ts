import { useEffect } from 'react';
import { onFileChanged, type FileChangeEvent } from '../tauri';

export type FileChangeHandler = (event: FileChangeEvent) => void;

/**
 * Subscribe to file system change events from the Tauri backend.
 * Routes events to the appropriate handler based on path prefix.
 */
export function useFileWatcher(handlers: Record<string, FileChangeHandler>) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    onFileChanged((event) => {
      for (const path of event.paths) {
        const normalizedPath = path.replace(/\\/g, '/');

        for (const [prefix, handler] of Object.entries(handlers)) {
          if (normalizedPath.includes(prefix)) {
            handler(event);
            break;
          }
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [handlers]);
}
