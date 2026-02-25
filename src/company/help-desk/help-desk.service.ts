import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  HelpDeskTicket,
  HelpDeskTicketDocument,
  HelpDeskTicketStatus,
} from '../schemas/help-desk-ticket.schema';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { MailService } from '../../mail/mail.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketAdminDto } from './dto/update-ticket-admin.dto';

@Injectable()
export class HelpDeskService {
  constructor(
    @InjectModel(HelpDeskTicket.name)
    private readonly ticketModel: Model<HelpDeskTicketDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Company: create a new ticket.
   */
  async create(companyId: string, dto: CreateTicketDto) {
    const ticket = await this.ticketModel.create({
      company_id: new Types.ObjectId(companyId),
      subject: dto.subject,
      description: dto.description,
      status: 'open',
    });
    return {
      id: ticket._id.toString(),
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      remarks: ticket.remarks,
      resolved_at: ticket.resolved_at,
      created_at: (ticket as any).createdAt,
    };
  }

  /**
   * Company: list tickets for the logged-in company (with status and remarks).
   */
  async listByCompany(
    companyId: string,
    options?: { status?: HelpDeskTicketStatus; limit?: number; skip?: number },
  ) {
    const filter: any = { company_id: new Types.ObjectId(companyId) };
    if (options?.status) filter.status = options.status;

    const limit = Math.min(options?.limit ?? 50, 100);
    const skip = options?.skip ?? 0;

    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.ticketModel.countDocuments(filter),
    ]);

    const data = tickets.map((t: any) => ({
      id: t._id.toString(),
      subject: t.subject,
      description: t.description,
      status: t.status,
      remarks: t.remarks ?? null,
      resolved_at: t.resolved_at ? new Date(t.resolved_at).toISOString() : null,
      created_at: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      updated_at: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
    }));

    return { tickets: data, total };
  }

  /**
   * Company: get one ticket by id (must belong to company).
   */
  async getOneByCompany(companyId: string, ticketId: string) {
    const ticket = await this.ticketModel
      .findOne({
        _id: new Types.ObjectId(ticketId),
        company_id: new Types.ObjectId(companyId),
      })
      .lean();

    if (!ticket) {
      throw new NotFoundException({ status: 'error', message: 'Ticket not found' });
    }

    const t = ticket as any;
    return {
      id: t._id.toString(),
      subject: t.subject,
      description: t.description,
      status: t.status,
      remarks: t.remarks ?? null,
      resolved_at: t.resolved_at ? new Date(t.resolved_at).toISOString() : null,
      created_at: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      updated_at: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
    };
  }

  /**
   * Admin: update ticket status and/or remarks. On status = 'resolved', send email to company.
   */
  async updateByAdmin(ticketId: string, dto: UpdateTicketAdminDto) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException({ status: 'error', message: 'Ticket not found' });
    }

    const wasResolved = ticket.status === 'resolved';
    if (dto.status !== undefined) {
      (ticket as any).status = dto.status;
      if (dto.status === 'resolved') {
        (ticket as any).resolved_at = new Date();
      }
    }
    if (dto.remarks !== undefined) {
      (ticket as any).remarks = dto.remarks;
    }
    await ticket.save();

    const isNowResolved = (ticket as any).status === 'resolved';
    if (isNowResolved && !wasResolved) {
      const company = await this.companyModel
        .findById(ticket.company_id)
        .select('email name')
        .lean();
      if (company && (company as any).email) {
        await this.mailService
          .sendHelpDeskTicketResolvedEmail(
            (company as any).email,
            (company as any).name || 'User',
            ticket.subject,
            (ticket as any).remarks || '',
          )
          .catch((e) => console.error('Help desk resolution email failed:', e));
      }
    }

    const t = ticket as any;
    return {
      id: t._id.toString(),
      subject: t.subject,
      description: t.description,
      status: t.status,
      remarks: t.remarks ?? null,
      resolved_at: t.resolved_at ? new Date(t.resolved_at).toISOString() : null,
      updated_at: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
    };
  }

  /**
   * Admin: list all tickets (optional filter by status, company).
   */
  async listAll(options?: {
    status?: HelpDeskTicketStatus;
    company_id?: string;
    limit?: number;
    skip?: number;
  }) {
    const filter: any = {};
    if (options?.status) filter.status = options.status;
    if (options?.company_id) filter.company_id = new Types.ObjectId(options.company_id);

    const limit = Math.min(options?.limit ?? 50, 100);
    const skip = options?.skip ?? 0;

    const tickets = await this.ticketModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('company_id', 'name email')
      .lean();

    const total = await this.ticketModel.countDocuments(filter);

    const data = (tickets as any[]).map((t) => ({
      id: t._id.toString(),
      company_id: t.company_id?._id?.toString() ?? t.company_id?.toString(),
      company_name: t.company_id?.name,
      company_email: t.company_id?.email,
      subject: t.subject,
      description: t.description,
      status: t.status,
      remarks: t.remarks ?? null,
      resolved_at: t.resolved_at ? new Date(t.resolved_at).toISOString() : null,
      created_at: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      updated_at: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
    }));

    return { tickets: data, total };
  }
}
