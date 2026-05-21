import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

// ============================================
// Seed Data Definitions
// ============================================

const ROLES = [
  { name: 'SUPER_ADMIN', title: 'مدیر کل سیستم', description: 'دسترسی کامل به تمامی بخش‌های سیستم' },
  { name: 'ADMIN', title: 'مدیر', description: 'دسترسی مدیریتی به بخش‌های اصلی سیستم' },
  { name: 'SUPPORT', title: 'پشتیبانی', description: 'دسترسی محدود برای پشتیبانی کاربران' },
  { name: 'DOCTOR', title: 'پزشک', description: 'دسترسی پزشکان برای مدیریت بیماران و قراردادها' },
  { name: 'AGENT', title: 'نماینده', description: 'دسترسی نمایندگان برای مدیریت مدارک و پورسانت' },
  { name: 'USER', title: 'کاربر عادی', description: 'دسترسی پایه کاربران سایت' },
] as const

const PERMISSIONS = [
  { name: 'manage_users', module: 'users', title: 'مدیریت کاربران' },
  { name: 'manage_agents', module: 'agents', title: 'مدیریت نمایندگان' },
  { name: 'approve_agents', module: 'agents', title: 'تایید نمایندگان' },
  { name: 'manage_doctors', module: 'doctors', title: 'مدیریت پزشکان' },
  { name: 'approve_doctors', module: 'doctors', title: 'تایید پزشکان' },
  { name: 'manage_plans', module: 'plans', title: 'مدیریت طرح‌ها' },
  { name: 'manage_contracts', module: 'contracts', title: 'مدیریت قراردادها' },
  { name: 'view_reports', module: 'reports', title: 'مشاهده گزارشات' },
  { name: 'manage_roles', module: 'roles', title: 'مدیریت نقش‌ها' },
  { name: 'manage_permissions', module: 'permissions', title: 'مدیریت دسترسی‌ها' },
  { name: 'upload_documents', module: 'uploads', title: 'آپلود مدارک' },
  { name: 'view_audit_logs', module: 'audit_logs', title: 'مشاهده لاگ‌ها' },
  { name: 'manage_settings', module: 'settings', title: 'مدیریت تنظیمات' },
  { name: 'manage_commissions', module: 'commissions', title: 'مدیریت پورسانت‌ها' },
] as const

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'manage_users', 'manage_agents', 'approve_agents', 'manage_doctors', 'approve_doctors',
    'manage_plans', 'manage_contracts', 'view_reports', 'manage_roles', 'manage_permissions',
    'upload_documents', 'view_audit_logs', 'manage_settings', 'manage_commissions',
  ],
  ADMIN: [
    'manage_users', 'manage_agents', 'approve_agents', 'manage_doctors', 'approve_doctors',
    'manage_plans', 'manage_contracts', 'view_reports', 'upload_documents', 'view_audit_logs',
  ],
  SUPPORT: ['manage_users', 'manage_doctors', 'view_reports', 'upload_documents'],
  DOCTOR: ['manage_contracts', 'upload_documents'],
  AGENT: ['upload_documents'],
  USER: [],
}

const DISCOUNT_PLANS = [
  {
    name: 'طرح برنزی',
    description: 'طرح پایه با تخفیف ویژه برای ویزیت‌های اولیه',
    price: 150000,
    discountPercent: 15,
    durationDays: 30,
    maxUses: 5,
    features: JSON.stringify(['تخفیف ۱۵ درصدی ویزیت', '۵ نوبت در ماه', 'پشتیبانی تلگرام']),
  },
  {
    name: 'طرح نقره‌ای',
    description: 'طرح متوسط با تخفیف بیشتر و امکانات ویژه',
    price: 280000,
    discountPercent: 25,
    durationDays: 60,
    maxUses: 10,
    features: JSON.stringify(['تخفیف ۲۵ درصدی ویزیت', '۱۰ نوبت در دو ماه', 'پشتیبانی تلفنی', 'اولویت نوبت‌دهی']),
  },
  {
    name: 'طرح طلایی',
    description: 'طرح پریمیوم با بالاترین تخفیف و خدمات VIP',
    price: 450000,
    discountPercent: 40,
    durationDays: 90,
    maxUses: -1,
    features: JSON.stringify(['تخفیف ۴۰ درصدی ویزیت', 'نوبت نامحدود', 'پشتیبانی ۲۴/۷', 'اولویت VIP', 'مشاوره آنلاین رایگان']),
  },
]

