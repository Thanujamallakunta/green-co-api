import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyAuthModule } from './company/company-auth/company-auth.module';
import { MailModule } from './mail/mail.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/greenco',
      }),
      inject: [ConfigService],
    }),
    CompanyAuthModule,
    MailModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

