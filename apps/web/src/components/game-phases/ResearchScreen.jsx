import { useEffect, useRef, useState } from 'react';
import Countdown from '../game/Countdown.jsx';
import { subscribeToTyping } from '../../lib/presence.js';
import styles from './ResearchScreen.module.css';

const NOTES_DEBOUNCE_MS = 400;
const TYPING_CLEAR_MS = 2000;

/**
 * @param {{
 *   round: object, deadline: number|null, team: object, isAnalyst: boolean,
 *   analystName: string, gameCode: string, dispatchAction: (type: string, payload?: object) => Promise<any>,
 * }} props
 */
export default function ResearchScreen({ round, deadline, team, isAnalyst, analystName, gameCode, dispatchAction }) {
  const [draft, setDraft] = useState(team.notes || '');
  const [typingLabel, setTypingLabel] = useState(null);
  const debounceRef = useRef(null);
  const typingRef = useRef(null);
  const typingClearRef = useRef(null);

  // Non-analysts always mirror the server value; the analyst's own draft
  // stays local between debounced pushes (avoids the textarea jumping
  // under their cursor on every wholesale state replace).
  useEffect(() => {
    if (!isAnalyst) setDraft(team.notes || '');
  }, [team.notes, isAnalyst]);

  useEffect(() => {
    const typing = subscribeToTyping(gameCode, team.id, (payload) => {
      setTypingLabel(payload.name);
      clearTimeout(typingClearRef.current);
      typingClearRef.current = setTimeout(() => setTypingLabel(null), TYPING_CLEAR_MS);
    });
    typingRef.current = typing;
    return () => {
      typing.unsubscribe();
      clearTimeout(typingClearRef.current);
    };
  }, [gameCode, team.id]);

  function handleChange(e) {
    const value = e.target.value;
    setDraft(value);
    typingRef.current?.send({ name: analystName });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatchAction('UPDATE_NOTES', { text: value });
    }, NOTES_DEBOUNCE_MS);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Countdown deadline={deadline} size="lg" />
      </div>

      <div className={styles.split}>
        <div className={styles.pane}>
          <h2 className={styles.paneTitle}>Research questions</h2>
          <ul className={styles.questionList}>
            {round.researchQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>

        <div className={styles.pane}>
          <div className={styles.notesHeader}>
            <h2 className={styles.paneTitle}>Team notes</h2>
            {typingLabel && !isAnalyst ? <span className={styles.typing}>{typingLabel} is typing…</span> : null}
          </div>
          {isAnalyst ? (
            <textarea
              className={styles.notes}
              value={draft}
              onChange={handleChange}
              placeholder="Write what your team is finding..."
            />
          ) : (
            <div className={styles.notesReadonly}>
              {team.notes ? team.notes : <span className={styles.placeholder}>No notes yet.</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
