import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { AppShell } from '@/components/study/app-shell'
import type { LearningPreferences } from '@/lib/learning-profile'

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw redirect({ to: '/login' })
    if (location.pathname !== '/onboarding' && location.pathname !== '/educator/apply' && !location.pathname.startsWith('/admin')) {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('preferences').eq('id', data.user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', data.user.id),
      ])
      const preferences = (profile?.preferences ?? {}) as LearningPreferences
      const privileged = (roles ?? []).some((row) => row.role === 'admin' || row.role === 'teacher')
      if (!privileged && (!preferences.firstSubjectId || !preferences.topic || !preferences.goal)) throw redirect({ to: '/onboarding' })
    }
    return { user: data.user }
  },
  component: () => <AppShell><Outlet/></AppShell>,
})
