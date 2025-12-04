import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
}

const isInputElement = (element: Element | null): boolean => {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  const isContentEditable = element.getAttribute('contenteditable') === 'true';
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
};

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(event.target as Element)) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};
