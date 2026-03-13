import { X } from 'lucide-react';
import styles from './ActiveFilters.module.css';

export interface ActiveFilterItem {
  key: string;
  label: string;
}

interface ActiveFiltersProps {
  filters: ActiveFilterItem[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
}

export function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className={styles.container}>
      {filters.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={styles.chip}
          onClick={() => onRemove(key)}
        >
          <span>{label}</span>
          <X size={14} />
        </button>
      ))}
      {onClearAll && filters.length > 0 && (
        <button type="button" className={styles.clearAll} onClick={onClearAll}>
          Clear all
        </button>
      )}
    </div>
  );
}
