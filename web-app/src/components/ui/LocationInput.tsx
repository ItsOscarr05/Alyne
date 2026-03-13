import { FormField } from './FormField';
import styles from './LocationInput.module.css';

interface LocationInputProps {
  city: string;
  state: string;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  cityPlaceholder?: string;
  statePlaceholder?: string;
}

const US_STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

export function LocationInput({
  city,
  state,
  onCityChange,
  onStateChange,
  cityPlaceholder = 'Enter your city',
  statePlaceholder = 'State',
}: LocationInputProps) {
  return (
    <div className={styles.container}>
      <FormField
        label="City"
        type="text"
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        placeholder={cityPlaceholder}
        autoComplete="address-level2"
      />
      <div className={styles.stateField}>
        <label className={styles.label}>
          State <span className={styles.required}>*</span>
        </label>
        <select
          value={state}
          onChange={(e) => onStateChange(e.target.value)}
          className={styles.select}
          required
        >
          <option value="">{statePlaceholder}</option>
          {US_STATE_ABBREVIATIONS.map((abbr) => (
            <option key={abbr} value={abbr}>
              {abbr}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
