import { validateContent } from "../src/lib/validate";

const issues = validateContent();
const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warning");

for (const i of warnings) console.log(`warning  ${i.where}: ${i.message}`);
for (const i of errors) console.log(`error    ${i.where}: ${i.message}`);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
