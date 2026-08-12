import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Release workflow 应在构建前执行测试并使用 npm ci', () => {
  const source = readFileSync(new URL('./.github/workflows/release.yml', import.meta.url), 'utf8');

  assert.match(source, /run:\s*npm ci/);
  assert.match(source, /name:\s*Run frontend tests/);
  assert.match(source, /run:\s*node --test/);
  assert.match(source, /name:\s*Build frontend assets for Rust tests/);
  assert.match(source, /run:\s*npm run build/);
  assert.match(source, /name:\s*Run Rust tests/);
  assert.match(source, /run:\s*cargo test --manifest-path src-tauri\/Cargo\.toml/);

  const frontendIndex = source.indexOf('name: Run frontend tests');
  const frontendBuildIndex = source.indexOf('name: Build frontend assets for Rust tests');
  const rustIndex = source.indexOf('name: Run Rust tests');
  const buildIndex = source.indexOf('name: Build application');

  assert.notEqual(frontendIndex, -1);
  assert.notEqual(frontendBuildIndex, -1);
  assert.notEqual(rustIndex, -1);
  assert.notEqual(buildIndex, -1);
  assert.ok(frontendIndex < buildIndex, '前端测试必须先于构建执行');
  assert.ok(frontendBuildIndex < rustIndex, 'Rust 测试前必须先生成 frontendDist');
  assert.ok(rustIndex < buildIndex, 'Rust 测试必须先于构建执行');
});

test('Release workflow 应支持对版本标签手动重试且拒绝普通分支发布', () => {
  const source = readFileSync(new URL('./.github/workflows/release.yml', import.meta.url), 'utf8');

  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /build-tauri:\s+if: startsWith\(github\.ref, 'refs\/tags\/v'\) \|\| github\.event_name == 'workflow_dispatch'/);
  assert.match(source, /publish-release:[\s\S]*?if: startsWith\(github\.ref, 'refs\/tags\/v'\)/);
});

test('macOS release 应保持 ad-hoc 签名且不导入自签证书', () => {
  const source = readFileSync(new URL('./.github/workflows/release.yml', import.meta.url), 'utf8');

  assert.match(source, /export APPLE_SIGNING_IDENTITY="-"/);
  assert.doesNotMatch(source, /MACOS_CODESIGN_P12|security import|add-trusted-cert/);
  assert.doesNotMatch(source, /Verify stable macOS code signature/);
});

test('Windows 安装包名称无需规范化时不应把签名文件移动到自身', () => {
  const source = readFileSync(new URL('./.github/workflows/release.yml', import.meta.url), 'utf8');
  const windowsRename = source.match(
    /- name: Rename Windows installer assets([\s\S]*?)- name:/
  )?.[1] ?? '';

  assert.match(windowsRename, /signature="\$\{file\}\.sig"/);
  assert.match(windowsRename, /renamed_signature="\$\{renamed\}\.sig"/);
  assert.match(
    windowsRename,
    /\[\[ -f "\$signature" && "\$signature" != "\$renamed_signature" \]\]/
  );
  assert.doesNotMatch(windowsRename, /mv "\$\{file\}\.sig" "\$\{renamed\}\.sig"/);
});

test('CI 与 Release 应使用 Node 24 Actions，并缓存 Rust 和短期保留中转产物', () => {
  const workflows = [
    readFileSync(new URL('./.github/workflows/ci.yml', import.meta.url), 'utf8'),
    readFileSync(new URL('./.github/workflows/security-audit.yml', import.meta.url), 'utf8'),
    readFileSync(new URL('./.github/workflows/release.yml', import.meta.url), 'utf8'),
  ];
  const release = workflows[2];

  for (const source of workflows) {
    assert.doesNotMatch(source, /actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@v4/);
  }
  assert.match(release, /actions\/checkout@v7/);
  assert.match(release, /actions\/setup-node@v7/);
  assert.match(release, /actions\/upload-artifact@v7/);
  assert.match(release, /actions\/download-artifact@v8/);
  assert.match(release, /uses:\s*Swatinem\/rust-cache@v2[\s\S]*?key:\s*release-\$\{\{ matrix\.target \}\}/);
  assert.match(release, /retention-days:\s*2/);
  assert.match(release, /compression-level:\s*0/);
  assert.doesNotMatch(release, /artifacts:\s*["']all-artifacts\/\*\*\/\*,/);
  assert.match(release, /artifacts:[^\n]*all-artifacts\/\*\*\/\*\.dmg[^\n]*all-artifacts\/\*\*\/\*\.deb/);
});
