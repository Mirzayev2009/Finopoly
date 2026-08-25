// Prints, per era, investment counts and every entry flagged `estimated` or
// `needsReview`, so figures pulled from the source doc can be reviewed in
// one pass. Run with: node scripts/audit-content.js
import { ERAS } from '../packages/content/eras.js';

let totalFlags = 0;

for (const era of ERAS) {
  const good = era.investments.filter((inv) => inv.type === 'Good').length;
  const bad = era.investments.filter((inv) => inv.type === 'Bad').length;
  const flagged = era.investments.filter((inv) => inv.estimated || inv.needsReview);

  console.log(`\n${era.id} — ${era.title} (${era.years})`);
  console.log(`  investments: ${era.investments.length} total, ${good} Good, ${bad} Bad`);

  if (flagged.length === 0) {
    console.log('  flagged: none');
  } else {
    console.log(`  flagged: ${flagged.length}`);
    for (const inv of flagged) {
      const tags = [inv.estimated && 'estimated', inv.needsReview && 'needsReview']
        .filter(Boolean)
        .join(', ');
      console.log(`    [${tags}] ${inv.id} — ${inv.name}: ${inv.percentage}% — ${inv.reason}`);
    }
  }

  totalFlags += flagged.length;
}

console.log(`\n${ERAS.length} eras, ${totalFlags} entries flagged for review.`);
