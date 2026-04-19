import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private cachedToken: string | null = null;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    await this.refreshToken();
  }

  async getToken(): Promise<string | null> {
    const clientId = this.config.get('SC_API_ID');
    const clientSecret = this.config.get('SC_API_KEY');
    const url = this.config.get('API_TOKEN_URL');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response?.data?.access_token || null;
  }

  getCachedToken(): string | null {
    return this.cachedToken;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshToken() {
    try {
      const token = await this.getToken();
      if (!token) {
        this.logger.warn('Token refresh returned empty response');
        return;
      }
      this.cachedToken = token;
      this.writeTokenToEnv(token);
      this.logger.log('Auth token refreshed and written to .env');
    } catch (error) {
      this.logger.error('Failed to refresh token', error);
    }
  }

  private writeTokenToEnv(token: string) {
    const envPath = path.resolve(process.cwd(), '.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    const key = 'SC_API_TOKEN';
    const newLine = `${key}=${token}`;

    if (content.match(new RegExp(`^${key}=`, 'm'))) {
      content = content.replace(new RegExp(`^${key}=.*$`, 'm'), newLine);
    } else {
      content = content.endsWith('\n') ? content + newLine : content + '\n' + newLine;
    }

    fs.writeFileSync(envPath, content, 'utf8');
  }
}
