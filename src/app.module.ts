import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotUpdate } from './bot/bot.update';
import { ApiService } from './sc-api/sc-api.service';
import { AuthService } from './sc-api/auth.service';
import { ApiCredentialEntity } from './database/entities/api-credential.entity';
import { TelegramChatEntity } from './database/entities/telegram-chat.entity';
import { MessageEntity } from './database/entities/message.entity';
import { EmissionEntity } from './database/entities/emission.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.stage.${process.env.STAGE}`, '.env'],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('PGSQL_URL'),
        entities: [ApiCredentialEntity, TelegramChatEntity, MessageEntity, EmissionEntity],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TelegrafModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        token: config.get('TG_BOT_KEY'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ApiCredentialEntity, TelegramChatEntity, MessageEntity, EmissionEntity]),
  ],
  controllers: [AppController],
  providers: [AppService, BotUpdate, ApiService, AuthService],
})
export class AppModule {}
