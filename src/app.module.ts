import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyAuthModule } from './company/company-auth/company-auth.module';
import { CompanyProjectsModule } from './company/company-projects/company-projects.module';
import { FacilitatorsModule } from './company/facilitators/facilitators.module';
import { RegistrationMastersModule } from './company/registration-masters/registration-masters.module';
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
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
        connectTimeoutMS: 10000, // 10 seconds
      }),
      inject: [ConfigService],
    }),
    CompanyAuthModule,
    CompanyProjectsModule,
    FacilitatorsModule,
    RegistrationMastersModule,
    MailModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

