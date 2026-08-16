import { useId, useState } from 'react';
import { Eye, EyeSlash, WarningCircle } from '@phosphor-icons/react';
import styles from './TextField.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function TextField({ label, id, type = 'text', error, icon: Icon, className, ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && reveal ? 'text' : type;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={cx(styles.inputWrap, error && styles.hasError)}>
        {Icon ? <Icon size={18} className={styles.icon} aria-hidden="true" /> : null}
        <input
          id={inputId}
          type={resolvedType}
          className={styles.input}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className={styles.error} role="alert">
          <WarningCircle size={14} weight="fill" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
