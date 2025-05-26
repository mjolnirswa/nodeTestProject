import { Exclude } from 'class-transformer';
import { Avatar } from 'src/avatar/entity/avatar.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  login: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  age: string;

  @Column({ length: 1000 })
  description: string;

  @Column({ nullable: true })
  refreshToken: string | null;

  @OneToMany(() => Avatar, (avatar) => avatar.user)
  avatars: Avatar[];

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;
}
