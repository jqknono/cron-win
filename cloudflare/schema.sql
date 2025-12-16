-- D1 数据库初始化脚本
-- 用于存储 XML 下载统计信息

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
);

-- 索引：按创建时间排序查询
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC);

-- 索引：按语言统计
CREATE INDEX IF NOT EXISTS idx_downloads_language ON downloads(language);

