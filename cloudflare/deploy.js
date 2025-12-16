#!/usr/bin/env node

/**
 * Cloudflare 部署脚本
 * - 构建 CRA 产物到 ../build
 * - 通过 wrangler 的 assets 配置随 Worker 一起部署静态资源
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const CONFIG = {
  workerName: process.env.WORKER_NAME || 'cronwin-worker'
};

function isPlaceholder(name, value) {
  if (!value) return true;
  const placeholders = {
    CLOUDFLARE_ACCOUNT_ID: ['your_cloudflare_account_id_here', 'your_account_id_here'],
    CLOUDFLARE_API_TOKEN: ['your_cloudflare_api_token_here']
  };
  const list = placeholders[name] || [];
  if (list.some(p => value.trim() === p)) return true;
  if (name === 'CLOUDFLARE_ACCOUNT_ID') {
    return !/^[a-f0-9]{32}$/i.test(value.trim());
  }
  return false;
}

function getSanitizedWranglerEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  if (isPlaceholder('CLOUDFLARE_ACCOUNT_ID', env.CLOUDFLARE_ACCOUNT_ID)) {
    delete env.CLOUDFLARE_ACCOUNT_ID;
    delete env.CF_ACCOUNT_ID;
  }
  if (isPlaceholder('CLOUDFLARE_API_TOKEN', env.CLOUDFLARE_API_TOKEN)) {
    delete env.CLOUDFLARE_API_TOKEN;
  }
  return env;
}

function execCommand(command, options = {}) {
  try {
    console.log(`执行命令: ${command}`);
    const result = execSync(command, {
      stdio: options.stdio || 'inherit',
      encoding: options.encoding || 'utf8',
      env: options.env || process.env,
      ...options
    });
    return result;
  } catch (error) {
    console.error(`命令执行失败: ${command}`);
    console.error(error.message);
    throw error;
  }
}

function checkPrerequisites() {
  console.log('检查依赖环境...');
  try {
    execCommand('node --version');
    execCommand('npm --version');
    execCommand('wrangler --version');
  } catch (error) {
    console.error('缺少必要依赖，请确认已安装:');
    console.error('- Node.js (https://nodejs.org/)');
    console.error('- Wrangler CLI (npm install -g wrangler)');
    process.exit(1);
  }
}

function checkEnvironmentVariables() {
  console.log('检查 Cloudflare 登录状态...');

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  const tokenValid = !isPlaceholder('CLOUDFLARE_API_TOKEN', token);
  const accountValid = !isPlaceholder('CLOUDFLARE_ACCOUNT_ID', account);

  if (tokenValid && accountValid) {
    console.log('检测到环境变量凭证');
    return;
  }

  try {
    const whoami = execSync('wrangler whoami', {
      encoding: 'utf8',
      stdio: 'pipe',
      env: getSanitizedWranglerEnv()
    }).trim();
    console.log('使用 Wrangler 登录态');
    console.log(whoami);
  } catch (e) {
    console.error('未检测到 Cloudflare 凭证/登录态:');
    console.error('- 设置 CLOUDFLARE_API_TOKEN 与 CLOUDFLARE_ACCOUNT_ID');
    console.error('- 或执行: wrangler login');
    process.exit(1);
  }
}

function buildApplication() {
  console.log('构建生产版本...');

  try {
    process.chdir(repoRoot);

    console.log('安装依赖(包含 devDependencies)...');
    let installed = false;
    try {
      execCommand('npm ci --include=dev');
      installed = true;
    } catch (e1) {
      try {
        execCommand('npm ci --production=false');
        installed = true;
      } catch (e2) {
        execCommand('npm ci');
        installed = true;
      }
    }
    if (!installed) throw new Error('依赖安装失败');

    execCommand('npm run build');

    const buildDir = path.join(repoRoot, 'build');
    if (!fs.existsSync(buildDir)) {
      throw new Error('build 目录不存在');
    }

    const indexHtml = path.join(buildDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      throw new Error('build/index.html 不存在');
    }

    console.log('应用构建完成');
  } catch (error) {
    console.error('应用构建失败:', error.message);
    process.exit(1);
  }
}

function deployWorker() {
  console.log('部署 Worker...');
  try {
    process.chdir(repoRoot);
    execCommand('wrangler deploy -c cloudflare/wrangler.toml', { env: getSanitizedWranglerEnv() });
    console.log('Worker 部署完成');
  } catch (error) {
    console.error('Worker 部署失败:', error.message);
    process.exit(1);
  }
}

async function verifyDeployment() {
  console.log('等待部署生效...');
  try {
    await new Promise(resolve => setTimeout(resolve, 10_000));
    console.log('部署验证跳过(可按需补充)');
  } catch (error) {
    console.warn('部署验证失败:', error.message);
  }
}

function showDeploymentInfo() {
  console.log('\n部署完成');
  console.log('\n部署信息:');
  console.log(`- Worker: ${CONFIG.workerName}`);
  console.log('- 静态资源: 随 wrangler assets 一并部署(../build)');

  console.log('\n常用命令:');
  console.log('- 查看日志: wrangler tail');
  console.log('- 查看分析: wrangler analytics');
}

async function main() {
  console.log('开始 Cloudflare 部署...\n');
  try {
    checkPrerequisites();
    checkEnvironmentVariables();
    buildApplication();
    deployWorker();
    await verifyDeployment();
    showDeploymentInfo();
  } catch (error) {
    console.error('\n部署失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  checkPrerequisites,
  checkEnvironmentVariables,
  buildApplication,
  deployWorker,
  verifyDeployment,
  showDeploymentInfo
};
