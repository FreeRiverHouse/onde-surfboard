// Database types
export interface User {
  id: number
  email: string
  name: string | null
  image: string | null
  google_id: string | null
  role: string
  is_whitelisted: number
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface ActivityLog {
  id: number
  user_id: number
  action: string
  details: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Get D1 database from environment
export function getDB(env: { DB: D1Database }): D1Database {
  return env.DB
}

// User operations
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<User>()
  return result
}

export async function getUserByGoogleId(db: D1Database, googleId: string): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .bind(googleId)
    .first<User>()
  return result
}

export async function createOrUpdateUser(
  db: D1Database,
  userData: {
    email: string
    name?: string | null
    image?: string | null
    google_id?: string | null
  }
): Promise<User> {
  const existingUser = await getUserByEmail(db, userData.email)

  if (existingUser) {
    // Update existing user
    await db
      .prepare(`
        UPDATE users
        SET name = ?, image = ?, google_id = ?, updated_at = CURRENT_TIMESTAMP, last_login = CURRENT_TIMESTAMP
        WHERE email = ?
      `)
      .bind(userData.name || existingUser.name, userData.image || existingUser.image, userData.google_id || existingUser.google_id, userData.email)
      .run()

    return (await getUserByEmail(db, userData.email))!
  } else {
    // Create new user
    const isWhitelisted = isEmailWhitelisted(userData.email) ? 1 : 0

    await db
      .prepare(`
        INSERT INTO users (email, name, image, google_id, is_whitelisted, last_login)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(userData.email, userData.name || null, userData.image || null, userData.google_id || null, isWhitelisted)
      .run()

    return (await getUserByEmail(db, userData.email))!
  }
}

export async function getAllUsers(db: D1Database): Promise<User[]> {
  const result = await db.prepare("SELECT * FROM users ORDER BY created_at DESC").all<User>()
  return result.results
}

// Activity logging
export async function logActivity(
  db: D1Database,
  data: {
    user_id: number
    action: string
    details?: string | null
    ip_address?: string | null
    user_agent?: string | null
  }
): Promise<void> {
  await db
    .prepare(`
      INSERT INTO activity_log (user_id, action, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(data.user_id, data.action, data.details || null, data.ip_address || null, data.user_agent || null)
    .run()
}

export async function getRecentActivity(db: D1Database, limit = 50): Promise<ActivityLog[]> {
  const result = await db
    .prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all<ActivityLog>()
  return result.results
}

// Email whitelist check
const ALLOWED_EMAILS = [
  "mattiapetrucciani@gmail.com",
  "mattiapetrucciani@mac.com",
  "mattia@freeriverhouse.com",
  "mattia@onde.la",
  "magmaticxr@gmail.com",
  "freeriverhouse@gmail.com",
  "freeriverouse@gmail.com",
]

export function isEmailWhitelisted(email: string): boolean {
  return ALLOWED_EMAILS.includes(email.toLowerCase())
}
