import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import Button from './Button.jsx';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { profile, signOut } = useAuth();

  return (
    <header className={styles.bar}>
      <Logo size="sm" />
      <div className={styles.right}>
        {profile?.email ? <span className={styles.email}>{profile.email}</span> : null}
        <Button variant="ghost" size="sm" icon={SignOut} onClick={signOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
