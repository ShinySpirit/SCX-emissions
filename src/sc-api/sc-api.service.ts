import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BotUpdate } from 'src/bot/bot.update';
import { EmissionEntity } from 'src/database/entities/emission.entity';
import { MessageEntity } from 'src/database/entities/message.entity';
import { TelegramChatEntity } from 'src/database/entities/telegram-chat.entity';
import { Context, Telegraf } from 'telegraf';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { Repository } from 'typeorm';

@Injectable()
export class ApiService {
  private bot: Telegraf<Context>;

  constructor(
    private botUpdate: BotUpdate,
    private authService: AuthService,
    private config: ConfigService,
    @InjectRepository(EmissionEntity)
    private emissionRepo: Repository<EmissionEntity>,
    @InjectRepository(MessageEntity)
    private messageRepo: Repository<MessageEntity>,
    @InjectRepository(TelegramChatEntity)
    private chatRepo: Repository<TelegramChatEntity>,
  ) {
    this.bot = new Telegraf(this.config.get('TG_BOT_KEY'));
  }

  private fmtKyiv(date: Date): string {
    return new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async checkApi() {
    const token = this.authService.getCachedToken();
    if (!token) return;

    const { data } = await axios.get(this.config.get('API_EMISSIONS_URL'), {
      headers: { Authorization: `Bearer ${token}` },
    });

    Logger.log(`Emission data: ${JSON.stringify(data)}`);

    if (data.currentStart) {
      const currentStart = new Date(data.currentStart);
      const current = await this.emissionRepo.findOne({ where: { start: currentStart } });
      if (!current) {
        await this.emissionRepo.save({ start: currentStart, end: null });
      }
    }

    const start = new Date(data.previousStart);
    const end = new Date(data.previousEnd);

    let emission = await this.emissionRepo.findOne({ where: { start } });
    let endChanged = false;

    if (!emission) {
      emission = await this.emissionRepo.save({ start, end });
    } else if (!emission.end || new Date(emission.end).getTime() !== end.getTime()) {
      emission = await this.emissionRepo.save({ ...emission, end });
      endChanged = true;
    }

    const existingMessages = await this.messageRepo.find({
      where: { emission: { id: emission.id } },
      relations: ['chat'],
    });

    if (existingMessages.length === 0) {
      const chats = await this.chatRepo.find();
      for (let i = 0; i < chats.length; i += 10) {
        const batch = chats.slice(i, i + 10);
        await Promise.all(
          batch.map(async (chat) => {
            const sent = await this.bot.telegram.sendMessage(
              chat.chatId,
              `Emission started: ${this.fmtKyiv(start)}\nEnded: ${this.fmtKyiv(end)}\n${chat.additionalMessage || ''} `,
            );
            await this.messageRepo.save({
              telegramMessageId: sent.message_id,
              emission,
              chat,
            });
          }),
        );
      }
      return;
    }

    if (!endChanged) return;

    for (let i = 0; i < existingMessages.length; i += 10) {
      const batch = existingMessages.slice(i, i + 10);
      await Promise.all(
        batch.map((message) =>
          this.bot.telegram.editMessageText(
            message.chat.chatId,
            Number(message.telegramMessageId),
            undefined,
            `Emission started: ${this.fmtKyiv(start)}\nEnded: ${this.fmtKyiv(end)}\n${message.chat.additionalMessage || ''} `,
          ),
        ),
      );
    }
  }
}
