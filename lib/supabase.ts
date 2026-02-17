
import { neon } from '@neondatabase/serverless';

const CONNECTION_STRING = 'postgresql://neondb_owner:npg_XGPnYT8fA9Zb@ep-frosty-sun-ac27pah5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(CONNECTION_STRING);

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS store_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    logoUrl TEXT,
    address TEXT,
    whatsapp TEXT,
    isActive BOOLEAN DEFAULT true,
    createdAt BIGINT,
    settings JSONB
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    store_id UUID,
    name TEXT NOT NULL,
    UNIQUE(store_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    store_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2),
    category TEXT,
    imageUrl TEXT,
    isActive BOOLEAN DEFAULT true,
    featuredDay INTEGER,
    isByWeight BOOLEAN DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS waitstaff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    store_id UUID,
    type TEXT,
    tableNumber TEXT,
    customerName TEXT,
    customerPhone TEXT,
    items JSONB,
    status TEXT,
    total NUMERIC(10,2),
    createdAt BIGINT,
    paymentMethod TEXT,
    deliveryAddress TEXT,
    notes TEXT,
    changeFor NUMERIC(10,2),
    waitstaffName TEXT,
    couponApplied TEXT,
    discountAmount NUMERIC(10,2)
  )`
];

let schemaInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function ensureSchema() {
  if (schemaInitialized) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      for (const statement of SCHEMA_STATEMENTS) {
        await sql(statement);
      }
      schemaInitialized = true;
    } catch (err) {
      console.error("Erro no Neon:", err);
      initializationPromise = null;
      throw err;
    }
  })();
  return initializationPromise;
}

class NeonBridge {
  private tableName: string = '';
  private queries: string[] = [];
  private params: any[] = [];
  private limitCount: number | null = null;
  private orderCol: string | null = null;
  private orderDir: 'ASC' | 'DESC' = 'ASC';

  from(table: string) {
    const instance = new NeonBridge();
    instance.tableName = table;
    return instance;
  }

  select(columns: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    const paramIndex = this.params.length + 1;
    this.queries.push(`${column.toLowerCase()} = $${paramIndex}`);
    this.params.push(value);
    return this;
  }

  order(column: string, config: { ascending: boolean } = { ascending: true }) {
    this.orderCol = column.toLowerCase();
    this.orderDir = config.ascending ? 'ASC' : 'DESC';
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      await ensureSchema();
      return this.get().then(onfulfilled, onrejected);
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  async maybeSingle() {
    await ensureSchema();
    const { data } = await this.get();
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  }

  private async get() {
    try {
      let queryStr = `SELECT * FROM ${this.tableName}`;
      if (this.queries.length > 0) {
        queryStr += ` WHERE ${this.queries.join(' AND ')}`;
      }
      if (this.orderCol) {
        queryStr += ` ORDER BY ${this.orderCol} ${this.orderDir}`;
      }
      if (this.limitCount) {
        queryStr += ` LIMIT ${this.limitCount}`;
      }
      const result = await sql(queryStr, this.params);
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async insert(values: any[]) {
    await ensureSchema();
    try {
      const results = [];
      for (const val of values) {
        const keys = Object.keys(val);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.map(k => `${k.toLowerCase()}`).join(', ');
        const queryStr = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
        const res = await sql(queryStr, Object.values(val));
        results.push(res[0]);
      }
      return { data: results, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async upsert(values: any[]) {
    await ensureSchema();
    try {
        for (const val of values) {
            const id = val.id;
            if (id) {
                const existing = await this.from(this.tableName).eq('id', id).maybeSingle();
                if (existing.data) {
                    await this.from(this.tableName).eq('id', id).update(val);
                    continue;
                }
            }
            await this.insert([val]);
        }
        return { data: values, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
  }

  async update(values: any) {
    await ensureSchema();
    try {
      const keys = Object.keys(values);
      const setClause = keys.map((k, i) => `${k.toLowerCase()} = $${i + 1}`).join(', ');
      let queryStr = `UPDATE ${this.tableName} SET ${setClause}`;
      
      if (this.queries.length > 0) {
        const adjustedWhere = this.queries.map(q => {
           return q.replace(/\$(\d+)/, (_, n) => `$${parseInt(n) + keys.length}`);
        }).join(' AND ');
        queryStr += ` WHERE ${adjustedWhere}`;
      }
      
      queryStr += ` RETURNING *`;
      const result = await sql(queryStr, [...Object.values(values), ...this.params]);
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async delete() {
    await ensureSchema();
    try {
      let queryStr = `DELETE FROM ${this.tableName}`;
      if (this.queries.length > 0) {
        queryStr += ` WHERE ${this.queries.join(' AND ')}`;
      }
      const result = await sql(queryStr, this.params);
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  auth = {
    getSession: async () => ({ data: { session: null } }),
    signInWithPassword: async ({ email, password }: any) => {
      await ensureSchema();
      const res = await sql(`SELECT * FROM waitstaff WHERE name = $1 AND password = $2 LIMIT 1`, [email, password]);
      if (res && res.length > 0) return { data: { user: { id: res[0].id, email: res[0].name } }, error: null };
      return { data: { user: null }, error: { message: 'Incorreto' } };
    },
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  };
}

export const supabase = new NeonBridge();
