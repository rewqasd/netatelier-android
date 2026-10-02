import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
const compose=readFileSync(new URL('./compose.yaml',import.meta.url),'utf8');
assert.match(compose,/network_mode: host/);assert.doesNotMatch(compose,/ports:|privileged:|docker.sock/);
assert.match(compose,/DEEPSEEK_ENABLED: "0"/);assert.match(compose,/read_only: true/);
const [major,minor]=process.versions.node.split('.').map(Number);assert.ok(major>26||major===26&&minor>=8,'Node >=26.8 required');
console.log('Private deployment static checks passed; Docker runtime and server deployment still require verification.');
