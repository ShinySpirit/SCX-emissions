import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ctx, On, Update } from 'nestjs-telegraf';
import { TelegramChatEntity } from 'src/database/entities/telegram-chat.entity';
import { Context } from 'telegraf';
import { Update as TgUpdate } from '@telegraf/types';
import { Repository } from 'typeorm';

@Update()
export class BotUpdate {
  private chats = new Set<number>();

  constructor(
    @InjectRepository(TelegramChatEntity)
    private chatRepo: Repository<TelegramChatEntity>,
  ) {}

  @On('my_chat_member')
  async onJoin(@Ctx() ctx: Context) {
    const update = ctx.update as TgUpdate.MyChatMemberUpdate;
    const chatId = update.my_chat_member.chat.id;
    this.chats.add(chatId);

    await this.chatRepo.upsert({ chatId }, ['chatId']);

    Logger.log(`Bot joined chat ${chatId}`);
  }

  getChats() {
    return [...this.chats];
  }
}
