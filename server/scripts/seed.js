const mongoose = require('mongoose');
const User = require('../src/models/User');
const Group = require('../src/models/Group');
const Expense = require('../src/models/Expense');
const Settlement = require('../src/models/Settlement');
const config = require('../src/config/env');
const { calculateEqualSplit, calculatePercentageSplit, validateAndProcessExactSplit, formatRupees } = require('../src/utils/money');
const { generateGroupSettlementPlan } = require('../src/services/settlementService');

const DEMO_PASSWORD = 'Password123!';

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('[Seed] Connected to database.');

    const demoEmails = [
      'rahul@example.com',
      'priya@example.com',
      'aman@example.com',
      'sneha@example.com'
    ];

    // Find any existing demo users
    const existingUsers = await User.find({ email: { $in: demoEmails } });
    const existingUserIds = existingUsers.map((u) => u._id);

    // Clean up existing demo groups, expenses, and settlements created by or containing demo users
    if (existingUserIds.length > 0) {
      const existingGroups = await Group.find({
        $or: [{ creator: { $in: existingUserIds } }, { members: { $in: existingUserIds } }]
      });
      const groupIds = existingGroups.map((g) => g._id);

      await Expense.deleteMany({ group: { $in: groupIds } });
      await Settlement.deleteMany({ group: { $in: groupIds } });
      await Group.deleteMany({ _id: { $in: groupIds } });
      await User.deleteMany({ _id: { $in: existingUserIds } });
      console.log('[Seed] Cleaned up previous demo records.');
    }

    // 1. Create Demo Users
    console.log('[Seed] Creating demo users...');
    const rahul = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      password: DEMO_PASSWORD,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    });

    const priya = await User.create({
      name: 'Priya Patel',
      email: 'priya@example.com',
      password: DEMO_PASSWORD,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    });

    const aman = await User.create({
      name: 'Aman Gupta',
      email: 'aman@example.com',
      password: DEMO_PASSWORD,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    });

    const sneha = await User.create({
      name: 'Sneha Reddy',
      email: 'sneha@example.com',
      password: DEMO_PASSWORD,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
    });

    const allMembersTrip = [rahul._id, priya._id, aman._id, sneha._id];
    const apartmentMembers = [rahul._id, priya._id, aman._id];

    // 2. Create Group 1: Goa Weekend Getaway
    console.log('[Seed] Creating Group 1: Goa Weekend Getaway...');
    const goaGroup = await Group.create({
      name: 'Goa Weekend Getaway',
      description: 'Beach resort, coastal dinners, watersports, and airport transfers',
      category: 'Trip',
      creator: rahul._id,
      members: allMembersTrip
    });

    // Expenses for Goa:
    // Expense 1: Equal Split - Villa Booking ₹16,000.00 (1600000 paise) paid by Rahul
    const villaSplits = calculateEqualSplit(1600000, allMembersTrip);
    await Expense.create({
      group: goaGroup._id,
      description: 'Private Pool Villa Booking (3 Nights)',
      totalAmountPaise: 1600000,
      payer: rahul._id,
      participants: allMembersTrip,
      splitType: 'EQUAL',
      splits: villaSplits,
      category: 'Lodging',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      notes: 'Paid upfront for 3 nights in Candolim',
      creator: rahul._id
    });

    // Expense 2: Equal Split with remainder - Airport Cab & Tolls ₹2,475.50 (247550 paise) paid by Sneha
    const cabSplits = calculateEqualSplit(247550, allMembersTrip);
    await Expense.create({
      group: goaGroup._id,
      description: 'Airport Cab & Expressway Tolls',
      totalAmountPaise: 247550,
      payer: sneha._id,
      participants: allMembersTrip,
      splitType: 'EQUAL',
      splits: cabSplits,
      category: 'Transportation',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      notes: 'Innova ride from Dabolim to Candolim',
      creator: sneha._id
    });

    // Expense 3: Percentage Split - Scuba Diving & Watersports ₹12,000.00 (1200000 paise) paid by Aman
    const scubaPercentages = [
      { user: rahul._id, percentage: 30 },
      { user: priya._id, percentage: 30 },
      { user: aman._id, percentage: 25 },
      { user: sneha._id, percentage: 15 }
    ];
    const scubaSplits = calculatePercentageSplit(1200000, scubaPercentages);
    await Expense.create({
      group: goaGroup._id,
      description: 'Scuba Diving & Watersports Package',
      totalAmountPaise: 1200000,
      payer: aman._id,
      participants: allMembersTrip,
      splitType: 'PERCENTAGE',
      splits: scubaSplits,
      category: 'Entertainment',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: 'Custom gear and guided dive package',
      creator: aman._id
    });

    // Expense 4: Exact Split - Souvenirs & Beach Shack Snacks ₹1,850.00 (185000 paise) paid by Rahul
    const shackRawSplits = [
      { user: rahul._id, amountPaise: 35000 },
      { user: priya._id, amountPaise: 50000 },
      { user: aman._id, amountPaise: 40000 },
      { user: sneha._id, amountPaise: 60000 }
    ];
    const shackSplits = validateAndProcessExactSplit(185000, shackRawSplits);
    await Expense.create({
      group: goaGroup._id,
      description: 'Souvenirs & Beach Shack Snacks',
      totalAmountPaise: 185000,
      payer: rahul._id,
      participants: allMembersTrip,
      splitType: 'EXACT',
      splits: shackSplits,
      category: 'Food',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: 'Exact order items breakdown per person',
      creator: rahul._id
    });

    // Recorded Settlement for Goa: Sneha paid Rahul ₹1,000.00 (100000 paise)
    await Settlement.create({
      group: goaGroup._id,
      fromUser: sneha._id,
      toUser: rahul._id,
      amountPaise: 100000,
      notes: 'UPI payment towards villa deposit share',
      date: new Date(Date.now() - 12 * 60 * 60 * 1000),
      creator: sneha._id
    });

    // 3. Create Group 2: Apartment 402 Flatmates
    console.log('[Seed] Creating Group 2: Apartment 402 Flatmates...');
    const aptGroup = await Group.create({
      name: 'Apartment 402 Flatmates',
      description: 'Monthly rent, groceries, high-speed fiber internet and housekeeping',
      category: 'Home',
      creator: priya._id,
      members: apartmentMembers
    });

    // Expense 1: High-Speed Fiber Internet ₹1,199.00 (119900 paise) paid by Rahul (Equal split with 1 leftover paise)
    const internetSplits = calculateEqualSplit(119900, apartmentMembers);
    await Expense.create({
      group: aptGroup._id,
      description: 'Airtel Fiber 300 Mbps Internet',
      totalAmountPaise: 119900,
      payer: rahul._id,
      participants: apartmentMembers,
      splitType: 'EQUAL',
      splits: internetSplits,
      category: 'Utilities',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notes: 'Monthly broadband invoice',
      creator: rahul._id
    });

    // Expense 2: Monthly Groceries ₹7,850.00 (785000 paise) paid by Priya
    const grocerySplits = calculateEqualSplit(785000, apartmentMembers);
    await Expense.create({
      group: aptGroup._id,
      description: 'Nature Basket Supermarket & Pantry Refill',
      totalAmountPaise: 785000,
      payer: priya._id,
      participants: apartmentMembers,
      splitType: 'EQUAL',
      splits: grocerySplits,
      category: 'Food',
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      notes: 'Weekly vegetables, dairy, pulses, and kitchen essentials',
      creator: priya._id
    });

    // Expense 3: Living Room Air Purifier ₹9,990.00 (999000 paise) paid by Aman
    const purifierRaw = [
      { user: rahul._id, amountPaise: 333000 },
      { user: priya._id, amountPaise: 333000 },
      { user: aman._id, amountPaise: 333000 }
    ];
    const purifierSplits = validateAndProcessExactSplit(999000, purifierRaw);
    await Expense.create({
      group: aptGroup._id,
      description: 'HEPA Air Purifier for Living Room',
      totalAmountPaise: 999000,
      payer: aman._id,
      participants: apartmentMembers,
      splitType: 'EXACT',
      splits: purifierSplits,
      category: 'Utilities',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: 'Shared home appliance',
      creator: aman._id
    });

    // Display settlement preview
    console.log('\n======================================================');
    console.log('✅ Demo Seed Data Successfully Created!');
    console.log('======================================================');
    console.log('Demo Accounts (All passwords: "Password123!"):');
    console.log('1. Rahul Sharma:  rahul@example.com');
    console.log('2. Priya Patel:   priya@example.com');
    console.log('3. Aman Gupta:    aman@example.com');
    console.log('4. Sneha Reddy:   sneha@example.com');
    console.log('------------------------------------------------------');

    const goaPlan = await generateGroupSettlementPlan(goaGroup._id);
    console.log(`\nSettlement Plan for "${goaGroup.name}":`);
    console.log(`Total Expenses: ${formatRupees(goaPlan.totalGroupExpensePaise)}`);
    for (const t of goaPlan.settlementPlan) {
      console.log(`  👉 ${t.from.name} pays ${t.to.name} ${formatRupees(t.amountPaise)}`);
    }

    const aptPlan = await generateGroupSettlementPlan(aptGroup._id);
    console.log(`\nSettlement Plan for "${aptGroup.name}":`);
    console.log(`Total Expenses: ${formatRupees(aptPlan.totalGroupExpensePaise)}`);
    for (const t of aptPlan.settlementPlan) {
      console.log(`  👉 ${t.from.name} pays ${t.to.name} ${formatRupees(t.amountPaise)}`);
    }
    console.log('======================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedData();
