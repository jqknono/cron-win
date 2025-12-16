/**
 * Cloudflare Worker for Windows Task Scheduler Generator
 * Serves static assets via wrangler `assets` binding with SPA routing support
 * Includes D1 database for download statistics
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // 支持的域名列表（生产环境）
    const supportedHosts = [
      'cronwin.techfetch.dev',
      'wincron.techfetch.dev',
      'taskscheduler.techfetch.dev'
    ];

    // 严格限制仅允许受支持的自定义域名
    const envMode = (env && (env.WORKER_ENVIRONMENT || env.NODE_ENV)) || 'production';
    const isNonProdEnv = envMode !== 'production';
    const isLocalHost = hostname === '127.0.0.1' || hostname === 'localhost';
    const hostAllowed = supportedHosts.includes(hostname) || isNonProdEnv || isLocalHost;
    if (!hostAllowed) {
      return new Response('Domain not supported', { status: 403 });
    }
    
    // 处理路由
    const path = url.pathname;
    
    // API 路由处理
    if (path === '/api/track-download' && request.method === 'POST') {
      return await handleTrackDownload(request, env);
    }
    
    // 管理页面路由
    if (path === '/admin/stats') {
      return await handleAdminStats(request, env);
    }
    
    // 静态资源路径
    if (path.startsWith('/static/') || path.includes('.')) {
      return await serveStaticAsset(path, env, request);
    }
    
    // 根路径或 SPA 路由
    if (path === '/' || isSPARoute(path)) {
      return await serveIndexHTML(env, request);
    }
    
    // 其他路径统一返回 index.html（SPA）
    return await serveIndexHTML(env, request);
  }
};

/**
 * 判断是否为 SPA 路由
 */
function isSPARoute(path) {
  // 排除静态资源和 API 路径
  if (path.startsWith('/static/') || path.startsWith('/api/')) {
    return false;
  }
  
  // 排除文件扩展名
  if (path.includes('.')) {
    return false;
  }
  
  return true;
}

/**
 * 从 ASSETS 绑定获取静态资源
 */
async function serveStaticAsset(assetPath, env, request) {
  // 优先使用 ASSETS 绑定
  if (env.ASSETS) {
    const assetUrl = new URL(assetPath, request.url);
    const assetResponse = await env.ASSETS.fetch(assetUrl);
    if (assetResponse.ok) {
      const headers = new Headers(assetResponse.headers);
      const cacheControl = getCacheControlForPath(assetPath);
      headers.set('Cache-Control', cacheControl);
      return new Response(assetResponse.body, {
        headers,
        status: 200
      });
    }
  }
  return new Response('Asset not found', { status: 404 });
}

/**
 * 服务 index.html
 */
async function serveIndexHTML(env, request) {
  const securityHeaders = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };

  // 优先使用 ASSETS 绑定
  if (env.ASSETS) {
    const indexUrl = new URL('/index.html', request.url);
    const assetResponse = await env.ASSETS.fetch(indexUrl);
    if (assetResponse.ok) {
      return new Response(assetResponse.body, {
        headers: securityHeaders,
        status: 200
      });
    }
  }
  return new Response('Application not found', { status: 404 });
}

/**
 * 根据路径获取缓存策略
 */
function getCacheControlForPath(path) {
  if (path.endsWith('.js') || path.endsWith('.css')) {
    // JS/CSS 文件长期缓存（不可变）
    return 'public, max-age=31536000, immutable';
  }
  
  if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.ico')) {
    // 图片文件长期缓存
    return 'public, max-age=31536000, immutable';
  }
  
  // 其他静态资源中期缓存
  return 'public, max-age=86400';
}

