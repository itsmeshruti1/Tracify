import { mkdirSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const root = 'java/src';
const files = readdirSync(root, { recursive: true }).filter(p => String(p).endsWith('.java')).map(p => `${root}/${p}`);
mkdirSync('java/target/classes', { recursive: true });
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.error) { console.error('JDK 17+ is required:', result.error.message); process.exit(1); }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run('javac', ['-encoding', 'UTF-8', '-d', 'java/target/classes', ...files]);
run('java', ['-cp', 'java/target/classes', 'com.tracify.RiskCalculatorTest']);
