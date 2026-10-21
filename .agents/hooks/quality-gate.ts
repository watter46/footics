import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let raw = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  raw += chunk;
});

process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(raw);

    if (payload.error) {
      console.log(JSON.stringify({}));
      process.exit(0);
    }

    const toolCall = payload.toolCall;
    if (!toolCall || !toolCall.args) {
      console.log(JSON.stringify({}));
      process.exit(0);
    }

    const targetFile =
      toolCall.args.TargetFile ||
      (typeof toolCall.args.Path === 'string'
        ? toolCall.args.Path.replace(/^["']|["']$/g, '').trim()
        : undefined);
    if (!targetFile) {
      console.log(JSON.stringify({}));
      process.exit(0);
    }

    if (!/\.(js|jsx|ts|tsx|json|jsonc|css)$/.test(targetFile)) {
      console.log(JSON.stringify({}));
      process.exit(0);
    }

    if (!fs.existsSync(targetFile)) {
      console.log(JSON.stringify({}));
      process.exit(0);
    }

    const projectRoot = path.resolve(__dirname, '../../');
    const biomeBin = path.join(projectRoot, 'node_modules/.bin/biome');
    const quotedFile = JSON.stringify(targetFile);

    try {
      const command = fs.existsSync(biomeBin)
        ? `${JSON.stringify(biomeBin)} check --write ${quotedFile}`
        : `bunx biome check --write ${quotedFile}`;

      execSync(command, {
        cwd: projectRoot,
        stdio: 'ignore',
      });
    } catch (err) {
      // Ignored intentionally
    }

    console.log(JSON.stringify({}));
  } catch (err) {
    console.log(JSON.stringify({}));
  }
});