const PAGE_CONTENTS = [
  {
    slug: 'about',
    title: 'درباره ما',
    content: 'سامانه تخفیف درمانی یک پلتفرم نوآورانه برای کاهش هزینه‌های درمانی شهروندان است. ما با همکاری بهترین پزشکان و کلینیک‌ها، طرح‌های تخفیفی ویژه‌ای ارائه می‌دهیم تا دسترسی به خدمات درمانی باکیفیت را برای همه آسان‌تر کنیم.',
  },
  {
    slug: 'terms',
    title: 'قوانین و مقررات',
    content: 'استفاده از سامانه تخفیف درمانی به منزله پذیرش قوانین و مقررات آن است. طرح‌های تخفیفی قابل انتقال به شخص دیگر نیستند و پس از انقضا غیرقابل استفاده می‌باشند.',
  },
  {
    slug: 'faq',
    title: 'سوالات متداول',
    content: 'طرح تخفیف چیست؟ طرح تخفیف یک اشتراک زمانی است که به شما امکان می‌دهد با تخفیف ویژه از خدمات درمانی استفاده کنید. برای خرید طرح کافیست ثبت‌نام کرده و طرح مورد نظر خود را انتخاب کنید.',
  },
]

// ============================================
// Seed Functions
// ============================================

async function seedRoles() {
  console.log('\n📋 Seeding roles...')
  for (const role of ROLES) {
    const existing = await db.role.findUnique({ where: { name: role.name } })
    if (existing) { console.log(`  ✅ Role "${role.name}" already exists.`); continue }
    await db.role.create({ data: role })
    console.log(`  ✅ Created role: "${role.name}"`)
  }
}

async function seedPermissions() {
  console.log('\n🔐 Seeding permissions...')
  for (const perm of PERMISSIONS) {
    const existing = await db.permission.findUnique({ where: { name: perm.name } })
    if (existing) { console.log(`  ✅ Permission "${perm.name}" already exists.`); continue }
    await db.permission.create({ data: perm })
    console.log(`  ✅ Created permission: "${perm.name}"`)
  }
}

async function seedRolePermissions() {
  console.log('\n🔗 Assigning permissions to roles...')
  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.role.findUnique({ where: { name: roleName } })
    if (!role) continue
    for (const permName of permissionNames) {
      const permission = await db.permission.findUnique({ where: { name: permName } })
      if (!permission) continue
      const existing = await db.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      })
      if (!existing) {
        await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
      }
    }
    console.log(`  ✅ Assigned permissions to "${roleName}".`)
  }
}

async function seedDiscountPlans() {
  console.log('\n💰 Seeding discount plans...')
  for (const plan of DISCOUNT_PLANS) {
    const existing = await db.discountPlan.findFirst({ where: { name: plan.name } })
    if (existing) { console.log(`  ✅ Plan "${plan.name}" already exists.`); continue }
    await db.discountPlan.create({ data: plan })
    console.log(`  ✅ Created plan: "${plan.name}"`)
  }
}

async function seedPageContents() {
  console.log('\n📄 Seeding page contents...')
  for (const page of PAGE_CONTENTS) {
    const existing = await db.pageContent.findUnique({ where: { slug: page.slug } })
    if (existing) { console.log(`  ✅ Page "${page.slug}" already exists.`); continue }
    await db.pageContent.create({ data: page })
    console.log(`  ✅ Created page: "${page.slug}"`)
  }
}

/** Demo accounts — must not be auto-created via OTP with only USER role */
const SEEDED_DEMO_MOBILES = [
  '09999999999',
  '09222222222',
  '09123456789',
  '09111111111',
  '09333333333',
] as const

