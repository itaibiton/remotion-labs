"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * SSR-safe localStorage hook.
 *
 * Initializes with `initialValue` during SSR and first render (no
 * hydration mismatch). Reads the persisted value from localStorage
 * in a useEffect that only runs on the client after hydration.
 * Writes are synchronous to state and localStorage.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Always initialize with the default value (SSR-safe)
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Read from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Write to localStorage on change
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`Error writing localStorage key "${key}":`, error);
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
