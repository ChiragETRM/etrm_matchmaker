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
  {
    title: 'Senior ETRM Developer - Trayport',
    companyName: 'European Energy Trading',
    locationText: 'Frankfurt, Germany',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'ETRM_DEV' as const,
    etrmPackages: ['Trayport'],
    commodityTags: ['Power', 'Gas', 'Emissions'],
    budgetMin: 100000,
    budgetMax: 130000,
    budgetCurrency: 'EUR',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `Senior ETRM Developer - **Trayport**

**Role Summary**
We're seeking an experienced **Trayport** developer to enhance our European power and gas trading platform. You'll work on critical trading infrastructure and integrations.

**Key Responsibilities**
• Develop and maintain **Trayport** customizations and workflows.
• Build interfaces to European exchanges (EEX, ICE Endex, Nord Pool).
• Develop real-time trading and position management solutions.
• Optimize system performance for high-frequency trading.
• Support production trading operations and resolve issues.
• Collaborate with traders and operations teams.

**Required Skills**
• Strong **Trayport** development experience (4+ years).
• Experience with European power and gas markets.
• Proficiency in **SQL** and database optimization.
• Understanding of exchange connectivity and market data.
• Strong problem-solving under pressure.

**Nice to Have**
• Experience with **Trayport** Voltaire or Gravity.
• Knowledge of **Python** or **C#**.
• Exposure to emissions trading (EU ETS).`,
    recruiterEmailTo: 'recruiter@example.com',
    questions: [
      {
        key: 'years_trayport',
        label: 'How many years of hands-on Trayport experience do you have?',
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
      {
        key: 'commodities',
        label: 'Which commodity markets do you have strong domain knowledge in?',
        type: 'MULTI_SELECT' as const,
        required: true,
        options: ['Power', 'Gas', 'LNG', 'Oil', 'Refined Products', 'Emissions', 'Coal', 'Freight'],
        orderIndex: 2,
      },
    ],
    gateRules: [
      {
        questionKey: 'years_trayport',
        operator: 'GTE' as const,
        value: 4,
        orderIndex: 0,
      },
      {
        questionKey: 'languages',
        operator: 'INCLUDES_ANY' as const,
        value: ['German'],
        orderIndex: 1,
      },
      {
        questionKey: 'commodities',
        operator: 'INCLUDES_ANY' as const,
        value: ['Power', 'Gas'],
        orderIndex: 2,
      },
    ],
  },
  {
    title: 'ETRM Business Analyst - Endur & Allegro',
    companyName: 'Global Commodity Trading',
    locationText: 'London, UK',
    remotePolicy: 'REMOTE' as const,
    contractType: 'CONTRACT' as const,
    seniority: 'MID' as const,
    roleCategory: 'ETRM_BA' as const,
    etrmPackages: ['Endur', 'Allegro'],
    commodityTags: ['Oil', 'Gas', 'LNG', 'Refined Products'],
    budgetMin: 600,
    budgetMax: 800,
    budgetCurrency: 'GBP',
    budgetPeriod: 'DAY_RATE' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Business Analyst - **Endur** & **Allegro**

**Role Summary**
We need a versatile ETRM Business Analyst with experience in both **Endur** and **Allegro** to support our multi-system trading environment.

**Key Responsibilities**
• Gather requirements for both **Endur** and **Allegro** systems.
• Document cross-system workflows and integrations.
• Configure trading workflows in both platforms.
• Support UAT and production issue resolution.
• Work with developers on integration projects.
• Train users on both systems.

**Required Skills**
• Hands-on experience with both **Endur** and **Allegro** (2+ years each).
• Strong understanding of commodity trading workflows.
• Experience with oil, gas, and refined products markets.
• Excellent documentation and communication skills.
• Ability to work with multiple stakeholders.

**Nice to Have**
• Experience with system integration projects.
• SQL knowledge for data validation.
• Exposure to risk management modules.`,
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
        key: 'years_allegro',
        label: 'How many years of hands-on Allegro experience do you have?',
        type: 'NUMBER' as const,
        required: true,
        options: null,
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
        questionKey: 'years_allegro',
        operator: 'GTE' as const,
        value: 2,
        orderIndex: 1,
      },
    ],
  },
  {
    title: 'ETRM Tester - RightAngle',
    companyName: 'Commodity Systems Testing',
    locationText: 'Chicago, USA',
    remotePolicy: 'HYBRID' as const,
    contractType: 'PERM' as const,
    seniority: 'MID' as const,
    roleCategory: 'ETRM_TESTER' as const,
    etrmPackages: ['RightAngle'],
    commodityTags: ['Oil', 'Refined Products', 'Coal'],
    budgetMin: 95000,
    budgetMax: 115000,
    budgetCurrency: 'USD',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Tester / QA Analyst - **RightAngle**

**Role Summary**
Join our QA team as an ETRM Tester specializing in **RightAngle**. You'll ensure our trading system works flawlessly before it reaches traders.

**Key Responsibilities**
• Design and execute test cases for **RightAngle** configurations.
• Perform system, integration, and UAT testing.
• Validate trade lifecycle, risk, and PnL calculations.
• Reconcile system outputs with expected business results.
• Log, track, and retest defects.
• Support regression testing for upgrades.

**Required Skills**
• Hands-on **RightAngle** testing experience (2+ years).
• Strong understanding of commodity trading workflows.
• Experience with oil, refined products, or coal markets.
• Attention to detail and structured testing approach.
• Ability to work with BAs and developers.

**Nice to Have**
• Automation testing exposure.
• SQL for data validation.
• Prior operations or risk management exposure.`,
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
        key: 'work_permit_country',
        label: 'Do you have a legal work permit for United States?',
        type: 'BOOLEAN' as const,
        required: true,
        options: null,
        orderIndex: 1,
      },
      {
        key: 'commodities',
        label: 'Which commodity markets do you have strong domain knowledge in?',
        type: 'MULTI_SELECT' as const,
        required: true,
        options: ['Power', 'Gas', 'LNG', 'Oil', 'Refined Products', 'Emissions', 'Coal', 'Freight'],
        orderIndex: 2,
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
        questionKey: 'work_permit_country',
        operator: 'EQ' as const,
        value: true,
        orderIndex: 1,
      },
      {
        questionKey: 'commodities',
        operator: 'INCLUDES_ANY' as const,
        value: ['Oil', 'Refined Products'],
        orderIndex: 2,
      },
    ],
  },
  {
    title: 'Senior ETRM Developer - Endur (OpenJVS)',
    companyName: 'Energy Trading Innovations',
    locationText: 'Zurich, Switzerland',
    remotePolicy: 'REMOTE' as const,
    contractType: 'PERM' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'ETRM_DEV' as const,
    etrmPackages: ['Endur'],
    commodityTags: ['Power', 'Gas', 'LNG', 'Emissions'],
    budgetMin: 130000,
    budgetMax: 160000,
    budgetCurrency: 'CHF',
    budgetPeriod: 'ANNUAL' as const,
    budgetIsEstimate: false,
    jdText: `Senior ETRM Developer - **Endur** (OpenJVS)

**Role Summary**
We're looking for a senior **Endur** developer with strong **OpenJVS** skills to lead our development initiatives. You'll architect solutions and mentor junior developers.

**Key Responsibilities**
• Lead **Endur** development projects and architecture decisions.
• Develop complex customizations using **OpenJVS** and **JVS**.
• Build high-performance interfaces to exchanges and market data providers.
• Optimize system performance and resolve critical production issues.
• Mentor junior developers and establish best practices.
• Support **Endur** upgrades and migration projects.

**Required Skills**
• Strong **Endur** development experience (5+ years).
• Expert-level proficiency in **OpenJVS** / **JVS**.
• Deep **SQL** and **Oracle** database knowledge.
• Strong understanding of **Endur** data model and architecture.
• Experience leading development projects.

**Nice to Have**
• Experience with **Endur** cloud deployments.
• Knowledge of **Java** or **Python**.
• Exposure to European power and gas markets.`,
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
      {
        key: 'work_permit_country',
        label: 'Do you have a legal work permit for Switzerland?',
        type: 'BOOLEAN' as const,
        required: true,
        options: null,
        orderIndex: 2,
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
        value: ['German', 'French'],
        orderIndex: 1,
      },
      {
        questionKey: 'work_permit_country',
        operator: 'EQ' as const,
        value: true,
        orderIndex: 2,
      },
    ],
  },
  {
    title: 'ETRM Business Analyst - Multiple Packages',
    companyName: 'Trading Systems Consulting',
    locationText: 'Sydney, Australia',
    remotePolicy: 'HYBRID' as const,
    contractType: 'CONTRACT' as const,
    seniority: 'SENIOR' as const,
    roleCategory: 'ETRM_BA' as const,
    etrmPackages: ['Endur', 'Allegro', 'RightAngle'],
    commodityTags: ['Power', 'Gas', 'LNG', 'Oil'],
    budgetMin: 900,
    budgetMax: 1100,
    budgetCurrency: 'AUD',
    budgetPeriod: 'DAY_RATE' as const,
    budgetIsEstimate: false,
    jdText: `ETRM Business Analyst - Multiple Packages

**Role Summary**
We need a senior ETRM Business Analyst with broad experience across multiple ETRM systems to support our consulting engagements.

**Key Responsibilities**
• Work on multiple ETRM systems (**Endur**, **Allegro**, **RightAngle**).
• Gather requirements and document workflows across platforms.
• Support implementation and upgrade projects.
• Conduct system assessments and gap analyses.
• Train end users and create documentation.
• Work with clients across different industries.

**Required Skills**
• Experience with at least 2 major ETRM systems (3+ years each).
• Strong understanding of energy trading workflows.
• Excellent communication and client-facing skills.
• Ability to work across multiple projects simultaneously.
• Strong documentation and presentation skills.

**Nice to Have**
• Consulting experience.
• Experience with system selection projects.
• Knowledge of regulatory requirements (MiFID II, EMIR).`,
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
        key: 'years_allegro',
        label: 'How many years of hands-on Allegro experience do you have?',
        type: 'NUMBER' as const,
        required: true,
        options: null,
        orderIndex: 1,
      },
      {
        key: 'years_rightangle',
        label: 'How many years of hands-on RightAngle experience do you have?',
        type: 'NUMBER' as const,
        required: true,
        options: null,
        orderIndex: 2,
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
        questionKey: 'years_allegro',
        operator: 'GTE' as const,
        value: 3,
        orderIndex: 1,
      },
      {
        questionKey: 'years_rightangle',
        operator: 'GTE' as const,
        value: 2,
        orderIndex: 2,
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
