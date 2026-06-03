import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH ?? './data/faccao.sqlite';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = `
CREATE TABLE IF NOT EXISTS guild_configs (
  guild_id TEXT PRIMARY KEY,
  faction_name TEXT NOT NULL DEFAULT 'Facção GTA RP',
  embed_color TEXT NOT NULL DEFAULT '#8A2BE2',
  banner_url TEXT DEFAULT '',
  icon_url TEXT DEFAULT '',
  member_role_id TEXT DEFAULT '',
  recruiter_role_ids TEXT NOT NULL DEFAULT '[]',
  leader_role_ids TEXT NOT NULL DEFAULT '[]',
  finance_role_ids TEXT NOT NULL DEFAULT '[]',
  approval_channel_id TEXT DEFAULT '',
  support_channel_id TEXT DEFAULT '',
  farm_category_id TEXT DEFAULT '',
  farm_forum_channel_id TEXT DEFAULT '',
  nickname_format TEXT NOT NULL DEFAULT '{id} | {nome}',
  individual_farm_goal INTEGER NOT NULL DEFAULT 0,
  general_farm_goal INTEGER NOT NULL DEFAULT 0,
  action_types TEXT NOT NULL DEFAULT '["Banco","Joalheria","Loja","Dominação","Sequestro"]',
  sale_items TEXT NOT NULL DEFAULT '[]',
  purchase_items TEXT NOT NULL DEFAULT '[]',
  messages_json TEXT NOT NULL DEFAULT '{}',
  button_labels_json TEXT NOT NULL DEFAULT '{}',
  log_channels_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rp_name TEXT NOT NULL,
  rp_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  recruiter TEXT NOT NULL,
  role_name TEXT NOT NULL DEFAULT 'Membro',
  farm_channel_id TEXT DEFAULT '',
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  warnings TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(guild_id, user_id),
  UNIQUE(guild_id, rp_id)
);
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rp_name TEXT NOT NULL,
  rp_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  recruiter TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT DEFAULT '',
  refusal_reason TEXT DEFAULT '',
  message_id TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS farms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rp_id TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  observation TEXT DEFAULT '',
  proof TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  action_date TEXT NOT NULL,
  action_time TEXT NOT NULL,
  max_participants INTEGER NOT NULL,
  organizer_id TEXT NOT NULL,
  observation TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  result TEXT DEFAULT '',
  profit_loss INTEGER NOT NULL DEFAULT 0,
  channel_id TEXT DEFAULT '',
  message_id TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS action_participants (
  action_id INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(action_id, user_id)
);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  item TEXT NOT NULL,
  sold_to TEXT NOT NULL,
  total_value INTEGER NOT NULL,
  withdrawn_value INTEGER NOT NULL DEFAULT 0,
  withdrawn_by TEXT DEFAULT '',
  seller_id TEXT NOT NULL,
  receiver TEXT NOT NULL,
  proof TEXT DEFAULT '',
  observation TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  item TEXT NOT NULL,
  cost INTEGER NOT NULL,
  bought_from TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  proof TEXT DEFAULT '',
  observation TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS finances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  member_id TEXT DEFAULT '',
  source TEXT NOT NULL,
  source_id TEXT DEFAULT '',
  description TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT DEFAULT '',
  target_id TEXT DEFAULT '',
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_members_guild ON members(guild_id);
CREATE INDEX IF NOT EXISTS idx_farms_user ON farms(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_finances_guild ON finances(guild_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_guild ON sales(guild_id, created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_guild ON purchases(guild_id, created_at);
`;
db.exec(schema);

const json = (value, fallback) => {
  if (!value) return fallback;
  return JSON.parse(value);
};

export function getConfig(guildId) {
  db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run(guildId);
  const row = db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(guildId);
  return {
    ...row,
    recruiter_role_ids: json(row.recruiter_role_ids, []),
    leader_role_ids: json(row.leader_role_ids, []),
    finance_role_ids: json(row.finance_role_ids, []),
    action_types: json(row.action_types, []),
    sale_items: json(row.sale_items, []),
    purchase_items: json(row.purchase_items, []),
    messages_json: json(row.messages_json, {}),
    button_labels_json: json(row.button_labels_json, {}),
    log_channels_json: json(row.log_channels_json, {})
  };
}

export function updateConfig(guildId, patch) {
  getConfig(guildId);
  const serialised = { ...patch };
  for (const key of ['recruiter_role_ids', 'leader_role_ids', 'finance_role_ids', 'action_types', 'sale_items', 'purchase_items', 'messages_json', 'button_labels_json', 'log_channels_json']) {
    if (key in serialised) serialised[key] = JSON.stringify(serialised[key]);
  }
  const entries = Object.entries(serialised);
  if (!entries.length) return getConfig(guildId);
  const set = entries.map(([key]) => `${key} = ?`).join(', ');
  db.prepare(`UPDATE guild_configs SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?`).run(...entries.map(([, value]) => value), guildId);
  return getConfig(guildId);
}

export function currentBalance(guildId) {
  return db.prepare('SELECT balance_after FROM finances WHERE guild_id = ? ORDER BY id DESC LIMIT 1').get(guildId)?.balance_after ?? 0;
}

export function addFinance({ guildId, type, amount, memberId = '', source, sourceId = '', description, createdBy }) {
  const signed = type === 'out' ? -Math.abs(amount) : type === 'adjust' ? amount : Math.abs(amount);
  const balance = type === 'adjust' ? amount : currentBalance(guildId) + signed;
  const result = db.prepare(`INSERT INTO finances (guild_id, type, amount, balance_after, member_id, source, source_id, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(guildId, type, signed, balance, memberId, source, sourceId, description, createdBy);
  return { id: result.lastInsertRowid, balance };
}

export function audit(guildId, type, actorId, targetId, title, details) {
  const result = db.prepare('INSERT INTO audit_logs (guild_id, type, actor_id, target_id, title, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(guildId, type, actorId ?? '', targetId ?? '', title, details ?? '');
  return result.lastInsertRowid;
}

export function exportGuild(guildId) {
  const tables = ['guild_configs', 'members', 'registrations', 'farms', 'actions', 'action_participants', 'sales', 'purchases', 'finances', 'audit_logs'];
  const data = {};
  for (const table of tables) {
    if (table === 'action_participants') {
      data[table] = db.prepare(`SELECT ap.* FROM action_participants ap JOIN actions a ON a.id = ap.action_id WHERE a.guild_id = ?`).all(guildId);
    } else {
      data[table] = db.prepare(`SELECT * FROM ${table} WHERE guild_id = ?`).all(guildId);
    }
  }
  return data;
}
