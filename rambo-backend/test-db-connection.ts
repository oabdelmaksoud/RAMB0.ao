import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const workflows = await prisma.workflow.findMany()
  console.log('Workflows:', workflows)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
