const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedBaseline() {
  console.log('--- Seeding Platform Baseline (Admin, Plans, Features) ---');

  // 1. Seed Platform SuperAdmin
  const adminEmail = process.env.SUPERADMIN_EMAIL || 'admin@restroconnect.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD || 'ChangeMeInProduction123!';
  const adminName = process.env.SUPERADMIN_NAME || 'Platform SuperAdmin';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.platformAdmin.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: adminName,
      role: 'PLATFORM_SUPER_ADMIN',
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: 'PLATFORM_SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✓ Platform SuperAdmin: ${admin.email} (ID: ${admin.id})`);

  // 2. Seed Subscription Plans
  const plansData = [
    {
      name: 'Starter',
      description: 'Essential restaurant management & WhatsApp direct ordering for single outlets',
      price: 2999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      maxBranches: 1,
      maxUsers: 5,
      features: JSON.stringify(['WHATSAPP_ORDERING', 'ONLINE_ORDERING', 'REPORTS']),
    },
    {
      name: 'Professional',
      description: 'Advanced loyalty, marketing campaigns, and multi-staff for growing restaurants',
      price: 7999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      maxBranches: 3,
      maxUsers: 15,
      features: JSON.stringify([
        'WHATSAPP_ORDERING',
        'WHATSAPP_CATALOG',
        'ONLINE_ORDERING',
        'LOYALTY',
        'CAMPAIGNS',
        'PUSH_NOTIFICATIONS',
        'MULTI_BRANCH',
        'REPORTS',
        'ANALYTICS',
        'COUPONS',
      ]),
    },
    {
      name: 'Enterprise',
      description: 'Unlimited branches, dedicated infrastructure, custom domain and custom SLAs',
      price: 19999,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      maxBranches: 999,
      maxUsers: 999,
      features: JSON.stringify([
        'WHATSAPP_ORDERING',
        'WHATSAPP_CATALOG',
        'ONLINE_ORDERING',
        'LOYALTY',
        'CAMPAIGNS',
        'PUSH_NOTIFICATIONS',
        'MULTI_BRANCH',
        'REPORTS',
        'ANALYTICS',
        'COUPONS',
        'CUSTOM_DOMAIN',
      ]),
    },
  ];

  for (const p of plansData) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.subscriptionPlan.create({ data: p });
    }
  }
  console.log('✓ Subscription Plans ready');

  // 3. Seed Platform Features
  const featuresData = [
    { key: 'RESTAURANT_MANAGEMENT', name: 'Restaurant Management', description: 'Core restaurant details and settings', category: 'OPERATIONS' },
    { key: 'BRANCH_MANAGEMENT', name: 'Branch Management', description: 'Multiple kitchen and dine-in branches', category: 'OPERATIONS' },
    { key: 'MENU_MANAGEMENT', name: 'Menu & Category Management', description: 'Dynamic menu, variants and addon controls', category: 'COMMERCE' },
    { key: 'ORDERS', name: 'Order Management', description: 'Real-time order statuses and kitchen display', category: 'OPERATIONS' },
    { key: 'CUSTOMERS', name: 'Customer Database', description: 'Customer CRM, activity tracking and notes', category: 'MARKETING' },
    { key: 'WHATSAPP_ORDERING', name: 'WhatsApp Ordering Bot', description: 'Direct ordering via WhatsApp chat automation', category: 'COMMERCE' },
    { key: 'WHATSAPP_CATALOG', name: 'WhatsApp Catalog Sync', description: 'Meta Commerce Manager product catalog sync', category: 'COMMERCE' },
    { key: 'ONLINE_ORDERING', name: 'Online Direct Web Ordering', description: 'Responsive web store and direct ordering interface', category: 'COMMERCE' },
    { key: 'LOYALTY', name: 'Loyalty & Points System', description: 'Reward customer repeat visits with redeemable points', category: 'MARKETING' },
    { key: 'CAMPAIGNS', name: 'Customer Broadcast Campaigns', description: 'Targeted broadcast marketing messages', category: 'MARKETING' },
    { key: 'PUSH_NOTIFICATIONS', name: 'Web Push Notifications', description: 'Browser notifications for order updates and promos', category: 'MARKETING' },
    { key: 'MULTI_BRANCH', name: 'Multi-Branch Support', description: 'Branch-level routing, dispatch and staff', category: 'OPERATIONS' },
    { key: 'REPORTS', name: 'Financial & Sales Reports', description: 'Detailed sales summaries, item stats, and exports', category: 'OPERATIONS' },
    { key: 'ANALYTICS', name: 'Executive Analytics', description: 'Customer retention, order heatmaps, and churn analysis', category: 'OPERATIONS' },
    { key: 'COUPONS', name: 'Discounts & Coupons', description: 'Promotional discount codes with usage limits', category: 'COMMERCE' },
    { key: 'CUSTOM_DOMAIN', name: 'Custom Domain (White-label)', description: 'Map restaurant branded custom domain and SSL', category: 'INTEGRATION' },
  ];

  for (const f of featuresData) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description, category: f.category },
      create: f,
    });
  }
  console.log(`✓ Platform Features ready (${featuresData.length} features)`);
}

seedBaseline()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
