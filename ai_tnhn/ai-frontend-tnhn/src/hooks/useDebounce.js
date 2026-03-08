import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a value.
 * @param value The value to be debounced.
 * @param delay The delay in milliseconds.
 * @returns The debounced value.
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
