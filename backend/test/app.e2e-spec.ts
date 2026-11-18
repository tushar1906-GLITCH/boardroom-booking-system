import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('App & Domain Lifecycle (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let employeeToken: string;
  let employeeId: string;
  let otherEmployeeToken: string;
  let otherEmployeeId: string;
  let createdRoomId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Verify connected database ends with _test_db
    const dbCheck = await dataSource.query('SELECT current_database() AS db_name');
    const dbName = dbCheck[0]?.db_name;
    if (!dbName || !dbName.endsWith('_test_db')) {
      throw new Error(`CRITICAL: E2E test connected to non-test database "${dbName}".`);
    }

    // Register an employee
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Test Employee',
        email: 'app_emp@company.com',
        password: 'Password@123',
        department: 'Engineering',
      });
    employeeToken = regRes.body.accessToken;
    employeeId = regRes.body.user.id;

    // Register second employee
    const reg2Res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Second Employee',
        email: 'app_emp2@company.com',
        password: 'Password@123',
        department: 'Design',
      });
    otherEmployeeToken = reg2Res.body.accessToken;
    otherEmployeeId = reg2Res.body.user.id;

    // Register admin user and upgrade role in DB
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Test Admin',
        email: 'app_admin@company.com',
        password: 'Admin@12345',
        department: 'IT',
      });
    await dataSource.query(`UPDATE users SET role = 'ADMIN' WHERE email = 'app_admin@company.com'`);

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'app_admin@company.com', password: 'Admin@12345' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Session Management', () => {
    it('GET /auth/me returns profile for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('app_emp@company.com');
      expect(res.body.role).toBe('EMPLOYEE');
    });

    it('PATCH /auth/me updates user department', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ department: 'Core Infrastructure' });

      expect(res.status).toBe(200);
      expect(res.body.department).toBe('Core Infrastructure');
    });

    it('POST /auth/login rotates token and returns cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'app_emp@company.com', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      const cookies = res.header['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken');
    });

    it('Rejects login for deactivated accounts', async () => {
      // Deactivate second employee
      await dataSource.query(`UPDATE users SET is_active = false WHERE id = '${otherEmployeeId}'`);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'app_emp2@company.com', password: 'Password@123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('deactivated');

      // Reactivate for subsequent tests
      await dataSource.query(`UPDATE users SET is_active = true WHERE id = '${otherEmployeeId}'`);
    });
  });

  describe('Rooms Management & Role Permissions', () => {
    it('Employee cannot create a room (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Unauthorized Room',
          floorOrLocation: '1st Floor',
          capacity: 5,
        });

      expect(res.status).toBe(403);
    });

    it('Admin can create a new room (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'App E2E Boardroom',
          floorOrLocation: '5th Floor Suite',
          capacity: 20,
          amenities: ['Projector', 'Video Conferencing'],
          accentColor: '#7C6CFF',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.capacity).toBe(20);
      createdRoomId = res.body.id;
    });

    it('GET /rooms lists rooms with live isAvailableNow metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rooms')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('isAvailableNow');
    });

    it('GET /rooms/:id/availability returns free and busy slots', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/rooms/${createdRoomId}/availability?date=2026-11-20`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.businessHours).toBeDefined();
      expect(Array.isArray(res.body.freeSlots)).toBe(true);
    });
  });

  describe('Ownership Enforcement', () => {
    let emp1BookingId: string;

    beforeAll(async () => {
      // Create a direct booking for employee 1
      const bRes = await dataSource.query(`
        INSERT INTO bookings (room_id, user_id, title, attendee_count, start_time, end_time, status)
        VALUES ('${createdRoomId}', '${employeeId}', 'Private Strategy', 4, '2026-11-25 10:00:00+00', '2026-11-25 11:00:00+00', 'CONFIRMED')
        RETURNING id;
      `);
      emp1BookingId = bRes[0].id;
    });

    it('Employee 2 cannot view Employee 1 private booking details (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${emp1BookingId}`)
        .set('Authorization', `Bearer ${otherEmployeeToken}`);

      expect(res.status).toBe(403);
    });

    it('Employee 2 cannot cancel Employee 1 booking (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${emp1BookingId}/cancel`)
        .set('Authorization', `Bearer ${otherEmployeeToken}`)
        .send({ reason: 'Malicious cancellation attempt' });

      expect(res.status).toBe(403);
    });

    it('Admin can cancel Employee 1 booking and notify owner', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${emp1BookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Admin scheduled executive maintenance' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');

      // Check notification sent to employee 1
      const notifRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(notifRes.status).toBe(200);
      const adminCancelNotif = notifRes.body.data.find(
        (n: any) => n.type === 'BOOKING_CANCELLED_BY_ADMIN',
      );
      expect(adminCancelNotif).toBeDefined();
    });
  });

  describe('Admin Analytics & Health', () => {
    it('GET /stats/overview returns high level KPIs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRooms');
      expect(res.body).toHaveProperty('averageRoomUtilization');
    });

    it('GET /stats/me returns employee summary metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stats/me')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bookingsThisWeek');
      expect(res.body).toHaveProperty('hoursBookedThisMonth');
    });

    it('GET /health returns 200 and database connected', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
    });
  });
});
