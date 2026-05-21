'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { agentsService } from '@/services/agents.service'
import { PageHeader, DataTable, StatusBadge, EmptyState } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  FileUp,
  Building,
  Inbox,
} from 'lucide-react'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, MAX_FILE_SIZE, ACCEPTED_DOC_TYPES } from '@/constants'
import { formatDate } from '@/utils/formatters'
import type { AgentDocumentItem } from '@/types'
import type { Column } from '@/components/shared/data-table'

// ---------- Doc Type Icon Map ----------

const docTypeIconMap: Record<string, React.ReactNode> = {
  NATIONAL_CARD: <FileText className="size-4" />,
  BUSINESS_LICENSE: <Building className="size-4" />,
  CERTIFICATE: <CheckCircle className="size-4" />,
  OTHER: <FileText className="size-4" />,
}

// ---------- Upload Form ----------

function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const { toast } = useToast()
  const [docType, setDocType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'فرمت فایل پشتیبانی نمی‌شود. فقط jpg, png و pdf مجاز هستند.'
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'حجم فایل نباید بیشتر از ۵ مگابایت باشد.'
    }
    return null
  }

  const handleFileSelect = (selectedFile: File | undefined) => {
    if (!selectedFile) return
    const error = validateFile(selectedFile)
    if (error) {
      toast({ title: 'خطا', description: error, variant: 'destructive' })
      return
    }
    setFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files?.[0]
    handleFileSelect(droppedFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleUpload = async () => {
    if (!docType) {
      toast({
        title: 'خطا',
        description: 'لطفاً نوع مدرک را انتخاب کنید',
        variant: 'destructive',
      })
      return
    }
    if (!file) {
      toast({
        title: 'خطا',
        description: 'لطفاً فایل را انتخاب کنید',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const res = await agentsService.uploadDocument(docType, file, (p) => {
        setProgress(p)
      })

      if (res.success) {
        toast({
          title: 'موفق',
          description: 'مدرک با موفقیت آپلود شد',
        })
        setDocType('')
        setFile(null)
        setProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        onUploaded()
      } else {
        toast({
          title: 'خطا',
          description: res.message || 'خطا در آپلود مدرک',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در ارتباط با سرور',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="size-4 text-emerald-600" />
          آپلود مدرک جدید
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Type */}
        <div className="space-y-2">
          <Label>نوع مدرک *</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger>
              <SelectValue placeholder="نوع مدرک را انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Drop Zone */}
        <div className="space-y-2">
          <Label>فایل مدرک *</Label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${dragActive
                ? 'border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/20'
                : file
                  ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                  : 'border-muted-foreground/25 hover:border-emerald-400/50 hover:bg-accent/50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {file ? (
              <div className="space-y-2">
                <CheckCircle className="size-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileUp className="size-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  فایل را اینجا بکشید و رها کنید
                </p>
                <p className="text-xs text-muted-foreground">
                  یا کلیک کنید تا فایل انتخاب شود
                </p>
                <p className="text-xs text-muted-foreground">
                  jpg, jpeg, png, pdf — حداکثر ۵ مگابایت
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress}% — در حال آپلود...
            </p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={uploading || !docType || !file}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 ml-2 animate-spin" />
              در حال آپلود...
            </>
          ) : (
            <>
              <Upload className="size-4 ml-2" />
              آپلود مدرک
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------- Document List ----------

function DocumentList({ documents }: { documents: AgentDocumentItem[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (doc: AgentDocumentItem) => {
    setDownloadingId(doc.id)
    try {
      const token = useAuthStore.getState().accessToken
      if (!token) return

      const response = await fetch(
        `/api/v1/agents/documents/${doc.id}/download?token=${token}`
      )

      if (!response.ok) {
        throw new Error('خطا در دانلود فایل')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS] || doc.type}_${doc.id.slice(0, 8)}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      // silent fail for download
    } finally {
      setDownloadingId(null)
    }
  }

  // ---------- Table Columns ----------

  const columns: Column<AgentDocumentItem>[] = [
    {
      key: 'type',
      header: 'نوع مدرک',
      render: (row) => (
        <div className="flex items-center gap-2">
          {docTypeIconMap[row.type] || <FileText className="size-4" />}
          {DOCUMENT_TYPE_LABELS[row.type as keyof typeof DOCUMENT_TYPE_LABELS] || row.type}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاریخ آپلود',
      render: (row) => (
        <span className="text-sm">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'reviewedAt',
      header: 'تاریخ بررسی',
      render: (row) => (
        <span className="text-sm">{row.reviewedAt ? formatDate(row.reviewedAt) : '—'}</span>
      ),
      hiddenOn: 'md',
    },
  ]

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="مدرکی آپلود نشده است"
        description="از فرم بالا برای آپلود اولین مدرک خود استفاده کنید."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="size-4 text-emerald-600" />
          مدارک آپلود شده ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={documents}
          rowKey={(row) => row.id}
          actions={(row) => (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownload(row)}
              disabled={downloadingId === row.id}
              title="دانلود"
            >
              {downloadingId === row.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </Button>
          )}
          actionsHeader="عملیات"
        />
      </CardContent>
    </Card>
  )
}

// ---------- Main Documents Page ----------

export default function AgentDocumentsPage() {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<AgentDocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await agentsService.getDocuments()
      if (res.success && res.data) {
        setDocuments(res.data as unknown as AgentDocumentItem[])
      } else {
        setError(res.message || 'خطا در دریافت مدارک')
      }
    } catch {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  // ---------- Error ----------

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="مدیریت مدارک"
          description="آپلود و مدیریت مدارک نمایندگی"
        />
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-12 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" className="mt-3" onClick={fetchDocuments}>
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت مدارک"
        description="آپلود و مدیریت مدارک نمایندگی"
      />

      <UploadForm onUploaded={fetchDocuments} />

      <DocumentList documents={documents} />
    </div>
  )
}
