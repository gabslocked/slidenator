import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

export async function q(text, params) {
  return pool.query(text, params);
}

export async function migrate() {
  await q(`
    CREATE TABLE IF NOT EXISTS orgs (
      id text PRIMARY KEY,
      name text NOT NULL,
      plan text NOT NULL DEFAULT 'individual' CHECK (plan IN ('individual','team','enterprise')),
      brand jsonb NOT NULL DEFAULT '{}',
      settings jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      name text NOT NULL DEFAULT '',
      pass_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS org_members (
      org_id text NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','member')),
      PRIMARY KEY (org_id, user_id)
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS sessions (
      token text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id text NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS conversations (
      id text PRIMARY KEY,
      org_id text NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL DEFAULT 'Nova conversa',
      docs jsonb NOT NULL DEFAULT '[]',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS messages (
      id bigserial PRIMARY KEY,
      conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role text NOT NULL,
      content jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // slides (jsonb): no pipeline spec-fill guarda os SPECS do contrato §2, um por
  // slide, no formato [{ spec }] — NÃO o HTML. O HTML final renderizado fica em
  // decks.html (rota /deck/:id inalterada); o edit_deck lê os specs e re-renderiza.
  // Decks antigos (pré-reforma) podem ter [{ html, js }] aqui — continuam servindo
  // pelo decks.html; só não são editáveis pelo novo editor spec-a-spec.
  await q(`
    CREATE TABLE IF NOT EXISTS decks (
      id text PRIMARY KEY,
      org_id text NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      conversation_id text REFERENCES conversations(id) ON DELETE SET NULL,
      title text NOT NULL,
      outline jsonb,
      slides jsonb,
      html text NOT NULL,
      version int NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await q(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_id ON messages (conversation_id, id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_decks_conversation_id ON decks (conversation_id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_conversations_org_id_updated_at ON conversations (org_id, updated_at DESC)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at)`);
}
