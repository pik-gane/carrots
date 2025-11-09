import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: {
      username: 'alice',
      email: 'alice@example.com',
      passwordHash,
    },
  });

  const bob = await prisma.user.create({
    data: {
      username: 'bob',
      email: 'bob@example.com',
      passwordHash,
    },
  });

  const charlie = await prisma.user.create({
    data: {
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash,
    },
  });

  console.log('Created users:', { alice: alice.id, bob: bob.id, charlie: charlie.id });

  // Create a group
  const group = await prisma.group.create({
    data: {
      name: 'Community Garden Project',
      description: 'Collaborative gardening and maintenance commitments',
      creatorId: alice.id,
    },
  });

  console.log('Created group:', group.id);

  // Add members to group
  await prisma.groupMembership.createMany({
    data: [
      { groupId: group.id, userId: alice.id, role: 'creator' },
      { groupId: group.id, userId: bob.id, role: 'member' },
      { groupId: group.id, userId: charlie.id, role: 'member' },
    ],
  });

  console.log('Added members to group');

  // Create sample commitments
  // Alice: "If Bob does at least 5 hours of weeding, I will do at least 3 hours of watering"
  const commitment1 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: alice.id,
      status: 'active',
      conditionType: 'single_user',
      naturalLanguageText: 'If Bob does at least 5 hours of weeding, I will do at least 3 hours of watering',
      parsedCommitment: {
        condition: {
          type: 'single_user',
          targetUserId: bob.id,
          action: 'weeding',
          minAmount: 5,
          unit: 'hours',
        },
        promise: {
          action: 'watering',
          minAmount: 3,
          unit: 'hours',
        },
      },
    },
  });

  // Bob: "If others do at least 2 hours of watering, I will do at least 5 hours of weeding"
  const commitment2 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: bob.id,
      status: 'active',
      conditionType: 'aggregate',
      naturalLanguageText: 'If others do at least 2 hours of watering, I will do at least 5 hours of weeding',
      parsedCommitment: {
        condition: {
          type: 'aggregate',
          action: 'watering',
          minAmount: 2,
          unit: 'hours',
        },
        promise: {
          action: 'weeding',
          minAmount: 5,
          unit: 'hours',
        },
      },
    },
  });

  // Charlie: "If Alice does at least 2 hours of watering, I will do at least 4 hours of planting"
  const commitment3 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: charlie.id,
      status: 'active',
      conditionType: 'single_user',
      naturalLanguageText: 'If Alice does at least 2 hours of watering, I will do at least 4 hours of planting',
      parsedCommitment: {
        condition: {
          type: 'single_user',
          targetUserId: alice.id,
          action: 'watering',
          minAmount: 2,
          unit: 'hours',
        },
        promise: {
          action: 'planting',
          minAmount: 4,
          unit: 'hours',
        },
      },
    },
  });

  console.log('Created commitments:', {
    commitment1: commitment1.id,
    commitment2: commitment2.id,
    commitment3: commitment3.id,
  });

  console.log('Seed completed!');
  console.log('\nYou can log in with:');
  console.log('- Email: alice@example.com, Password: password123');
  console.log('- Email: bob@example.com, Password: password123');
  console.log('- Email: charlie@example.com, Password: password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
