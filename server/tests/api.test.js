const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const config = require('../src/config/env');
const User = require('../src/models/User');
const Group = require('../src/models/Group');
const Expense = require('../src/models/Expense');
const Settlement = require('../src/models/Settlement');

describe('Full-Stack API Integration Tests', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let user3Id;
  let testGroupId;
  let testExpenseId;

  const testEmail1 = `test_user1_${Date.now()}@example.com`;
  const testEmail2 = `test_user2_${Date.now()}@example.com`;
  const testEmail3 = `test_user3_${Date.now()}@example.com`;

  beforeAll(async () => {
    await mongoose.connect(config.mongoUri);
  });

  afterAll(async () => {
    // Cleanup created test documents
    if (user1Id || user2Id || user3Id) {
      const ids = [user1Id, user2Id, user3Id].filter(Boolean);
      await Expense.deleteMany({ creator: { $in: ids } });
      await Settlement.deleteMany({ creator: { $in: ids } });
      await Group.deleteMany({ creator: { $in: ids } });
      await User.deleteMany({ _id: { $in: ids } });
    }
    await mongoose.connection.close();
  });

  describe('1. Authentication & Protected Route Access', () => {
    test('POST /api/auth/register registers a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User One',
          email: testEmail1,
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail1.toLowerCase());
      expect(res.body.data.token).toBeDefined();

      user1Token = res.body.data.token;
      user1Id = res.body.data.user._id;
    });

    test('POST /api/auth/register rejects duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: testEmail1,
          password: 'Password123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    test('Protected route GET /api/auth/me rejects requests without valid token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Protected route GET /api/auth/me succeeds with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user._id.toString()).toBe(user1Id.toString());
    });

    test('Register auxiliary users for group tests', async () => {
      const res2 = await request(app).post('/api/auth/register').send({
        name: 'Test User Two',
        email: testEmail2,
        password: 'Password123!'
      });
      user2Token = res2.body.data.token;
      user2Id = res2.body.data.user._id;

      const res3 = await request(app).post('/api/auth/register').send({
        name: 'Test User Three',
        email: testEmail3,
        password: 'Password123!'
      });
      user3Id = res3.body.data.user._id;
    });
  });

  describe('2. Group Management & Authorization Checks', () => {
    test('POST /api/groups creates a group and automatically makes creator a member', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Manali Snow Expedition',
          description: 'Winter trip expenses',
          category: 'Trip'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.group.name).toBe('Manali Snow Expedition');

      testGroupId = res.body.data.group._id;
      const memberIds = res.body.data.group.members.map((m) => m._id.toString());
      expect(memberIds).toContain(user1Id.toString());
    });

    test('POST /api/groups/:id/members adds member by registered email', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ email: testEmail2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const memberIds = res.body.data.group.members.map((m) => m._id.toString());
      expect(memberIds).toContain(user2Id.toString());
    });

    test('POST /api/groups/:id/members gracefully handles nonexistent email', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ email: 'nonexistent_user_random_4938@nowhere.com' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/No registered user found/i);
    });

    test('Unauthorized access: User 3 cannot access User 1 & 2 private group details', async () => {
      // User 3 logs in
      const loginRes = await request(app).post('/api/auth/login').send({
        email: testEmail3,
        password: 'Password123!'
      });
      const user3Token = loginRes.body.data.token;

      const res = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });
  });

  describe('3. Expense Management & Balance Recalculations', () => {
    test('POST /api/expenses adds an equal split expense and recalculates balances', async () => {
      // User 1 pays ₹100.00 (10000 paise) split equally between User 1 and User 2
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          groupId: testGroupId,
          description: 'Cabin Heater Rental',
          amount: 100.0,
          payerId: user1Id,
          splitType: 'EQUAL',
          participants: [user1Id, user2Id],
          category: 'Utilities'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expense.totalAmountPaise).toBe(10000);

      testExpenseId = res.body.data.expense._id;

      // Balances check:
      // Total amount: 10000 paise (₹100)
      // User 1 paid 10000, share 5000 -> net balance = +5000 paise (owed ₹50)
      // User 2 paid 0, share 5000 -> net balance = -5000 paise (owes ₹50)
      const balances = res.body.data.updatedBalances.memberBalances;
      const u1Bal = balances.find((b) => b.user._id.toString() === user1Id.toString());
      const u2Bal = balances.find((b) => b.user._id.toString() === user2Id.toString());

      expect(u1Bal.netBalancePaise).toBe(5000);
      expect(u2Bal.netBalancePaise).toBe(-5000);
    });

    test('PUT /api/expenses/:id updates expense amount and recalculates balances', async () => {
      // Change expense from ₹100.00 to ₹200.00 (20000 paise)
      const res = await request(app)
        .put(`/api/expenses/${testExpenseId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          amount: 200.0,
          description: 'Deluxe Cabin Heater Rental'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expense.totalAmountPaise).toBe(20000);

      const balances = res.body.data.updatedBalances.memberBalances;
      const u1Bal = balances.find((b) => b.user._id.toString() === user1Id.toString());
      const u2Bal = balances.find((b) => b.user._id.toString() === user2Id.toString());

      expect(u1Bal.netBalancePaise).toBe(10000);
      expect(u2Bal.netBalancePaise).toBe(-10000);
    });

    test('GET /api/settlements/plan/:groupId generates settlement plan clearing balances', async () => {
      const res = await request(app)
        .get(`/api/settlements/plan/${testGroupId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { settlementPlan } = res.body.data;
      expect(settlementPlan).toHaveLength(1);
      expect(settlementPlan[0].from._id.toString()).toBe(user2Id.toString());
      expect(settlementPlan[0].to._id.toString()).toBe(user1Id.toString());
      expect(settlementPlan[0].amountPaise).toBe(10000);
    });

    test('POST /api/settlements records a payment and updates balances to zero', async () => {
      // User 2 pays User 1 ₹100.00 (10000 paise) to settle up
      const res = await request(app)
        .post('/api/settlements')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          groupId: testGroupId,
          fromUserId: user2Id,
          toUserId: user1Id,
          amount: 100.0,
          notes: 'Settled up via UPI'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const balances = res.body.data.updatedBalances.memberBalances;
      const u1Bal = balances.find((b) => b.user._id.toString() === user1Id.toString());
      const u2Bal = balances.find((b) => b.user._id.toString() === user2Id.toString());

      expect(u1Bal.netBalancePaise).toBe(0);
      expect(u2Bal.netBalancePaise).toBe(0);
    });

    test('DELETE /api/expenses/:id deletes expense and balances reflect change', async () => {
      const res = await request(app)
        .delete(`/api/expenses/${testExpenseId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Now only the settlement exists (User 2 paid User 1 10000 paise)
      // So User 1 now owes User 2 10000 paise
      const balances = res.body.data.updatedBalances.memberBalances;
      const u1Bal = balances.find((b) => b.user._id.toString() === user1Id.toString());
      const u2Bal = balances.find((b) => b.user._id.toString() === user2Id.toString());

      expect(u1Bal.netBalancePaise).toBe(-10000);
      expect(u2Bal.netBalancePaise).toBe(10000);
    });
  });
});
