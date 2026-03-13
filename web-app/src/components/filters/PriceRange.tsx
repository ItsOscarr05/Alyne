import { useState, useEffect } from 'react';
import styles from './PriceRange.module.css';

interface PriceRangeProps {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

export function PriceRange({ min, max, onChange }: PriceRangeProps) {
  const [minVal, setMinVal] = useState(min ?? '');
  const [maxVal, setMaxVal] = useState(max ?? '');

  useEffect(() => {
    setMinVal(min ?? '');
    setMaxVal(max ?? '');
  }, [min, max]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setMinVal(v);
    const n = v === '' ? null : parseInt(v, 10);
    if (n !== null && !isNaN(n)) {
      onChange(n, max);
    } else if (v === '') {
      onChange(null, max);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setMaxVal(v);
    const n = v === '' ? null : parseInt(v, 10);
    if (n !== null && !isNaN(n)) {
      onChange(min, n);
    } else if (v === '') {
      onChange(min, null);
    }
  };

  return (
    <div className={styles.range}>
      <div className={styles.inputRow}>
        <label className={styles.label}>
          Min
          <input
            type="number"
            min={0}
            placeholder="0"
            value={minVal}
            onChange={handleMinChange}
            className={styles.input}
          />
        </label>
        <span className={styles.sep}>–</span>
        <label className={styles.label}>
          Max
          <input
            type="number"
            min={0}
            placeholder="Any"
            value={maxVal}
            onChange={handleMaxChange}
            className={styles.input}
          />
        </label>
      </div>
      <p className={styles.hint}>Enter price per session ($)</p>
    </div>
  );
}
