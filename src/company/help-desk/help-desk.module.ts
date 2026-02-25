import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  HelpDeskTicket,
  HelpDeskTicketSchema,
} from '../schemas/help-desk-ticket.schema';
import { Company, CompanySchema } from '../schemas/company.schema';
import { HelpDeskController } from './help-desk.controller';
import { HelpDeskService } from './help-desk.service';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HelpDeskTicket.name, schema: HelpDeskTicketSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    MailModule,
  ],
  controllers: [HelpDeskController],
  providers: [HelpDeskService],
  exports: [HelpDeskService],
})
export class HelpDeskModule {}
