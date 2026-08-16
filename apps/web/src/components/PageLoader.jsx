import styles from './PageLoader.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function PageLoader({ label = 'Loading…', fullScreen = true }) {
  return (
    <div className={cx(styles.wrap, fullScreen ? styles.fullScreen : styles.inline)} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.label}>{label}</p>
    </div>
  );
}
