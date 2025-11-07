import { useRef } from "react";

const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  const debounced = (...args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };

  return debounced;
};

export default useDebounce
