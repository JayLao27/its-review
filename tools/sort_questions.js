const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'questions.json');
let s = fs.readFileSync(file, 'utf8');
// join multiple top-level arrays into a single array of arrays
const wrapped = '[' + s.replace(/\]\s*\[/g, '],[') + ']';
let arrays;
try {
  arrays = JSON.parse(wrapped);
} catch (err) {
  console.error('Failed to parse JSON. Aborting.');
  console.error(err.message);
  process.exit(2);
}
const merged = arrays.flat();
merged.sort((a, b) => {
  const ai = Number(a.id);
  const bi = Number(b.id);
  if (ai !== bi) return ai - bi;
  const aq = (a.question || '').localeCompare(b.question || '');
  return aq;
});
fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n');
console.log('Wrote', merged.length, 'questions to', file);