async function createUser(mobile: string, email: string | undefined, password: string, firstName: string, lastName: string, nationalCode: string | undefined, roleName: string) {
  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await db.user.upsert({
    where: { mobile },
    update: {
      email: email ?? undefined,
      password: hashedPassword,
      status: 'ACTIVE',
      isMobileVerified: true,
    },
    create: { mobile, email, password: hashedPassword, status: 'ACTIVE', isMobileVerified: true },
  })
  await db.userProfile.upsert({
    where: { userId: user.id },
    update: { firstName, lastName },
    create: { userId: user.id, firstName, lastName, nationalCode },
  })
  const role = await db.role.findUnique({ where: { name: roleName } })
  if (role) {
    // Remove mistaken USER-only role when fixing demo admin/support/doctor/agent accounts
    if (SEEDED_DEMO_MOBILES.includes(mobile as (typeof SEEDED_DEMO_MOBILES)[number]) && roleName !== 'USER') {
      const userOnlyRole = await db.role.findUnique({ where: { name: 'USER' } })
      if (userOnlyRole) {
        await db.userRole.deleteMany({
          where: { userId: user.id, roleId: userOnlyRole.id },
        })
      }
    }
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    })
  }
  return user
}

async function seedUsers() {
  console.log('\n👥 Seeding users...')

  // Super Admin
  const admin = await createUser('09999999999', 'admin@system.ir', 'Admin@123456', 'مدیر', 'کل سیستم', undefined, 'SUPER_ADMIN')
  console.log(`  ✅ Super Admin: 09999999999`)

  // Demo Doctor
  const doctor = await createUser('09222222222', 'dr@clinic.ir', 'Doctor@123456', 'دکتر', 'رضایی', '1234567890', 'DOCTOR')
  await db.doctor.upsert({
    where: { userId: doctor.id },
    update: { status: 'APPROVED', verifiedAt: new Date(), specialty: 'طب عمومی', clinicName: 'کلینیک سلامت', city: 'تهران' },
    create: { userId: doctor.id, medicalCode: 'MED-12345', specialty: 'طب عمومی', clinicName: 'کلینیک سلامت', city: 'تهران', status: 'APPROVED', verifiedAt: new Date() },
  })
  console.log(`  ✅ Doctor: 09222222222`)

  // Demo Agent
  const agent = await createUser('09123456789', undefined, 'Agent@123456', 'علی', 'محمدی', undefined, 'AGENT')
  await db.agent.upsert({
    where: { userId: agent.id },
    update: { status: 'APPROVED', verifiedAt: new Date() },
    create: { userId: agent.id, businessName: 'شرکت نمونه', status: 'APPROVED', verifiedAt: new Date() },
  })
  console.log(`  ✅ Agent: 09123456789`)

  // Demo User with active plan
  const user = await createUser('09111111111', undefined, 'User@123456', 'سارا', 'احمدی', '0012345678', 'USER')
  const plan = await db.discountPlan.findFirst({ where: { name: 'طرح طلایی' } })
  if (plan) {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 90)
    const userPlan = await db.userPlan.create({
      data: {
        userId: user.id,
        planId: plan.id,
        referrerId: agent.id,
        status: 'ACTIVE',
        endDate,
        remainingUses: -1,
      },
    })
    // Create commission for the agent
    await db.commission.create({
      data: {
        agentId: agent.id,
        userPlanId: userPlan.id,
        amount: 45000,
        percent: 10,
        status: 'PENDING',
      },
    })
  }
  console.log(`  ✅ User: 09111111111 (with active plan)`)

  // Support user
  const support = await createUser('09333333333', undefined, 'Support@123456', 'مریم', 'حسینی', undefined, 'SUPPORT')
  console.log(`  ✅ Support: 09333333333`)
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('============================================')
  console.log('🚀 Starting database seed...')
  console.log('============================================')
  try {
    await seedRoles()
    await seedPermissions()
    await seedRolePermissions()
    await seedDiscountPlans()
    await seedPageContents()
    await seedUsers()
    console.log('\n============================================')
    console.log('✅ Seed completed successfully!')
    console.log('============================================')
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

export default main
main()
