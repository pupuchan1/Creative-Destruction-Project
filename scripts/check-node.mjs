const [major, minor, patch] = process.versions.node.split('.').map(Number);
if (major !== 24 || minor < 22 || (minor === 22 && patch < 1)) {
  console.error(
    'Node.js 24.22.1以上の24系LTSを使用してください。nvm install && nvm use で切り替えられます。',
  );
  process.exit(1);
}
