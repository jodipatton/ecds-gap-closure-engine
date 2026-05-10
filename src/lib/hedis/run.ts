// CLI: `npm run engine`
import { runEngine } from './engine';

runEngine()
  .then((s) => {
    // eslint-disable-next-line no-console
    console.log('Engine run complete:');
    // eslint-disable-next-line no-console
    console.table(s.results.map(({ measureId, dataTier, eligiblePopulation, combinedNumerator, gapCount, rate }) => ({
      measureId, dataTier, eligible: eligiblePopulation, numerator: combinedNumerator, gaps: gapCount, ratePct: rate
    })));
    // eslint-disable-next-line no-console
    console.log(`Total open gaps: ${s.totalGaps}, engagement queue: ${s.totalEngagementEntries}`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
