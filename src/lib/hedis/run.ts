// CLI: `npm run engine`
import { runEngine } from './engine';

runEngine()
  .then((s) => {
     
    console.log('Engine run complete:');
     
    console.table(s.results.map(({ measureId, dataTier, eligiblePopulation, combinedNumerator, gapCount, rate }) => ({
      measureId, dataTier, eligible: eligiblePopulation, numerator: combinedNumerator, gaps: gapCount, ratePct: rate
    })));
     
    console.log(`Total open gaps: ${s.totalGaps}, engagement queue: ${s.totalEngagementEntries}`);
  })
  .catch((err) => {
     
    console.error(err);
    process.exit(1);
  });
