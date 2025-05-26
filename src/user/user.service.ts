import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from './entity/user.entity';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from './dto/user-responce.dto';
import { plainToInstance } from 'class-transformer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Transactional } from 'typeorm-transactional';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const salt = Number(this.configService.get('BCRYPT_SALT_ROUNDS', '10'));
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

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

  async updateRefreshToken(userId: number, refreshToken: string) {
    await this.userRepository.update(userId, { refreshToken });
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
      throw new Error('User not found');
    }

    if (updateUserDto.password) {
      const salt = Number(this.configService.get('BCRYPT_SALT_ROUNDS', '10'));
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);
    this.logger.info(`📝 Пользователь с ID ${id} обновлён`);

    return plainToInstance(UserResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async deleteUser(id: number): Promise<void> {
    await this.userRepository.delete(id);
    this.logger.info(`🗑️ Пользователь с ID ${id} удалён`);
  }

  @Transactional()
  async transferBalance(fromId: number, toId: number, amount: number): Promise<void> {
    this.logger.verbose(`💸 Перевод $${amount} от user ${fromId} к user ${toId}`);

    const fromUser = await this.userRepository.findOneBy({ id: fromId });
    const toUser = await this.userRepository.findOneBy({ id: toId });

    if (!fromUser || !toUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    const fromBalance = Number(fromUser.balance);
    const toBalance = Number(toUser.balance);
    const transferAmount = Number(amount);

    if (transferAmount <= 0 || isNaN(transferAmount)) {
      throw new BadRequestException('Сумма должна быть положительным числом');
    }

    if (fromBalance < transferAmount) {
      throw new BadRequestException('Недостаточно средств');
    }

    fromUser.balance = Number((fromBalance - transferAmount).toFixed(2));
    toUser.balance = Number((toBalance + transferAmount).toFixed(2));

    await this.userRepository.save([fromUser, toUser]);
    this.logger.info(`✅ Успешный перевод $${transferAmount} от ${fromId} к ${toId}`);
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
