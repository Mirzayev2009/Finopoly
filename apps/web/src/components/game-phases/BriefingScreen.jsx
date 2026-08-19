import { CheckCircle } from '@phosphor-icons/react';
import styles from './BriefingScreen.module.css';

/**
 * @param {{ round: object, roundNumber: number }} props
 */
export default function BriefingScreen({ round, roundNumber }) {
  return (
    <div className={styles.page}>
      <span className={styles.roundBadge}>
        Round {roundNumber} <span className={styles.roundBadgeMuted}>/ 4</span>
      </span>
      <span className={styles.year}>{round.year}</span>
      <h1 className={styles.title}>{round.title}</h1>
      <p className={styles.briefing}>{round.briefing}</p>

      <div className={styles.questions}>
        <span className={styles.questionsLabel}>Research questions</span>
        <ul className={styles.questionList}>
          {round.researchQuestions.map((question) => (
            <li key={question} className={styles.question}>
              <CheckCircle size={18} aria-hidden="true" />
              {question}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
