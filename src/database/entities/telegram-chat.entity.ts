import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity('telegram_chats')
export class TelegramChatEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'bigint' })
  chatId: number;

  @Column({ type: 'text', nullable: true })
  additionalMessage: string | null;

  @OneToMany(() => MessageEntity, (message) => message.chat)
  messages: MessageEntity[];

  @OneToOne(() => MessageEntity, { nullable: true, eager: true })
  @JoinColumn()
  lastMessage: MessageEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
