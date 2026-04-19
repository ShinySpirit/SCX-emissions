import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmissionEntity } from './emission.entity';
import { TelegramChatEntity } from './telegram-chat.entity';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'bigint' })
  telegramMessageId: number;

  @ManyToOne(() => EmissionEntity, (emission) => emission.messages)
  emission: EmissionEntity;

  @ManyToOne(() => TelegramChatEntity, (chat) => chat.messages)
  chat: TelegramChatEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
