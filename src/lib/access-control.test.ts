/**
 * Automated access checks against the live backend.
 *
 * Verifies that the primary account (shubhamkumari177@gmail.com) really holds the
 * admin, teacher and student roles that unlock the admin dashboard, educator portal
 * and student dashboard — and that a normal student account cannot reach admin-only
 * data or perform admin-only writes.
 *
 * Run: bunx vitest run src/lib/access-control.test.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = import.meta.env['VITE_SUPABASE_URL'] as string
const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string

const PRIMARY_EMAIL = import.meta.env['VITE_PRIMARY_ADMIN_EMAIL'] ?? 'shubhamkumari177@gmail.com'
const PRIMARY_PASSWORD = import.meta.env['VITE_PRIMARY_ADMIN_PASSWORD'] ?? 'StudyFlow!2026'
const STUDENT_EMAIL = import.meta.env['VITE_TEST_STUDENT_EMAIL'] ?? 'demo.alex+studyflow@example.com'
const STUDENT_PASSWORD = import.meta.env['VITE_TEST_STUDENT_PASSWORD'] ?? 'StudyFlow!2026'

function anonClient(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function signedIn(email: string, password: string): Promise<SupabaseClient> {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  await client.rpc('claim_primary_admin')
  return client
}

let admin: SupabaseClient
let student: SupabaseClient

beforeAll(async () => {
  admin = await signedIn(PRIMARY_EMAIL, PRIMARY_PASSWORD)
  student = await signedIn(STUDENT_EMAIL, STUDENT_PASSWORD)
}, 60_000)

afterAll(async () => {
  await admin?.auth.signOut()
  await student?.auth.signOut()
})

describe('primary account access', () => {
  it('can sign in with its password (email already verified)', async () => {
    const { data } = await admin.auth.getUser()
    expect(data.user?.email?.toLowerCase()).toBe(PRIMARY_EMAIL.toLowerCase())
    expect(data.user?.email_confirmed_at).toBeTruthy()
  })

  it('holds the admin, teacher and student roles', async () => {
    const { data } = await admin.auth.getUser()
    const userId = data.user!.id
    for (const role of ['admin', 'teacher', 'student'] as const) {
      const { data: allowed, error } = await admin.rpc('has_role', { _user_id: userId, _role: role })
      expect(error).toBeNull()
      expect(allowed, `expected the primary account to have the ${role} role`).toBe(true)
    }
  })

  it('reaches admin-only data (educator applications and accounts)', async () => {
    const requests = await admin.from('educator_access_requests').select('id').limit(1)
    expect(requests.error).toBeNull()
    const accounts = await admin.from('educator_accounts').select('id').limit(1)
    expect(accounts.error).toBeNull()
  })

  it('has an educator profile backing the educator portal', async () => {
    const { data } = await admin.auth.getUser()
    const { data: rows, error } = await admin.from('educator_accounts').select('id').eq('user_id', data.user!.id)
    expect(error).toBeNull()
    expect(rows?.length ?? 0).toBeGreaterThan(0)
  })
})

describe('unauthorized users are blocked', () => {
  it('a normal student does not hold the admin or teacher role', async () => {
    const { data } = await student.auth.getUser()
    const userId = data.user!.id
    for (const role of ['admin', 'teacher'] as const) {
      const { data: allowed } = await student.rpc('has_role', { _user_id: userId, _role: role })
      expect(allowed, `student must not have the ${role} role`).toBe(false)
    }
  })

  it('a normal student cannot perform admin-only writes', async () => {
    const insert = await student.from('subjects').insert({ name: `unauthorized-${Date.now()}` })
    expect(insert.error, 'student insert into subjects must be rejected').not.toBeNull()
  })

  it('a normal student cannot read other users’ educator accounts', async () => {
    const { data: me } = await student.auth.getUser()
    const { data: rows, error } = await student.from('educator_accounts').select('user_id')
    expect(error).toBeNull()
    expect((rows ?? []).every((row) => row.user_id === me.user!.id)).toBe(true)
  })

  it('signed-out visitors cannot read private tables', async () => {
    const anon = anonClient()
    const roles = await anon.from('user_roles').select('role').limit(1)
    expect(roles.data ?? []).toHaveLength(0)
    const sessions = await anon.from('ai_tutor_sessions').select('id').limit(1)
    expect(sessions.data ?? []).toHaveLength(0)
  })
})
