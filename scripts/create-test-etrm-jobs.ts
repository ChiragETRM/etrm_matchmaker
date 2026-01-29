import { PrismaClient } from '@prisma/client'
import { generateSlug } from '../lib/utils'

const prisma = new PrismaClient()

const testJobs = [
  {
    title: 'ETRM Business Analyst - Endur',
    companyName: 'Test Energy Corp',
    locationText: 'London, UK',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'MID' as const,
    roleCategory: 'BA',
    etrmPackages: ['Endur'],
    commodityTags: ['Power', 'Gas'],
    budgetMin: 80000,
    budgetMax: 100000,
    budgetCurrency: 'GBP',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Business Analyst - Endur

**Role Summary**
Test position for ETRM Business Analyst with Endur experience.

**Key Responsibilities**
• Gather and document trading requirements
• Configure Endur workflows
• Support UAT and production issues

**Required Skills**
• Hands-on Endur experience
• Understanding of energy trading workflows
• SQL knowledge`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM Developer - Allegro',
    companyName: 'Test Trading Systems',
    locationText: 'Houston, USA',
    remotePolicy: 'REMOTE' as const,
    contractType: 'CONTRACT' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'DEV',
    etrmPackages: ['Allegro'],
    commodityTags: ['Oil', 'Gas'],
    budgetMin: 900,
    budgetMax: 1100,
    budgetCurrency: 'USD',
    budgetPeriod: 'DAY_RATE' as const,
    budgetIsEstimate: true,
    jdText: `ETRM Developer - Allegro

**Role Summary**
Test position for ETRM Developer with Allegro experience.

**Key Responsibilities**
• Develop and maintain Allegro configurations
• Build custom reports and workflows
• Integrate with trading systems

**Required Skills**
• Strong Allegro development experience
• SQL and database skills
• Energy trading domain knowledge`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM Risk Analyst - RightAngle',
    companyName: 'Test Risk Solutions',
    locationText: 'Singapore',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'MID' as const,
    roleCategory: 'RISK',
    etrmPackages: ['RightAngle'],
    commodityTags: ['Oil', 'Refined Products'],
    budgetMin: 100000,
    budgetMax: 130000,
    budgetCurrency: 'SGD',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Risk Analyst - RightAngle

**Role Summary**
Test position for ETRM Risk Analyst with RightAngle experience.

**Key Responsibilities**
• Monitor and analyze trading risk
• Configure RightAngle risk models
• Generate risk reports

**Required Skills**
• RightAngle experience
• Risk management knowledge
• Energy trading background`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM Operations Analyst - Endur',
    companyName: 'Test Operations Ltd',
    locationText: 'Amsterdam, Netherlands',
    remotePolicy: 'ONSITE' as const,
    contractType: 'PERM' as const,
    seniority: 'JUNIOR' as const,
    roleCategory: 'OPS',
    etrmPackages: ['Endur'],
    commodityTags: ['Power', 'Gas', 'LNG'],
    budgetMin: 50000,
    budgetMax: 65000,
    budgetCurrency: 'EUR',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Operations Analyst - Endur

**Role Summary**
Test position for ETRM Operations Analyst with Endur experience.

**Key Responsibilities**
• Support daily trading operations
• Monitor trade confirmations and settlements
• Resolve operational issues

**Required Skills**
• Endur operational experience
• Attention to detail
• Problem-solving skills`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM Trading Analyst - Allegro',
    companyName: 'Test Trading Group',
    locationText: 'New York, USA',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'TRADING',
    etrmPackages: ['Allegro'],
    commodityTags: ['Oil', 'Gas', 'Power'],
    budgetMin: 150000,
    budgetMax: 180000,
    budgetCurrency: 'USD',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Trading Analyst - Allegro

**Role Summary**
Test position for ETRM Trading Analyst with Allegro experience.

**Key Responsibilities**
• Support trading desk operations
• Analyze market data and positions
• Optimize trading workflows

**Required Skills**
• Allegro trading system experience
• Strong analytical skills
• Energy markets knowledge`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM Developer - RightAngle',
    companyName: 'Test Dev Solutions',
    locationText: 'London, UK',
    remotePolicy: 'REMOTE' as const,
    contractType: 'CONTRACT' as const,
    seniority: 'MID' as const,
    roleCategory: 'DEV',
    etrmPackages: ['RightAngle'],
    commodityTags: ['Oil', 'Gas'],
    budgetMin: 700,
    budgetMax: 900,
    budgetCurrency: 'GBP',
    budgetPeriod: 'DAY_RATE' as const,
    budgetIsEstimate: true,
    jdText: `ETRM Developer - RightAngle

**Role Summary**
Test position for ETRM Developer with RightAngle experience.

**Key Responsibilities**
• Develop RightAngle customizations
• Build integrations and reports
• Support system upgrades

**Required Skills**
• RightAngle development experience
• C# and SQL skills
• Energy trading domain knowledge`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM Compliance Analyst - Endur',
    companyName: 'Test Compliance Inc',
    locationText: 'Frankfurt, Germany',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'MID' as const,
    roleCategory: 'COMPLIANCE',
    etrmPackages: ['Endur'],
    commodityTags: ['Power', 'Gas', 'Emissions'],
    budgetMin: 70000,
    budgetMax: 90000,
    budgetCurrency: 'EUR',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Compliance Analyst - Endur

**Role Summary**
Test position for ETRM Compliance Analyst with Endur experience.

**Key Responsibilities**
• Ensure regulatory compliance
• Configure Endur compliance reporting
• Support audits and inspections

**Required Skills**
• Endur compliance experience
• Regulatory knowledge (MiFID II, EMIR)
• Attention to detail`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM Business Analyst - Allegro',
    companyName: 'Test BA Services',
    locationText: 'Houston, USA',
    remotePolicy: 'ONSITE' as const,
    contractType: 'PERM' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'BA',
    etrmPackages: ['Allegro'],
    commodityTags: ['Oil', 'Refined Products', 'Gas'],
    budgetMin: 120000,
    budgetMax: 150000,
    budgetCurrency: 'USD',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Business Analyst - Allegro

**Role Summary**
Test position for ETRM Business Analyst with Allegro experience.

**Key Responsibilities**
• Gather business requirements
• Configure Allegro workflows
• Support trading operations

**Required Skills**
• Strong Allegro BA experience
• Energy trading knowledge
• Excellent communication skills`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM QA Analyst - Endur',
    companyName: 'Test QA Solutions',
    locationText: 'Amsterdam, Netherlands',
    remotePolicy: 'HYBRID' as const,
    contractType: 'CONTRACT' as const,
    seniority: 'MID' as const,
    roleCategory: 'OPS',
    etrmPackages: ['Endur'],
    commodityTags: ['Power', 'Gas'],
    budgetMin: 600,
    budgetMax: 750,
    budgetCurrency: 'EUR',
    budgetPeriod: 'DAY_RATE' as const,
    budgetIsEstimate: true,
    jdText: `ETRM QA Analyst - Endur

**Role Summary**
Test position for ETRM QA Analyst with Endur experience.

**Key Responsibilities**
• Test Endur configurations
• Validate trading workflows
• Execute test cases and report defects

**Required Skills**
• Endur testing experience
• QA methodologies
• Energy trading understanding`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
  {
    title: 'ETRM Developer - Endur (OpenJVS)',
    companyName: 'Test Dev Corp',
    locationText: 'Singapore',
    remotePolicy: 'REMOTE' as const,
    contractType: 'CONTRACT' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'DEV',
    etrmPackages: ['Endur'],
    commodityTags: ['Power', 'Gas', 'LNG'],
    budgetMin: 1000,
    budgetMax: 1200,
    budgetCurrency: 'SGD',
    budgetPeriod: 'DAY_RATE' as const,
    budgetIsEstimate: true,
    jdText: `ETRM Developer - Endur (OpenJVS)

**Role Summary**
Test position for ETRM Developer with Endur OpenJVS experience.

**Key Responsibilities**
• Develop Endur OpenJVS solutions
• Build custom reports and workflows
• Integrate with external systems

**Required Skills**
• Strong Endur OpenJVS development
• Java and SQL skills
• Energy trading domain expertise`,
    recruiterEmailTo: 'chiragvit@gmail.com',
    questions: [],
    gateRules: [],
  },
]

async function main() {
  console.log('🌱 Creating 10 test ETRM jobs...\n')

  for (const jobData of testJobs) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const slug = generateSlug(jobData.title)

    // Check if job already exists
    const existing = await prisma.job.findUnique({
      where: { slug },
    })

    if (existing) {
      console.log(`⏭️  Skipping "${jobData.title}" (already exists)`)
      continue
    }

    const job = await prisma.job.create({
      data: {
        slug,
        title: jobData.title,
        companyName: jobData.companyName,
        locationText: jobData.locationText,
        remotePolicy: jobData.remotePolicy,
        contractType: jobData.contractType,
        seniority: jobData.seniority,
        roleCategory: jobData.roleCategory,
        etrmPackages: jobData.etrmPackages,
        commodityTags: jobData.commodityTags,
        budgetMin: jobData.budgetMin,
        budgetMax: jobData.budgetMax,
        budgetCurrency: jobData.budgetCurrency,
        budgetPeriod: jobData.budgetPeriod,
        budgetIsEstimate: jobData.budgetIsEstimate,
        jdText: jobData.jdText,
        recruiterEmailTo: jobData.recruiterEmailTo,
        expiresAt,
        questionnaire: {
          create: {
            version: 1,
            questions: {
              create: jobData.questions.map((q) => ({
                key: q.key,
                label: q.label,
                type: q.type,
                required: q.required,
                optionsJson: q.options ? JSON.stringify(q.options) : null,
                orderIndex: q.orderIndex,
              })),
            },
            gateRules: {
              create: jobData.gateRules.map((r) => ({
                questionKey: r.questionKey,
                operator: r.operator,
                valueJson: JSON.stringify(r.value),
                orderIndex: r.orderIndex,
              })),
            },
          },
        },
      },
    })

    console.log(`✅ Created: "${jobData.title}"`)
    console.log(`   Slug: ${job.slug}`)
    console.log(`   Recruiter: ${job.recruiterEmailTo}`)
    console.log(`   URL: /jobs/${job.slug}\n`)
  }

  console.log('✨ Test job creation complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error creating test jobs:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
