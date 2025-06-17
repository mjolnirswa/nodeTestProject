import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, UpdateResult } from 'typeorm';
import { User } from './entity/user.entity';

@Injectable()
export class UsersRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  findByIdWithAvatars(id: number) {
    return this.ds.getRepository(User).findOne({
      where: { id },
      relations: ['avatars'],
    });
  }

  findByEmail(email: string) {
    return this.ds.getRepository(User).findOneBy({ email });
  }

  findByLogin(login: string) {
    return this.ds.getRepository(User).findOneBy({ login });
  }

  async paginate(page: number, limit: number, search?: string): Promise<User[]> {
    const qb = this.ds
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.avatars', 'avatars')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) qb.where('user.login ILIKE :s', { s: `%${search}%` });

    return qb.getMany();
  }

  findWithNonZeroBalance() {
    return this.ds.getRepository(User).find({ where: { balance: Not(0) } });
  }

  async lockUsersForTransfer(ids: [number, number], manager: EntityManager): Promise<User[]> {
    return manager
      .createQueryBuilder(User, 'user')
      .setLock('pessimistic_write')
      .where('user.id IN (:...ids)', { ids })
      .orderBy('user.id', 'ASC')
      .getMany();
  }

  updateBalances(
    fromId: number,
    toId: number,
    amount: number,
    manager: EntityManager,
  ): Promise<UpdateResult> {
    return manager
      .createQueryBuilder()
      .update(User)
      .set({
        balance: () => `
        CASE
          WHEN id = ${fromId} THEN balance - ${amount}
          WHEN id = ${toId} THEN balance + ${amount}
          ELSE balance
        END`,
      })
      .where({ id: In([fromId, toId]) })
      .execute();
  }

  saveMany(users: User[]) {
    return this.ds.getRepository(User).save(users);
  }

  softDelete(id: number) {
    return this.ds.getRepository(User).softDelete(id);
  }
}