function getContentTypeForPath(path) {
  if (path.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }
  
  if (path.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }
  
  if (path.endsWith('.png')) {
    return 'image/png';
  }
  
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  
  if (path.endsWith('.ico')) {
    return 'image/x-icon';
  }
  
  if (path.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  
  return null;
}

/**
 * 处理错误响应
 */
function createErrorResponse(message, status = 500) {
  return new Response(JSON.stringify({
    error: message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

let downloadsTableInitialized = false;

async function ensureDownloadsTable(env) {
  if (!env || !env.DB) {
    return;
  }

  if (downloadsTableInitialized) {
    return;
  }

  try {
    const row = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='downloads'")
      .first();

    if (!row || row.name !== 'downloads') {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS downloads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_name TEXT NOT NULL DEFAULT '',
          app_path TEXT NOT NULL DEFAULT '',
          repeat_interval TEXT NOT NULL DEFAULT '',
          repeat_interval_unit TEXT NOT NULL DEFAULT '',
          trigger_type TEXT NOT NULL DEFAULT '',
          use_powershell INTEGER NOT NULL DEFAULT 0,
          user_agent TEXT DEFAULT '',
          language TEXT DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();

      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC)
      `).run();

      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_downloads_language ON downloads(language)
      `).run();
    }

    downloadsTableInitialized = true;
  } catch (err) {
    console.error('Failed to ensure downloads table', err);
  }
}

/**
 * 处理下载追踪 API
 */
async function handleTrackDownload(request, env) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await request.json();
  await ensureDownloadsTable(env);
  const { taskName, appPath, repeatInterval, repeatIntervalUnit, triggerType, usePowershell, userAgent, language } = body;

  const stmt = env.DB.prepare(`
    INSERT INTO downloads (task_name, app_path, repeat_interval, repeat_interval_unit, trigger_type, use_powershell, user_agent, language, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  await stmt.bind(
    taskName || '',
    appPath || '',
    repeatInterval || '',
    repeatIntervalUnit || '',
    triggerType || '',
    usePowershell ? 1 : 0,
    userAgent || '',
    language || ''
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * 处理管理页面 - 展示下载统计
 */
async function handleAdminStats(request, env) {
  const url = new URL(request.url);
  const secretFromQuery = url.searchParams.get('secret') || '';
  const secretFromHeader = request.headers.get('X-Admin-Secret') || '';
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookieHeader(cookieHeader);
  const authCookie = cookies.cronwin_admin || '';

  const hostname = url.hostname;
  const isLocalHost = hostname === '127.0.0.1' || hostname === 'localhost';

  // 未配置 ADMIN_SECRET 时，仅允许 localhost 使用默认值（避免线上误开放管理页）
  const configuredSecret = (env && env.ADMIN_SECRET) ? String(env.ADMIN_SECRET) : '';
  const expectedSecret = configuredSecret || (isLocalHost ? 'your-admin-secret-here' : '');

  if (!expectedSecret) {
    return new Response('Not found', { status: 404 });
  }

  const expectedAuthToken = await sha256Base64Url(expectedSecret);
  const secret = secretFromHeader || secretFromQuery;
  const authedByCookie = authCookie && authCookie === expectedAuthToken;
  const authedBySecret = secret && secret === expectedSecret;

  if (!authedByCookie && !authedBySecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 如果通过 URL 参数校验成功，立刻重定向到不包含 secret 的 URL，减少泄露面
  if (authedBySecret && secretFromQuery) {
    url.searchParams.delete('secret');
    const redirectUrl = url.toString();
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Set-Cookie': buildAdminAuthCookie(expectedAuthToken, isLocalHost),
        'Cache-Control': 'no-store'
      }
    });
  }

  await ensureDownloadsTable(env);

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  // 获取总数
  const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM downloads').first();
  const total = countResult?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // 获取分页数据
  const { results } = await env.DB.prepare(`
    SELECT id, task_name, app_path, repeat_interval, repeat_interval_unit, trigger_type, use_powershell, user_agent, language, created_at
    FROM downloads
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all();

  const html = generateAdminHTML(results, page, totalPages, total);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(authedBySecret ? { 'Set-Cookie': buildAdminAuthCookie(expectedAuthToken, isLocalHost) } : {})
    }
  });
}

