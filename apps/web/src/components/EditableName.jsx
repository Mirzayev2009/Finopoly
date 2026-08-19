import { useState } from 'react';
import { Check, PencilSimple, WarningCircle, X } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './EditableName.module.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const MAX_NAME_LENGTH = 60;

export default function EditableName({ name }) {
  const { session, refetchProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function startEditing() {
    setValue(name || '');
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Name can’t be empty.');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/profiles/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ display_name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'REQUEST_FAILED');
      await refetchProfile();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" className={styles.display} onClick={startEditing} aria-label="Edit your name">
        <span className={styles.name}>{name}</span>
        <PencilSimple className={styles.pencil} size={14} aria-hidden="true" />
      </button>
    );
  }

  return (
    <form className={styles.editRow} onSubmit={save}>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        aria-label="Your name"
      />
      <button type="submit" className={styles.iconButton} disabled={saving} aria-label="Save name">
        <Check size={16} weight="bold" />
      </button>
      <button type="button" className={styles.iconButton} disabled={saving} onClick={cancel} aria-label="Cancel">
        <X size={16} weight="bold" />
      </button>
      {error ? (
        <span className={styles.error} role="alert">
          <WarningCircle size={14} weight="fill" aria-hidden="true" />
          {error}
        </span>
      ) : null}
    </form>
  );
}
