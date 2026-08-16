import styles from './Logo.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function Logo({ size = 'md', className }) {
  return <span className={cx(styles.logo, styles[size], className)}>Estate</span>;
}