/**
 * 生成管理页面 HTML
 */
function generateAdminHTML(records, currentPage, totalPages, total) {
  const rows = records.map(r => `
    <tr>
      <td>${escapeHtml(String(r.id))}</td>
      <td title="${escapeHtml(r.task_name)}">${escapeHtml(truncate(r.task_name, 20))}</td>
      <td title="${escapeHtml(r.app_path)}">${escapeHtml(truncate(r.app_path, 30))}</td>
      <td>${escapeHtml(r.repeat_interval)} ${escapeHtml(r.repeat_interval_unit)}</td>
      <td>${escapeHtml(r.trigger_type)}</td>
      <td>${r.use_powershell ? '✓' : '✗'}</td>
      <td>${escapeHtml(r.language || '-')}</td>
      <td title="${escapeHtml(r.user_agent || '')}">${escapeHtml(truncate(r.user_agent || '-', 25))}</td>
      <td>${escapeHtml(r.created_at)}</td>
    </tr>
  `).join('');

  const pagination = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      pagination.push(`<span class="current">${i}</span>`);
    } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pagination.push(`<a href="?page=${i}">${i}</a>`);
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      pagination.push('<span>...</span>');
    }
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>下载统计 - CronWin Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #e4e4e7;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.75rem;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      color: #a1a1aa;
      margin-bottom: 24px;
    }
    .stats-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .stat-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px 24px;
      backdrop-filter: blur(10px);
    }
    .stat-card .label { color: #a1a1aa; font-size: 0.875rem; }
    .stat-card .value { font-size: 1.5rem; font-weight: 600; color: #60a5fa; }
    .table-wrapper {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    th {
      background: rgba(255,255,255,0.05);
      font-weight: 600;
      color: #a1a1aa;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    tr:hover { background: rgba(255,255,255,0.03); }
    td { color: #d4d4d8; }
    .pagination {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
      flex-wrap: wrap;
    }
    .pagination a, .pagination .current {
      padding: 8px 14px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.875rem;
    }
    .pagination a {
      background: rgba(255,255,255,0.05);
      color: #a1a1aa;
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.2s;
    }
    .pagination a:hover {
      background: rgba(96, 165, 250, 0.2);
      color: #60a5fa;
      border-color: #60a5fa;
    }
    .pagination .current {
      background: linear-gradient(135deg, #60a5fa, #a78bfa);
      color: #fff;
      font-weight: 600;
    }
    @media (max-width: 768px) {
      .table-wrapper { overflow-x: auto; }
      table { min-width: 900px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 下载统计</h1>
    <p class="subtitle">CronWin 任务配置下载记录</p>
    
    <div class="stats-bar">
      <div class="stat-card">
        <div class="label">总下载次数</div>
        <div class="value">${total}</div>
      </div>
      <div class="stat-card">
        <div class="label">当前页</div>
        <div class="value">${currentPage} / ${totalPages || 1}</div>
      </div>
    </div>
    
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>任务名称</th>
            <th>应用路径</th>
            <th>重复间隔</th>
            <th>触发类型</th>
            <th>PowerShell</th>
            <th>语言</th>
            <th>User Agent</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="9" style="text-align:center;color:#71717a;">暂无数据</td></tr>'}
        </tbody>
      </table>
    </div>
    
    ${totalPages > 1 ? `<div class="pagination">${pagination.join('')}</div>` : ''}
  </div>
</body>
</html>`;
}

/**
 * HTML 转义
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 截断字符串
 */
function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function parseCookieHeader(cookieHeader) {
  const result = {};
  if (!cookieHeader) return result;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function buildAdminAuthCookie(token, isLocalHost) {
  const attrs = [
    `cronwin_admin=${token}`,
    'Path=/admin',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=86400'
  ];
  if (!isLocalHost) attrs.push('Secure');
  return attrs.join('; ');
}

async function sha256Base64Url(input) {
  const data = new TextEncoder().encode(String(input));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
