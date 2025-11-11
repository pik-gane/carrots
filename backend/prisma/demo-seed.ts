import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with demo conversation example...');

  // Create users based on the conversation
  const passwordHash = await bcrypt.hash('demo123', 10);

  const anna = await prisma.user.create({
    data: {
      username: 'Anna',
      email: 'anna@demo.com',
      passwordHash,
    },
  });

  const bella = await prisma.user.create({
    data: {
      username: 'Bella',
      email: 'bella@demo.com',
      passwordHash,
    },
  });

  const celia = await prisma.user.create({
    data: {
      username: 'Celia',
      email: 'celia@demo.com',
      passwordHash,
    },
  });

  const cat = await prisma.user.create({
    data: {
      username: 'The Cat',
      email: 'cat@demo.com',
      passwordHash,
    },
  });

  console.log('Created users:', { 
    anna: anna.id, 
    bella: bella.id, 
    celia: celia.id, 
    cat: cat.id 
  });

  // Create the household group
  const group = await prisma.group.create({
    data: {
      name: 'Household Commitments',
      description: 'Anna, Bella, Celia, and The Cat\'s living arrangement',
      creatorId: anna.id,
    },
  });

  console.log('Created group:', group.id);

  // Add members to group
  await prisma.groupMembership.createMany({
    data: [
      { groupId: group.id, userId: anna.id, role: 'creator' },
      { groupId: group.id, userId: bella.id, role: 'member' },
      { groupId: group.id, userId: celia.id, role: 'member' },
      { groupId: group.id, userId: cat.id, role: 'member' },
    ],
  });

  console.log('Added members to group');

  // Create commitments based on the conversation
  
  // 1. Anna: If Bella does the daily dishes, I'll take out the weekly trash
  const commitment1 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: anna.id,
      status: 'active',
      conditionType: 'single_user',
      naturalLanguageText: 'If Bella does the daily dishes, I\'ll take out the weekly trash',
      parsedCommitment: {
        condition: {
          type: 'single_user',
          targetUserId: bella.id,
          targetUsername: 'Bella',
          action: 'dishes',
          minAmount: 1,
          unit: 'times per day',
        },
        promise: {
          action: 'trash',
          minAmount: 1,
          unit: 'times per week',
        },
      },
    },
  });

  // 2. Bella: I'll do the dishes twice a day if Celia pays 30% of the rent
  const commitment2 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: bella.id,
      status: 'active',
      conditionType: 'single_user',
      naturalLanguageText: 'I\'ll do the dishes twice a day if Celia pays 30% of the rent',
      parsedCommitment: {
        condition: {
          type: 'single_user',
          targetUserId: celia.id,
          targetUsername: 'Celia',
          action: 'rent payment',
          minAmount: 30,
          unit: 'percent',
        },
        promise: {
          action: 'dishes',
          minAmount: 2,
          unit: 'times per day',
        },
      },
    },
  });

  // 3. Celia: I'll pay 30% of rent if the trash is taken out at least every two weeks
  const commitment3 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: celia.id,
      status: 'active',
      conditionType: 'aggregate',
      naturalLanguageText: 'I\'ll pay 30% of rent if the trash is taken out at least every two weeks',
      parsedCommitment: {
        condition: {
          type: 'aggregate',
          action: 'trash',
          minAmount: 1,
          unit: 'times per 2 weeks',
        },
        promise: {
          action: 'rent payment',
          minAmount: 30,
          unit: 'percent',
        },
      },
    },
  });

  // 4. The Cat: I'll pay those missing 10% (unconditionally)
  const commitment4 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: cat.id,
      status: 'active',
      conditionType: 'unconditional',
      naturalLanguageText: 'I\'ll pay those missing 10%',
      parsedCommitment: {
        condition: {
          type: 'unconditional',
        },
        promise: {
          action: 'rent payment',
          minAmount: 10,
          unit: 'percent',
        },
      },
    },
  });

  // 5. The Cat: I'll reduce meowing by 1 dB for every 2 dB that Anna turns down AC/DC
  const commitment5 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: cat.id,
      status: 'active',
      conditionType: 'single_user',
      naturalLanguageText: 'I\'ll reduce meowing by 1 dB for every 2 dB that Anna turns down AC/DC',
      parsedCommitment: {
        condition: {
          type: 'single_user',
          targetUserId: anna.id,
          targetUsername: 'Anna',
          action: 'AC/DC volume reduction',
          minAmount: 2,
          unit: 'dB',
        },
        promise: {
          action: 'meowing reduction',
          minAmount: 1,
          unit: 'dB',
        },
      },
    },
  });

  // 6. Anna: I'll turn down AC/DC by at most 7 dB (if Cat reduces meowing by at least 3.5 dB)
  const commitment6 = await prisma.commitment.create({
    data: {
      groupId: group.id,
      creatorId: anna.id,
      status: 'active',
      conditionType: 'single_user',
      naturalLanguageText: 'I\'ll turn down AC/DC by 7 dB if The Cat reduces meowing',
      parsedCommitment: {
        condition: {
          type: 'single_user',
          targetUserId: cat.id,
          targetUsername: 'The Cat',
          action: 'meowing reduction',
          minAmount: 3.5,
          unit: 'dB',
        },
        promise: {
          action: 'AC/DC volume reduction',
          minAmount: 7,
          unit: 'dB',
        },
      },
    },
  });

  console.log('Created commitments:', {
    anna_trash: commitment1.id,
    bella_dishes: commitment2.id,
    celia_rent: commitment3.id,
    cat_rent: commitment4.id,
    cat_meowing: commitment5.id,
    anna_acdc: commitment6.id,
  });

  console.log('\n✅ Demo seed completed!');
  console.log('\n📋 Commitment Summary:');
  console.log('1. Anna → If Bella does dishes daily, I\'ll take out trash weekly');
  console.log('2. Bella → If Celia pays 30% rent, I\'ll do dishes twice daily');
  console.log('3. Celia → If trash is taken out biweekly, I\'ll pay 30% rent');
  console.log('4. The Cat → I\'ll unconditionally pay 10% rent');
  console.log('5. The Cat → For every 2 dB Anna turns down AC/DC, I\'ll reduce meowing by 1 dB');
  console.log('6. Anna → If Cat reduces meowing by 3.5 dB, I\'ll turn down AC/DC by 7 dB');
  console.log('\n🔐 You can log in with:');
  console.log('- Email: anna@demo.com, Password: demo123');
  console.log('- Email: bella@demo.com, Password: demo123');
  console.log('- Email: celia@demo.com, Password: demo123');
  console.log('- Email: cat@demo.com, Password: demo123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
