import { PrismaClient } from '@prisma/client'
import slugify from 'slugify'

function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  }) + '-' + Date.now().toString(36)
}

const prisma = new PrismaClient()

const sampleJobs = [
  {
    title: 'Senior ETRM Business Analyst - Endur',
    companyName: 'Energy Trading Solutions Ltd',
    locationText: 'London, UK',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'ETRM_BA' as const,
    etrmPackages: ['Endur'],
    commodityTags: ['Power', 'Gas', 'LNG'],
    budgetMin: 120000,
    budgetMax: 150000,
    budgetCurrency: 'GBP',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Business Analyst (**Endur**)

**Role Summary**
You sit between traders, operations, risk, and IT. Your job is to translate how money is made (and lost) into how **Endur** behaves.

**Key Responsibilities**
• Gather and document front-to-back trading requirements (deal capture → **PnL** → settlement).
• Configure **Endur** workflows for physical and financial trades.
• Define **PnL**, risk, and position reporting requirements.
• Support **UAT**, defect triage, and production issues.
• Work with developers on functional specs and solution design.
• Support regulatory and compliance reporting where required.

**Required Skills**
• Hands-on **Endur** experience as a BA.
• Strong understanding of energy trading workflows (power, gas, oil, LNG, emissions).
• Solid grasp of trade lifecycle, confirmations, settlements, and accounting.
• Comfortable speaking to traders and control functions.
• **SQL** for data validation and analysis.

**Nice to Have**
• Exposure to **MiFID II** / **REMIT** / **EMIR**.
• Experience with exchange-traded products (**ICE**, **EEX**, **CME**).
• Prior implementation or upgrade projects.`,
    recruiterEmailTo: 'recruiter@example.com',
    questions: [
      {
        key: 'years_endur',
        label: 'How many years of hands-on Endur experience do you have?',
        type: 'NUMBER' as const,
        required: true,
        options: null,
        orderIndex: 0,
      },
      {
        key: 'languages',
        label: 'Which languages do you speak? (Select all that apply)',
        type: 'MULTI_SELECT' as const,
        required: true,
        options: ['English', 'German', 'French', 'Spanish', 'Korean', 'Italian', 'Chinese'],
        orderIndex: 1,
      },
    ],
    gateRules: [
      {
        questionKey: 'years_endur',
        operator: 'GTE' as const,
        value: 5,
        orderIndex: 0,
      },
      {
        questionKey: 'languages',
        operator: 'INCLUDES_ANY' as const,
        value: ['German'],
        orderIndex: 1,
      },
    ],
  },
  {
    title: 'ETRM Developer - Endur (OpenJVS)',
    companyName: 'Commodity Trading Systems',
    locationText: 'New York, USA',
    remotePolicy: 'REMOTE' as const,
    contractType: 'CONTRACT' as const,
    seniority: 'MID' as const,
    roleCategory: 'ETRM_DEV' as const,
    etrmPackages: ['Endur'],
    commodityTags: ['Oil', 'Refined Products'],
    budgetMin: 800,
    budgetMax: 1000,
    budgetCurrency: 'USD',
    budgetPeriod: 'DAY_RATE' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Developer (**Endur**)

**Role Summary**
You build, customize, and extend **Endur**. When configuration hits its limits, you write code.

**Key Responsibilities**
• Develop and maintain **Endur** customizations (**JVS** / **OpenJVS**).
• Build interfaces to exchanges, schedulers, and downstream systems.
• Develop custom reports, scripts, and automation.
• Optimize performance and resolve production issues.
• Support **Endur** upgrades and patches.
• Collaborate with BAs and testers during delivery and go-live.

**Required Skills**
• Strong **Endur** development experience.
• Proficiency in **OpenJVS** / **JVS**.
• Solid **SQL** and database knowledge (**Oracle**).
• Understanding of **Endur** data model and transaction objects.
• Experience with version control and deployment processes.

**Nice to Have**
• **Java**, **Python**, or scripting outside **Endur**.
• Experience with market data feeds and trade capture interfaces.
• Cloud or modern data platform exposure.`,
    recruiterEmailTo: 'recruiter@example.com',
    questions: [
      {
        key: 'years_endur',
        label: 'How many years of hands-on Endur experience do you have?',
        type: 'NUMBER' as const,
        required: true,
        options: null,
        orderIndex: 0,
      },
      {
        key: 'work_permit_country',
        label: 'Do you have a legal work permit for United States?',
        type: 'BOOLEAN' as const,
        required: true,
        options: null,
        orderIndex: 1,
      },
    ],
    gateRules: [
      {
        questionKey: 'years_endur',
        operator: 'GTE' as const,
        value: 3,
        orderIndex: 0,
      },
      {
        questionKey: 'work_permit_country',
        operator: 'EQ' as const,
        value: true,
        orderIndex: 1,
      },
    ],
  },
  {
    title: 'ETRM QA Analyst / Tester - Endur',
    companyName: 'Trading Technology Partners',
    locationText: 'Amsterdam, Netherlands',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'MID' as const,
    roleCategory: 'ETRM_TESTER' as const,
    etrmPackages: ['Endur'],
    commodityTags: ['Power', 'Gas', 'Emissions'],
    budgetMin: 70000,
    budgetMax: 90000,
    budgetCurrency: 'EUR',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Tester / QA Analyst (**Endur**)

**Role Summary**
You break things before traders do. You make sure **Endur** behaves exactly as the desk expects—no surprises on day one.

**Key Responsibilities**
• Design and execute test cases for **Endur** configurations and customizations.
• Perform system, integration, and **UAT** testing.
• Validate trade lifecycle, **PnL**, risk, settlements, and reports.
• Reconcile **Endur** outputs with expected business results.
• Log, track, and retest defects.
• Support regression testing for upgrades and fixes.

**Required Skills**
• Hands-on **Endur** testing experience.
• Strong understanding of trading workflows and **PnL** logic.
• Experience validating reports and data outputs.
• Attention to detail and structured testing approach.
• Ability to work closely with BAs and developers.

**Nice to Have**
• Automation testing exposure.
• **SQL** for data validation.
• Prior front-office or operations exposure.`,
    recruiterEmailTo: 'recruiter@example.com',
    questions: [
      {
        key: 'years_endur',
        label: 'How many years of hands-on Endur experience do you have?',
        type: 'NUMBER' as const,
        required: true,
        options: null,
        orderIndex: 0,
      },
      {
        key: 'commodities',
        label: 'Which commodity markets do you have strong domain knowledge in?',
        type: 'MULTI_SELECT' as const,
        required: true,
        options: ['Power', 'Gas', 'LNG', 'Oil', 'Refined Products', 'Emissions', 'Coal', 'Freight'],
        orderIndex: 1,
      },
    ],
    gateRules: [
      {
        questionKey: 'years_endur',
        operator: 'GTE' as const,
        value: 2,
        orderIndex: 0,
      },
      {
        questionKey: 'commodities',
        operator: 'INCLUDES_ANY' as const,
        value: ['Power', 'Gas'],
        orderIndex: 1,
      },
    ],
  },
  {
    title: 'ETRM Developer - Allegro',
    companyName: 'Energy Markets Technology',
    locationText: 'Houston, USA',
    remotePolicy: 'ONSITE' as const,
    contractType: 'PERM' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'ETRM_DEV' as const,
    etrmPackages: ['Allegro'],
    commodityTags: ['Oil', 'Gas', 'LNG'],
    budgetMin: 140000,
    budgetMax: 180000,
    budgetCurrency: 'USD',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Developer - **Allegro**

**Role Summary**
We're looking for an experienced **Allegro** developer to join our trading technology team. You'll be responsible for developing, maintaining, and enhancing our **Allegro** ETRM system.

**Key Responsibilities**
• Develop and maintain **Allegro** customizations and integrations.
• Build interfaces to market data providers and downstream systems.
• Develop custom reports and analytics dashboards.
• Optimize system performance and resolve production issues.
• Support **Allegro** upgrades and configuration changes.
• Collaborate with business analysts and traders.

**Required Skills**
• Strong **Allegro** development experience (3+ years).
• Proficiency in **SQL** and database design.
• Understanding of energy trading workflows.
• Experience with oil, gas, and LNG markets.
• Strong problem-solving and debugging skills.

**Nice to Have**
• Experience with **Allegro** Risk Management modules.
• Knowledge of **Python** or **C#**.
• Cloud deployment experience.`,
    recruiterEmailTo: 'recruiter@example.com',
    questions: [
      {
        key: 'years_allegro',
        label: 'How many years of hands-on Allegro experience do you have?',
        type: 'NUMBER' as const,
        required: true,
        options: null,
        orderIndex: 0,
      },
      {
        key: 'commodities',
        label: 'Which commodity markets do you have strong domain knowledge in?',
        type: 'MULTI_SELECT' as const,
        required: true,
        options: ['Power', 'Gas', 'LNG', 'Oil', 'Refined Products', 'Emissions', 'Coal', 'Freight'],
        orderIndex: 1,
      },
    ],
    gateRules: [
      {
        questionKey: 'years_allegro',
        operator: 'GTE' as const,
        value: 3,
        orderIndex: 0,
      },
      {
        questionKey: 'commodities',
        operator: 'INCLUDES_ANY' as const,
        value: ['Oil', 'Gas'],
        orderIndex: 1,
      },
    ],
  },
  {
    title: 'ETRM Business Analyst - RightAngle',
    companyName: 'Commodity Risk Solutions',
    locationText: 'Singapore',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'MID' as const,
    roleCategory: 'ETRM_BA' as const,
    etrmPackages: ['RightAngle'],
    commodityTags: ['Oil', 'Refined Products', 'Coal'],
    budgetMin: 90000,
    budgetMax: 120000,
    budgetCurrency: 'SGD',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Business Analyst - **RightAngle**

**Role Summary**
Join our team as an ETRM Business Analyst specializing in **RightAngle**. You'll work closely with traders, risk managers, and IT to ensure our **RightAngle** system meets business requirements.

**Key Responsibilities**
• Gather and document trading and risk management requirements.
• Configure **RightAngle** workflows for physical and financial trades.
• Define risk, PnL, and position reporting requirements.
• Support UAT and production issue resolution.
• Work with developers on customizations and integrations.
• Train end users on **RightAngle** functionality.

**Required Skills**
• Hands-on **RightAngle** experience as a BA (2+ years).
• Strong understanding of commodity trading workflows.
• Experience with oil, refined products, or coal markets.
• Solid grasp of trade lifecycle and risk management.
• Excellent communication and documentation skills.

**Nice to Have**
• Experience with **RightAngle** Risk Management.
• SQL knowledge for data validation.
• Prior experience in Asia-Pacific markets.`,
    recruiterEmailTo: 'recruiter@example.com',
    questions: [
      {
        key: 'years_rightangle',
        label: 'How many years of hands-on RightAngle experience do you have?',
        type: 'NUMBER' as const,
        required: true,
        options: null,
        orderIndex: 0,
      },
      {
        key: 'languages',
        label: 'Which languages do you speak? (Select all that apply)',
        type: 'MULTI_SELECT' as const,
        required: true,
        options: ['English', 'German', 'French', 'Spanish', 'Korean', 'Italian', 'Chinese'],
        orderIndex: 1,
      },
    ],
    gateRules: [
      {
        questionKey: 'years_rightangle',
        operator: 'GTE' as const,
        value: 2,
        orderIndex: 0,
      },
      {
        questionKey: 'languages',
        operator: 'INCLUDES_ANY' as const,
        value: ['Chinese'],
        orderIndex: 1,
      },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding sample jobs...\n')

  for (const jobData of sampleJobs) {
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
    console.log(`   URL: /jobs/${job.slug}\n`)
  }

  console.log('✨ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding jobs:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
