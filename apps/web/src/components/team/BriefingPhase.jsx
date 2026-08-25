import styles from './BriefingPhase.module.css';

export default function BriefingPhase({ era }) {
  if (!era) {
    return <div className={styles.empty}>Waiting for the host to start the era…</div>;
  }

  return (
    <div className={styles.phase}>
      <div className={styles.eraHeader}>
        <span className={styles.eraTitle}>{era.title}</span>
        <span className={styles.eraYears}>{era.years}</span>
      </div>
      <p className={styles.summary}>{era.summary}</p>

      <h2 className={styles.sectionTitle}>Research questions</h2>
      <ol className={styles.questions}>
        {era.researchQuestions.map((q) => (
          <li key={q} className={styles.question}>{q}</li>
        ))}
      </ol>
    </div>
  );
}
