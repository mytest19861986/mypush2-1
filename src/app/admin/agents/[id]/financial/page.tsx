import { AdminAgentScopedReport } from '@/components/shared/admin-agent-scoped-report'

export default async function AgentFinancialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminAgentScopedReport agentId={id} financial />
}
