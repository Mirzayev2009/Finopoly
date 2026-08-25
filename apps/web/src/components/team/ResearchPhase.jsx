import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown.js';
import { useTeamNotes } from '../../hooks/useTeamNotes.js';
import { useTypingIndicator } from '../../hooks/useTypingIndicator.js';
import styles from './ResearchPhase.module.css';

export default function ResearchPhase({ era, room, syndicate, roomSlug, accessToken, myName }) {
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const remainingMs = useCountdown(room.timerDeadline);
  const { text, setText } = useTeamNotes(roomSlug, accessToken, syndicate.notes);
  const { typingName, notifyTyping } = useTypingIndicator(roomSlug, syndicate.id, myName);

  return (
    <div className={styles.phase}>
      {room.timerDeadline && (
        <div className={`${styles.timer} timer`}>{formatCountdown(remainingMs)}</div>
      )}

      {era && (
        <div className={styles.collapsible}>
          <button
            type="button"
            className={styles.collapsibleHeader}
            onClick={() => setQuestionsOpen((v) => !v)}
            aria-expanded={questionsOpen}
          >
            <span>Research questions</span>
            <CaretDown size={16} weight="bold" className={questionsOpen ? styles.caretOpen : undefined} />
          </button>
          {questionsOpen && (
            <ol className={styles.questions}>
              {era.researchQuestions.map((q) => (
                <li key={q} className={styles.question}>{q}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className={styles.notesArea}>
        <div className={styles.notesHeader}>
          <span className={styles.notesLabel}>Team notes</span>
          <span className={styles.typingLine}>{typingName ? `${typingName} is typing…` : ''}</span>
        </div>
        <textarea
          className={styles.notesInput}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            notifyTyping();
          }}
          placeholder="What did you find? Write it here — your teammates see it live."
        />
      </div>
    </div>
  );
}
