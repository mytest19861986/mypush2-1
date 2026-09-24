export interface DemoAdminReview {
  reviewId: string
  visitId?: string
  doctorId?: string
  rating: number
  comment: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  user?: {
    name?: string | null
    profile?: {
      firstName?: string | null
      lastName?: string | null
    } | null
  } | null
  doctor?: {
    name?: string | null
    specialty?: string | null
    clinicName?: string | null
    user?: {
      profile?: {
        firstName?: string | null
        lastName?: string | null
      } | null
    } | null
  } | null
  plan?: {
    name?: string | null
  } | null
  visit?: {
    status?: string | null
    plan?: {
      name?: string | null
    } | null
    userPlan?: {
      plan?: {
        name?: string | null
      } | null
    } | null
  } | null
}

export const DEMO_REVIEWS: DemoAdminReview[] = [
  {
    reviewId: 'demo-rev-101',
    rating: 5,
    comment: 'دکتر افشارزاده واقعاً عالی و باحوصله بودند. درمان ایمپلنت با بی‌حسی کامل و تخفیف حامی بدون هیچ مشکلی اعمال شد.',
    status: 'PENDING',
    createdAt: '2026-03-24T10:15:00.000Z',
    user: {
      name: 'محمدرضا سلیمانی',
      profile: { firstName: 'محمدرضا', lastName: 'سلیمانی' }
    },
    doctor: {
      name: 'دکتر علیرضا افشارزاده',
      specialty: 'جراحی فک و صورت و ایمپلنت',
      clinicName: 'کلینیک فوق‌تخصصی ونک',
    },
    plan: {
      name: 'طرح سلامت طلایی حامی'
    }
  },
  {
    reviewId: 'demo-rev-102',
    rating: 4,
    comment: 'محیط مرکز دندانپزشکی مهرگان بسیار تمیز بود و برخورد پرسنل مناسب بود. خانم دکتر شریفی با دقت بالا کار ترمیم را انجام دادند.',
    status: 'PENDING',
    createdAt: '2026-03-24T08:45:00.000Z',
    user: {
      name: 'فاطمه صادقی',
      profile: { firstName: 'فاطمه', lastName: 'صادقی' }
    },
    doctor: {
      name: 'دکتر مریم شریفی',
      specialty: 'متخصص دندانپزشکی ترمیمی و زیبایی',
      clinicName: 'مرکز دندانپزشکی مهرگان',
    },
    plan: {
      name: 'طرح نقره‌ای دندانپزشکی'
    }
  },
  {
    reviewId: 'demo-rev-103',
    rating: 5,
    comment: 'چکاپ چشم و نمره عینک با تخفیف ۳۰ درصدی حامی کارت سریعاً در بیمارستان نگاه انجام گرفت. بسیار راضی هستم.',
    status: 'APPROVED',
    createdAt: '2026-03-23T14:30:00.000Z',
    user: {
      name: 'علی حسینی',
      profile: { firstName: 'علی', lastName: 'حسینی' }
    },
    doctor: {
      name: 'دکتر کامران نادری',
      specialty: 'متخصص چشم و جراحی لیزیک',
      clinicName: 'بیمارستان و چشم‌پزشکی نگاه',
    },
    plan: {
      name: 'طرح پایه سلامت انفرادی'
    }
  },
  {
    reviewId: 'demo-rev-104',
    rating: 5,
    comment: 'جلسه مشاوره پوست و لیزر فوق‌العاده حرفه‌ای و مؤثر بود. برخورد خانم دکتر رضوانی بسیار محترمانه بود.',
    status: 'APPROVED',
    createdAt: '2026-03-22T16:20:00.000Z',
    user: {
      name: 'زهرا کاظمی',
      profile: { firstName: 'زهرا', lastName: 'کاظمی' }
    },
    doctor: {
      name: 'دکتر سارا رضوانی',
      specialty: 'متخصص پوست، مو و زیبایی',
      clinicName: 'کلینیک پوست و لیزر بهار',
    },
    plan: {
      name: 'طرح سلامت طلایی حامی'
    }
  },
  {
    reviewId: 'demo-rev-105',
    rating: 2,
    comment: 'زمان انتظار بیش از حد طولانی بود و با وجود نوبت قبلی حدود یک ساعت معطل شدیم.',
    status: 'REJECTED',
    createdAt: '2026-03-21T11:00:00.000Z',
    user: {
      name: 'امیرحسین پارسا',
      profile: { firstName: 'امیرحسین', lastName: 'پارسا' }
    },
    doctor: {
      name: 'دکتر بابک یوسفی',
      specialty: 'فوق تخصص قلب و عروق',
      clinicName: 'مرکز قلب تهران',
    },
    plan: {
      name: 'طرح سلامت طلایی حامی'
    }
  },
  {
    reviewId: 'demo-rev-106',
    rating: 5,
    comment: 'خدمات جرم‌گیری و معاینه کامل برای فرزندم بسیار عالی انجام شد. رفتار کادر درمان با کودک عالی بود.',
    status: 'APPROVED',
    createdAt: '2026-03-20T17:10:00.000Z',
    user: {
      name: 'سمیرا نوری',
      profile: { firstName: 'سمیرا', lastName: 'نوری' }
    },
    doctor: {
      name: 'دکتر مریم شریفی',
      specialty: 'متخصص دندانپزشکی ترمیمی و زیبایی',
      clinicName: 'مرکز دندانپزشکی مهرگان',
    },
    plan: {
      name: 'طرح نقره‌ای دندانپزشکی'
    }
  },
  {
    reviewId: 'demo-rev-107',
    rating: 4,
    comment: 'استفاده از حامی کارت در سامانه پذیرش کلینیک با سرعت انجام شد و تخفیف کامل منظور گردید.',
    status: 'PENDING',
    createdAt: '2026-03-24T12:00:00.000Z',
    user: {
      name: 'مهدی کریمی',
      profile: { firstName: 'مهدی', lastName: 'کریمی' }
    },
    doctor: {
      name: 'دکتر علیرضا افشارزاده',
      specialty: 'جراحی فک و صورت و ایمپلنت',
      clinicName: 'کلینیک فوق‌تخصصی ونک',
    },
    plan: {
      name: 'طرح VIP مدیران و سازمان‌ها'
    }
  }
]
