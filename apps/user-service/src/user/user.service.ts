import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DataSource } from 'typeorm';
import { User } from './entity/user.entity';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-responce.dto';
import { plainToInstance } from 'class-transformer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IsolationLevel, Transactional } from 'typeorm-transactional';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RefreshToken } from '../auth/entity/refresh-token.entity';
import { hashPassword } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  async onModuleInit() {
    await this.natsClient.connect();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await hashPassword(createUserDto.password);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.info(`👤 Создан пользователь: ${savedUser.login} (ID: ${savedUser.id})`);

    return savedUser;
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['avatars'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async findByLogin(login: string): Promise<User | null> {
    return this.userRepository.findOneBy({ login });
  }

  async updateRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.delete({ user: { id: userId } });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней

    await this.refreshTokenRepository.save({
      token: refreshToken,
      user: { id: userId },
      expiresAt,
    });

    this.logger.verbose(`🔑 Refresh token обновлён для userId=${userId}`);
  }

  async getAllUsers(page: number, limit: number, search?: string): Promise<UserResponseDto[]> {
    const cacheKey = `users:page=${page}&limit=${limit}&search=${search ?? ''}`;
    const cached = await this.cacheManager.get<UserResponseDto[]>(cacheKey);

    if (cached) {
      this.logger.verbose(`📦 Cache hit: ${cacheKey}`);
      return cached;
    }

    this.logger.verbose(`🔍 Cache miss: ${cacheKey}`);
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.avatars', 'avatars')
      .skip(skip)
      .take(limit);

    if (search) {
      queryBuilder.where('user.login ILIKE :search', { search: `%${search}%` });
    }

    const users = await queryBuilder.getMany();
    const dto = plainToInstance(UserResponseDto, users, { excludeExtraneousValues: true });

    await this.cacheManager.set(cacheKey, dto, 30 * 1000);
    this.logger.debug(`📄 Пользователей найдено: ${users.length}`);

    return dto;
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      this.logger.warn(`⚠️ Пользователь с ID ${id} не найден`);
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await hashPassword(updateUserDto.password);
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);
    this.logger.info(`📝 Пользователь с ID ${id} обновлён`);

    return plainToInstance(UserResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async deleteUser(id: number): Promise<void> {
    await this.userRepository.softDelete(id);
    this.logger.info(`🗑️ Пользователь с ID ${id} удалён`);
  }
  @Transactional({ isolationLevel: IsolationLevel.READ_COMMITTED })
  async transferBalance(fromId: number, toId: number, amount: number): Promise<void> {
    this.logger.verbose(`💸 Перевод $${amount} от user ${fromId} к user ${toId}`);

    const transferAmount = Number(amount);
    if (transferAmount <= 0 || isNaN(transferAmount)) {
      throw new BadRequestException('Сумма должна быть положительным числом');
    }

    await this.dataSource.transaction(async (manager) => {
      const [smallerId, largerId] = fromId < toId ? [fromId, toId] : [toId, fromId];

      const users = await manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.id IN (:...ids)', { ids: [smallerId, largerId] })
        .orderBy('user.id', 'ASC')
        .getMany();

      if (users.length !== 2) {
        throw new NotFoundException('Один или оба пользователя не найдены');
      }

      const fromUser = users.find((u) => u.id === fromId);
      const toUser = users.find((u) => u.id === toId);

      if (!fromUser || !toUser) {
        throw new NotFoundException('Один или оба пользователя не найдены');
      }

      if (Number(fromUser.balance) < transferAmount) {
        throw new BadRequestException('Недостаточно средств');
      }

      await manager
        .createQueryBuilder()
        .update(User)
        .set({
          balance: () => `
            CASE 
              WHEN id = :fromId THEN balance - :amount
              WHEN id = :toId THEN balance + :amount
              ELSE balance
            END`,
        })
        .where('id IN (:...ids)', { ids: [fromId, toId] })
        .setParameters({ fromId, toId, amount: transferAmount })
        .execute();
    });

    this.logger.info(`✅ Успешный перевод $${transferAmount} от ${fromId} к ${toId}`);

    await Promise.all([
      this.natsClient.emit('balance_updated', {
        userId: fromId.toString(),
        amount: -transferAmount,
      }),
      this.natsClient.emit('balance_updated', {
        userId: toId.toString(),
        amount: transferAmount,
      }),
    ]);
  }

  async addBalance(userId: number, amount: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const currentBalance = Number(user.balance);
    const deposit = Number(amount);

    if (deposit <= 0 || isNaN(deposit)) {
      throw new BadRequestException('Сумма должна быть положительным числом');
    }

    user.balance = Number((currentBalance + deposit).toFixed(2));
    await this.userRepository.save(user);

    this.logger.info(`💰 Баланс пользователя ${userId} пополнен на $${deposit}`);
  }

  async getAllWithBalance(): Promise<User[]> {
    this.logger.verbose('📊 Получение пользователей с ненулевым балансом');
    return this.userRepository.find({
      where: { balance: Not(0) },
    });
  }

  async saveMany(users: User[]): Promise<void> {
    await this.userRepository.save(users);
  }
}
