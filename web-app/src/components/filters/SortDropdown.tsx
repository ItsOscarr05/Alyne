import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import styles from './SortDropdown.module.css';

export type SortOption = 'rating' | 'price_asc' | 'price_desc' | 'distance' | 'reviews';

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'distance', label: 'Nearest' },
  { value: 'reviews', label: 'Most reviews' },
];

interface SortDropdownProps {
  value: SortOption | null;
  onChange: (value: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const currentLabel = value ? OPTIONS.find((o) => o.value === value)?.label ?? 'Sort by' : 'Sort by';

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{currentLabel}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <ul
          className={styles.menu}
          role="listbox"
        >
          {OPTIONS.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              className={`${styles.option} ${value === opt.value ? styles.selected : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
