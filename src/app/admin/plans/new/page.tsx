import { redirect } from 'next/navigation'

export default function AdminPlansNewPage() {
  redirect('/admin/plans?action=new')
}
