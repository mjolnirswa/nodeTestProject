import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/user/entity/user.entity';

@Entity('avatars')
@Index(['user_id', 'deletedAt'])
export class Avatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column()
  user_id: number;

  @ManyToOne(() => User, (user) => user.avatars)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
