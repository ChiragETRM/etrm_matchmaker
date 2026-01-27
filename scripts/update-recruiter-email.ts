import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating recruiter email for all jobs...')
  
  const result = await prisma.job.updateMany({
    data: {
      recruiterEmailTo: 'chiragvit@gmail.com',
    },
  })

  console.log(`Updated ${result.count} job(s) with recruiter email: chiragvit@gmail.com`)
  
  // Verify the update
  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      title: true,
      recruiterEmailTo: true,
    },
  })
  
  console.log('\nVerification - All jobs:')
  jobs.forEach((job) => {
    console.log(`  - ${job.title}: ${job.recruiterEmailTo}`)
  })
}

main()
  .catch((e) => {
    console.error('Error updating jobs:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
