import styles from './Button.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        className,
      )}
      {...rest}
    >
      <span className={styles.content}>
        {Icon && iconPosition === 'left' ? <Icon size={18} weight="bold" aria-hidden="true" /> : null}
        {children}
        {Icon && iconPosition === 'right' ? <Icon size={18} weight="bold" aria-hidden="true" /> : null}
      </span>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
    </button>
  );
}
