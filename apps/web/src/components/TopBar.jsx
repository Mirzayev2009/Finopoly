import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import Button from './Button.jsx';
import EditableName from './EditableName.jsx';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { profile, profileLoading, signOut } = useAuth();
  const name = profile?.display_name || profile?.email?.split('@')[0] || null;

  return (
    <header className={styles.bar}>
      <Logo size="sm" />
      <div className={styles.right}>
        {!profileLoading && name ? <EditableName name={name} /> : null}
        <Button variant="ghost" size="sm" icon={SignOut} onClick={signOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
