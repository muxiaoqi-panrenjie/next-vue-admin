#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// 映射 commit type 到中文 emoji 分类
const typeMap = {
  feat: '✨ 新增',
  fix: '🐛 修复',
  docs: '📚 文档',
  style: '💄 样式',
  refactor: '🔧 重构',
  perf: '⚡ 性能提升',
  test: '🧪 测试',
  build: '🏗️ 构建',
  ci: '🔄 CI/CD',
  chore: '📦 依赖',
  revert: '⏪️ 回退',
  optimize: '🚀 优化',
  security: '🔒 安全增强',
  breaking: '🎉 重大更新'
};

// 获取 git 提交记录
function getGitCommits() {
  const cmd = 'git log --pretty=format:"%h|%s|%b" --no-merges';
  const output = execSync(cmd, { encoding: 'utf8' });

  return output.split('\n').map(line => {
    const [hash, subject, body] = line.split('|');
    const match = subject.match(/^(\w+)(?:\((.*)\))?: (.*)$/);

    if (match) {
      const [, type, scope, subjectText] = match;
      return {
      hash,
      type: type.toLowerCase(),
      scope,
      subject: subjectText,
      body: body.trim()
    };
  }

  // 处理不符合规范的提交信息
  // 匹配带冒号的格式，允许冒号后没有空格
  const fallbackMatch = subject.match(/^(\w+):\s*(.*)$/);
  if (fallbackMatch) {
    const [, type, subjectText] = fallbackMatch;
    return {
      hash,
      type: type.toLowerCase(),
      scope: '',
      subject: subjectText,
      body: body.trim()
    };
  }

  // 直接返回原始主题，不包含前缀
  return {
    hash,
    type: 'feat',
    scope: '',
    subject,
    body: body.trim()
  };
  });
}

// 生成 CHANGELOG 内容
function generateChangelog() {
  // 从 package.json 读取版本号
  const pkgPath = path.join(__dirname, '../package.json');
  const pkgContent = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgContent);
  const version = pkg.version;

  const commits = getGitCommits();
  const groupedCommits = {};

  // 按类型分组
  commits.forEach(commit => {
    const section = typeMap[commit.type] || '📝 其他';
    if (!groupedCommits[section]) {
      groupedCommits[section] = [];
    }
    groupedCommits[section].push(commit);
  });

  // 读取现有 CHANGELOG
  const changelogPath = path.join(__dirname, '../../CHANGELOG.md');
  const existingContent = fs.readFileSync(changelogPath, 'utf8');

  // 检查当前版本是否已经存在
  const versionPattern = `## [${version}]`;
  if (existingContent.includes(versionPattern)) {
    console.log(`版本 ${version} 已经存在于 CHANGELOG.md 中，跳过生成`);
    return;
  }

  // 生成新的版本记录
  const today = new Date().toISOString().split('T')[0];
  let newVersionContent = `## [${version}] - ${today}\n\n`;

  // 按指定顺序添加分类
  const sectionOrder = [
    '✨ 新增',
    '🚀 优化',
    '⚡ 性能提升',
    '🔧 重构',
    '🐛 修复',
    '🔒 安全增强',
    '📚 文档',
    '💄 样式',
    '🧪 测试',
    '🏗️ 构建',
    '🔄 CI/CD',
    '📦 依赖',
    '⏪️ 回退',
    '📝 其他'
  ];

  sectionOrder.forEach(section => {
    const sectionCommits = groupedCommits[section];
    if (sectionCommits && sectionCommits.length > 0) {
      newVersionContent += `### ${section}\n\n`;
      sectionCommits.forEach(commit => {
        // 生成嵌套列表格式，所有内容都作为嵌套列表项
        // 主内容作为第一个嵌套列表项
        newVersionContent += `  - ${commit.subject}`;
        if (commit.scope) {
          newVersionContent += ` (${commit.scope})`;
        }
        newVersionContent += `\n`;

        // 处理body内容，每个body行作为一个嵌套列表项
        if (commit.body) {
          const bodyLines = commit.body.split('\n').filter(line => line.trim());
          bodyLines.forEach(line => {
            newVersionContent += `  - ${line.trim()}\n`;
          });
        }
      });
      newVersionContent += '\n';
    }
  });

  // 找到分隔线的位置，将新内容插入到分隔线后面
  const separator = '---';
  const separatorIndex = existingContent.indexOf(separator) + separator.length;

  // 分割CHANGELOG为两部分：分隔线前和分隔线后
  const beforeSeparator = existingContent.substring(0, separatorIndex);
  const afterSeparator = existingContent.substring(separatorIndex);

  // 将新生成的版本内容插入到分隔线后面
  const newChangelog = `${beforeSeparator}\n\n${newVersionContent}${afterSeparator}`;

  // 写入文件
  fs.writeFileSync(changelogPath, newChangelog);
  console.log('CHANGELOG.md 已更新');

}

generateChangelog();
