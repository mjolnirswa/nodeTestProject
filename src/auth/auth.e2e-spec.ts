(global as any).crypto = require('crypto');

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { DataSource } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    // Очищаем таблицу user перед каждым тестом
    await dataSource.query('DELETE FROM "user";');
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) - success', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        login: 'e2etestuser',
        email: 'e2etestuser@example.com',
        password: 'password123',
        age: 25,
        description: 'Test user description',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('login', 'e2etestuser');
    expect(response.body).toHaveProperty('email', 'e2etestuser@example.com');
  });

  it('/auth/register (POST) - fail (duplicate)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        login: 'duplicateuser',
        email: 'duplicate1@example.com',
        password: 'password123',
        age: 25,
        description: 'First user',
      })
      .expect(201);

    // Пытаемся зарегистрировать ещё раз с тем же логином
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        login: 'duplicateuser',
        email: 'duplicate2@example.com',
        password: 'password123',
        age: 25,
        description: 'Second user',
      })
      .expect(409);

    expect(response.body.message).toBe('Пользователь с таким логином уже существует');
  });
});