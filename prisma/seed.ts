import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rehabops.com' },
    update: {},
    create: {
      email: 'admin@rehabops.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log('Created admin user:', admin.email)

  // Create sample contacts
  const customer = await prisma.contact.upsert({
    where: { id: 'sample-customer-1' },
    update: {},
    create: {
      id: 'sample-customer-1',
      type: 'CUSTOMER',
      name: 'John & Sarah Mitchell',
      email: 'john.mitchell@email.com',
      phone: '+15551234567',
      company: 'Mitchell Family',
    },
  })

  const subcontractor = await prisma.contact.upsert({
    where: { id: 'sample-sub-1' },
    update: {},
    create: {
      id: 'sample-sub-1',
      type: 'SUBCONTRACTOR',
      name: 'Mike Rodriguez Electric',
      email: 'mike@mrelec.com',
      phone: '+15559876543',
      company: 'Rodriguez Electrical Services',
    },
  })

  const sub2 = await prisma.contact.upsert({
    where: { id: 'sample-sub-2' },
    update: {},
    create: {
      id: 'sample-sub-2',
      type: 'SUBCONTRACTOR',
      name: 'Pro Plumbing LLC',
      email: 'info@proplumbing.com',
      phone: '+15555551234',
      company: 'Pro Plumbing LLC',
    },
  })

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { id: 'sample-project-1' },
    update: {},
    create: {
      id: 'sample-project-1',
      name: 'Mitchell Kitchen & Bath Renovation',
      address: '742 Evergreen Terrace, Springfield, IL 62701',
      description: 'Full kitchen remodel and master bath renovation. Includes new cabinets, countertops, tile, plumbing fixtures, and electrical upgrades.',
      status: 'ACTIVE',
      billingModel: 'MILESTONE',
      contractAmount: 48500,
      budgetEstimate: 44000,
      completionPct: 35,
      startDate: new Date('2026-02-01'),
      targetEndDate: new Date('2026-05-15'),
      customerId: customer.id,
    },
  })

  // Create milestones
  const milestoneData = [
    { name: 'Demo & Prep', status: 'COMPLETED' as const, order: 1, invoiceable: true, amount: 5000, dueDate: new Date('2026-02-10'), completedAt: new Date('2026-02-09') },
    { name: 'Rough Plumbing', status: 'COMPLETED' as const, order: 2, invoiceable: true, amount: 8000, dueDate: new Date('2026-02-20'), completedAt: new Date('2026-02-21') },
    { name: 'Rough Electrical', status: 'IN_PROGRESS' as const, order: 3, invoiceable: true, amount: 7500, dueDate: new Date('2026-03-05') },
    { name: 'Drywall & Insulation', status: 'PENDING' as const, order: 4, invoiceable: false, amount: 4500, dueDate: new Date('2026-03-20') },
    { name: 'Tile & Flooring', status: 'PENDING' as const, order: 5, invoiceable: true, amount: 9000, dueDate: new Date('2026-04-10') },
    { name: 'Cabinet Installation', status: 'PENDING' as const, order: 6, invoiceable: true, amount: 7500, dueDate: new Date('2026-04-25') },
    { name: 'Final Finishes & Cleanup', status: 'PENDING' as const, order: 7, invoiceable: true, amount: 7000, dueDate: new Date('2026-05-10') },
  ]

  for (const m of milestoneData) {
    await prisma.milestone.upsert({
      where: { id: `milestone-${m.order}` },
      update: {},
      create: { id: `milestone-${m.order}`, projectId: project.id, ...m },
    })
  }

  // Create schedule items
  await prisma.scheduleItem.upsert({
    where: { id: 'schedule-1' },
    update: {},
    create: {
      id: 'schedule-1',
      projectId: project.id,
      subcontractorId: subcontractor.id,
      title: 'Electrical Panel Upgrade',
      description: 'Install new 200A panel and run new circuits for kitchen',
      startDate: new Date('2026-02-24T08:00:00'),
      endDate: new Date('2026-02-26T17:00:00'),
      status: 'SCHEDULED',
    },
  })

  await prisma.scheduleItem.upsert({
    where: { id: 'schedule-2' },
    update: {},
    create: {
      id: 'schedule-2',
      projectId: project.id,
      subcontractorId: sub2.id,
      title: 'Plumbing Fixture Inspection',
      description: 'City inspection of rough plumbing work',
      startDate: new Date('2026-02-27T10:00:00'),
      endDate: new Date('2026-02-27T12:00:00'),
      status: 'SCHEDULED',
    },
  })

  // Create permits
  await prisma.permit.upsert({
    where: { id: 'permit-1' },
    update: {},
    create: {
      id: 'permit-1',
      projectId: project.id,
      type: 'Building',
      permitNumber: 'BP-2026-04821',
      status: 'APPROVED',
      appliedDate: new Date('2026-01-20'),
      approvedDate: new Date('2026-01-28'),
      expiresDate: new Date('2026-08-01'),
      notes: 'Full interior renovation permit',
    },
  })

  await prisma.permit.upsert({
    where: { id: 'permit-2' },
    update: {},
    create: {
      id: 'permit-2',
      projectId: project.id,
      type: 'Electrical',
      status: 'APPLIED',
      appliedDate: new Date('2026-02-15'),
      notes: '200A panel upgrade permit',
    },
  })

  // Create a sample invoice
  await prisma.invoice.upsert({
    where: { id: 'invoice-1' },
    update: {},
    create: {
      id: 'invoice-1',
      projectId: project.id,
      billingModel: 'MILESTONE',
      status: 'PAID',
      lineItems: [
        { description: 'Demo & Prep — Milestone 1', qty: 1, rate: 5000, amount: 5000 },
      ],
      subtotal: 5000,
      total: 5000,
      issuedDate: new Date('2026-02-10'),
      dueDate: new Date('2026-02-25'),
      paidDate: new Date('2026-02-18'),
      paidAmount: 5000,
    },
  })

  // Create sample communications
  await prisma.communication.upsert({
    where: { id: 'comm-1' },
    update: {},
    create: {
      id: 'comm-1',
      projectId: project.id,
      contactId: customer.id,
      channel: 'EMAIL',
      direction: 'OUTBOUND',
      subject: 'Project Update: Rough Plumbing Complete',
      body: 'Hi John & Sarah,\n\nGreat news! The rough plumbing phase for your kitchen and bath renovation has been completed. The city inspection is scheduled for Feb 27th.\n\nNext up is the electrical rough-in, which starts Feb 24th.\n\nPlease let us know if you have any questions.\n\nBest regards,\nRehabOps Team',
      status: 'SENT',
      draftedBy: 'liaison-agent',
      sentAt: new Date('2026-02-22T10:00:00'),
    },
  })

  await prisma.communication.upsert({
    where: { id: 'comm-2' },
    update: {},
    create: {
      id: 'comm-2',
      projectId: project.id,
      contactId: subcontractor.id,
      channel: 'SMS',
      direction: 'OUTBOUND',
      subject: 'Schedule Reminder',
      body: 'Hi Mike, just a reminder that the Electrical Panel Upgrade is scheduled for Feb 24-26 at 742 Evergreen Terrace. Please confirm you\'re all set.',
      status: 'PENDING_APPROVAL',
      draftedBy: 'liaison-agent',
    },
  })

  // Create sample approval requests
  await prisma.approvalRequest.upsert({
    where: { id: 'approval-1' },
    update: {},
    create: {
      id: 'approval-1',
      agentType: 'LIAISON',
      actionType: 'SEND_COMMUNICATION',
      title: 'Send SMS Reminder to Electrician',
      description: 'Send schedule reminder SMS to Mike Rodriguez Electric for the Electrical Panel Upgrade (Feb 24-26)',
      communicationId: 'comm-2',
      projectId: project.id,
      proposedData: {
        channel: 'SMS',
        recipient: 'Mike Rodriguez Electric',
        phone: '+15559876543',
        message: 'Hi Mike, just a reminder that the Electrical Panel Upgrade is scheduled for Feb 24-26 at 742 Evergreen Terrace. Please confirm you\'re all set.',
      },
      status: 'PENDING',
      priority: 'NORMAL',
    },
  })

  await prisma.approvalRequest.upsert({
    where: { id: 'approval-2' },
    update: {},
    create: {
      id: 'approval-2',
      agentType: 'LEAD',
      actionType: 'INVOICE_SEND',
      title: 'Invoice Rough Plumbing Milestone',
      description: 'Create and send invoice for Rough Plumbing milestone ($8,000) to John & Sarah Mitchell',
      projectId: project.id,
      proposedData: {
        billingModel: 'MILESTONE',
        milestone: 'Rough Plumbing',
        amount: 8000,
        customer: 'John & Sarah Mitchell',
      },
      status: 'PENDING',
      priority: 'HIGH',
    },
  })

  await prisma.approvalRequest.upsert({
    where: { id: 'approval-3' },
    update: {},
    create: {
      id: 'approval-3',
      agentType: 'SCHEDULING',
      actionType: 'SCHEDULE_CHANGE',
      title: 'Reschedule Drywall Crew',
      description: 'Reschedule drywall crew from Mar 15 to Mar 20 due to electrical inspection delay',
      projectId: project.id,
      proposedData: {
        originalDate: '2026-03-15',
        newDate: '2026-03-20',
        reason: 'Electrical rough-in inspection delayed - need passing inspection before drywall can proceed',
      },
      status: 'PENDING',
      priority: 'NORMAL',
    },
  })

  // Create sample activity logs
  const activityData = [
    { actorType: 'agent', agentType: 'PROJECT_TRACKER' as const, action: 'Updated Mitchell Kitchen & Bath Renovation completion to 35%', entityType: 'Project', entityId: 'sample-project-1', projectId: project.id },
    { actorType: 'agent', agentType: 'PROJECT_TRACKER' as const, action: 'Flagged Rough Plumbing milestone as completed (1 day late)', entityType: 'Milestone', entityId: 'milestone-2', projectId: project.id },
    { actorType: 'agent', agentType: 'LIAISON' as const, action: 'Sent project update email to John & Sarah Mitchell', entityType: 'Communication', entityId: 'comm-1', projectId: project.id },
    { actorType: 'agent', agentType: 'LIAISON' as const, action: 'Created approval request: Send SMS reminder to Mike Rodriguez Electric', entityType: 'ApprovalRequest', entityId: 'approval-1', projectId: project.id },
    { actorType: 'agent', agentType: 'SCHEDULING' as const, action: 'Created approval request: Reschedule drywall crew due to inspection delay', entityType: 'ApprovalRequest', entityId: 'approval-3', projectId: project.id },
    { actorType: 'agent', agentType: 'LEAD' as const, action: 'Created approval request: Invoice Rough Plumbing milestone ($8,000)', entityType: 'ApprovalRequest', entityId: 'approval-2', projectId: project.id },
    { actorType: 'system', action: 'Agent cycle completed: 3 agents ran, 3 approval requests created', entityType: 'AgentRun' },
  ]

  for (const activity of activityData) {
    await prisma.activityLog.create({
      data: activity,
    })
  }

  console.log('Seed complete!')
  console.log('Login: admin@rehabops.com / admin123')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
