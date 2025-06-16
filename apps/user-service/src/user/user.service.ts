import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IsolationLevel, Transactional } from 'typeorm-transactional';
import { plainToInstance } from 'class-transformer';
import { PinoLogger } from 'nestjs-pino';

import { User } from './entity/user.entity';
import { RefreshToken } from '../auth/entity/refresh-token.entity';
import { UsersRepository } from './user.repository';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-responce.dto';

import { hashPassword } from '@app/common';
import { MetricsService } from '../metrics/metrics.service';
import { NatsEventBusService } from '../nats/nats-event-bus.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class UserService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly metrics: MetricsService,
    private readonly bus: NatsEventBusService,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,

    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UserService.name);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const end = this.metrics.startUserCreateTimer();

    try {
      const hashed = await hashPassword(dto.password);
      const user = this.dataSource.getRepository(User).create({ ...dto, password: hashed });

      const [saved] = await this.usersRepo.saveMany([user]);

      this.metrics.incUserCreated();
      this.logger.info({ id: saved.id, login: saved.login }, 'user created');
      return saved;
    } finally {
      end();
    }
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepo.findByIdWithAvatars(id);
  }
  async findByEmail(email: string) {
    return this.usersRepo.findByEmail(email);
  }
  async findByLogin(login: string) {
    return this.usersRepo.findByLogin(login);
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepo.findByIdWithAvatars(id);
    if (!user) {
      this.logger.warn({ id }, 'user not found');
      throw new NotFoundException('User not found');
    }

    if (dto.password) dto.password = await hashPassword(dto.password);

    Object.assign(user, dto);
    const [saved] = await this.usersRepo.saveMany([user]);

    this.logger.info({ id }, 'user updated');
    return plainToInstance(UserResponseDto, saved, {
      excludeExtraneousValues: true,
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.usersRepo.softDelete(id);
    this.logger.info({ id }, 'user deleted');
  }

  async getAllUsers(page: number, limit: number, search?: string): Promise<UserResponseDto[]> {
    const key = `users:p=${page}&l=${limit}&q=${search ?? ''}`;
    const cached = await this.cache.get<UserResponseDto[]>(key);
    if (cached) {
      this.logger.debug({ key }, 'cache hit');
      return cached;
    }

    this.logger.debug({ key }, 'cache miss');
    const users = await this.usersRepo.paginate(page, limit, search);
    const dto = plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });

    await this.cache.set(key, dto, 30_000);
    this.logger.debug(`📄 Users found: ${users.length}`);
    return dto;
  }

  @Transactional({ isolationLevel: IsolationLevel.READ_COMMITTED })
  async transferBalance(fromId: number, toId: number, amount: number): Promise<void> {
    const value = Number(amount);
    if (value <= 0 || Number.isNaN(value)) {
      throw new BadRequestException('Сумма должна быть положительным числом');
    }

    const stop = this.metrics.startTransferTimer();
    let result: 'success' | 'error' = 'success';

    try {
      this.logger.debug({ fromId, toId, amount: value }, 'starting transfer');

      await this.dataSource.transaction(async (manager) => {
        const [a, b] = fromId < toId ? [fromId, toId] : [toId, fromId];

        const users = await this.usersRepo.lockUsersForTransfer([a, b], manager);
        if (users.length !== 2) throw new NotFoundException('Один или оба пользователя не найдены');

        const fromUser = users.find((u) => u.id === fromId)!;
        if (Number(fromUser.balance) < value) {
          throw new BadRequestException('Недостаточно средств');
        }

        await this.usersRepo.updateBalances(fromId, toId, value, manager);
      });

      this.metrics.incTransfer('success');
      this.logger.info({ fromId, toId, amount: value }, 'balance transfer successful');

      await Promise.all([
        this.bus.emitBalanceUpdated(fromId, -value),
        this.bus.emitBalanceUpdated(toId, value),
      ]);
    } catch (e) {
      result = 'error';
      this.metrics.incTransfer('error');
      this.logger.error({ err: e, fromId, toId }, 'balance transfer failed');
      throw e;
    } finally {
      stop({ result });
    }
  }

  async addBalance(userId: number, amount: number): Promise<void> {
    const user = await this.usersRepo.findByIdWithAvatars(userId);
    if (!user) throw new NotFoundException('Пользователь не найден');

    const deposit = Number(amount);
    if (deposit <= 0 || Number.isNaN(deposit)) {
      throw new BadRequestException('Сумма должна быть положительным числом');
    }

    user.balance = Number((Number(user.balance) + deposit).toFixed(2));
    await this.usersRepo.saveMany([user]);

    this.logger.info({ userId, amount: deposit }, 'balance topped up');
  }

  getAllWithBalance() {
    this.logger.debug('fetch users with non-zero balance');
    return this.usersRepo.findWithNonZeroBalance();
  }

  saveMany(users: User[]) {
    return this.usersRepo.saveMany(users);
  }
}
