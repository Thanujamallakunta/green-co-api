import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
    });
  }

  async sendCompanyRegistrationEmail(
    email: string,
    companyName: string,
    password: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: email,
      subject: 'Welcome to Green Co - Registration Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Green Co!</h2>
          <p>Dear ${companyName},</p>
          <p>Your company has been successfully registered with Green Co.</p>
          <p><strong>Your login credentials:</strong></p>
          <p>Email: ${email}</p>
          <p>Password: ${password}</p>
          <p>Please keep these credentials secure and change your password after first login.</p>
          <p>You can login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/company/login">Login Page</a></p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendForgotPasswordEmail(email: string, password: string): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: email,
      subject: 'Green Co - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Your password has been reset. Here is your new password:</p>
          <p><strong>New Password: ${password}</strong></p>
          <p>Please login and change your password after first login for security.</p>
          <p>You can login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/company/login">Login Page</a></p>
          <p>If you did not request this password reset, please contact support immediately.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordUpdateEmail(email: string, companyName: string): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: email,
      subject: 'Green Co - Password Updated',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Updated Successfully</h2>
          <p>Dear ${companyName},</p>
          <p>Your password has been successfully updated.</p>
          <p>If you did not make this change, please contact support immediately.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /** Facilitator: you have been assigned to a company */
  async sendFacilitatorAssignedToCompanyEmail(
    facilitatorEmail: string,
    facilitatorName: string,
    companyName: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: facilitatorEmail,
      subject: 'GreenCo - Facilitator Assignment',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Facilitator Assignment</h2>
          <p>Dear ${facilitatorName},</p>
          <p>You have been assigned as facilitator to company <strong>${companyName}</strong> by GreenCo Team.</p>
          <p>Please log in to the portal for further details.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Company: a facilitator has been assigned to your project */
  async sendCompanyFacilitatorAssignedEmail(
    companyEmail: string,
    companyName: string,
    facilitatorName: string,
    projectCode: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: companyEmail,
      subject: 'GreenCo - Facilitator Assigned to Your Project',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Facilitator Assigned</h2>
          <p>Dear ${companyName},</p>
          <p>Facilitator <strong>${facilitatorName}</strong> has been assigned for your Project ${projectCode} by GreenCo Team.</p>
          <p>Please log in to the portal for further details.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Assessor: you have been assigned to a company (site visit scheduling) */
  async sendAssessorAssignedToCompanyEmail(
    assessorEmail: string,
    assessorName: string,
    companyName: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: assessorEmail,
      subject: 'GreenCo - Assessor Assignment',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Assessor Assignment</h2>
          <p>Dear ${assessorName},</p>
          <p>Company <strong>${companyName}</strong> has been assigned to you as assessor by GreenCo Team.</p>
          <p>Please log in to the portal for site visit details and schedule.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Admin: coordinator has submitted scoring */
  async sendCoordinatorSubmitScoringEmail(adminEmail: string, data: { coordinatorName?: string; projectCode?: string }): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: adminEmail,
      subject: 'GreenCo - Coordinator Submitted Scoring',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Scoring Submitted</h2>
          <p>Coordinator ${data.coordinatorName || 'N/A'} has submitted scoring for project ${data.projectCode || 'N/A'}.</p>
          <p>Please review in the admin portal.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Company/Facilitator: checklist/assessment document not accepted */
  async sendChecklistDocNotAcceptedEmail(
    toEmail: string,
    recipientName: string,
    docDetails: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Assessment Document Not Accepted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Document Not Accepted</h2>
          <p>Dear ${recipientName},</p>
          <p>An assessment/checklist document has not been accepted.</p>
          <p>${docDetails}</p>
          <p>Please log in to the portal to view remarks and resubmit if required.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Company/Facilitator: primary data document not accepted */
  async sendPrimaryDocNotAcceptedEmail(
    toEmail: string,
    recipientName: string,
    docDetails: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Primary Data Not Accepted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Primary Data Not Accepted</h2>
          <p>Dear ${recipientName},</p>
          <p>A primary data section has not been accepted.</p>
          <p>${docDetails}</p>
          <p>Please log in to the portal to view remarks and resubmit if required.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Company/Facilitator: primary data section accepted */
  async sendPrimaryDocAcceptedEmail(
    toEmail: string,
    recipientName: string,
    sectionLabel?: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Primary Data Accepted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Primary Data Accepted</h2>
          <p>Dear ${recipientName},</p>
          <p>A primary data section has been accepted by GreenCo Team.${sectionLabel ? ` Section: ${sectionLabel}` : ''}</p>
          <p>Please log in to the portal to view your project status.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Company/Facilitator: invoice (registration fee / proforma / tax) has been raised */
  async sendInvoiceRaisedEmail(
    toEmail: string,
    recipientName: string,
    invoiceType: string,
    projectCode?: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Invoice Raised',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Invoice Raised</h2>
          <p>Dear ${recipientName},</p>
          <p>GreenCo Team has raised the ${invoiceType} for your project${projectCode ? ` (${projectCode})` : ''}.</p>
          <p>Please log in to the portal to view and make payment.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Company/Facilitator: payment approved or disapproved */
  async sendPaymentApprovalEmail(
    toEmail: string,
    recipientName: string,
    status: 'Approved' | 'DisApproved',
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: `GreenCo - Payment ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment ${status}</h2>
          <p>Dear ${recipientName},</p>
          <p>GreenCo Team has ${status.toLowerCase()} the payment from your company.</p>
          <p>Please log in to the portal for details.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Company: site visit report has been uploaded (Launch & Training) */
  async sendSiteVisitReportUploadedEmail(
    companyEmail: string,
    companyName: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: companyEmail,
      subject: 'GreenCo - Upload Site Visit Report',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Site Visit Report Uploaded</h2>
          <p>Dear ${companyName},</p>
          <p>The Site Visit Report (Launch & Training) has been uploaded for your project.</p>
          <p>Please log in to the portal to view.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Payment reminder: unpaid invoice (e.g. 15 days after reminder_date) */
  async sendPaymentReminderEmail(toEmail: string, recipientName: string, invoiceType: string): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Payment Reminder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Reminder</h2>
          <p>Dear ${recipientName},</p>
          <p>This is a reminder that your ${invoiceType} payment is pending. Please complete the payment at your earliest.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Proposal document reminder */
  async sendProposalReminderEmail(toEmail: string, recipientName: string): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Upload Proposal Document Reminder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Proposal Document Reminder</h2>
          <p>Dear ${recipientName},</p>
          <p>Please upload the proposal document for your project at your earliest.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Certificate validity / expiry reminder */
  async sendCertificateExpiryEmail(toEmail: string, recipientName: string, expiryDate: string): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Certificate Validity Reminder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Certificate Validity</h2>
          <p>Dear ${recipientName},</p>
          <p>Your GreenCo certificate is valid until ${expiryDate}. Please complete renewal in time.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Sustenance reminder (1st) */
  async sendSustenanceReminderEmail(toEmail: string, recipientName: string): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Upload Sustenance Document',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sustenance Document Reminder</h2>
          <p>Dear ${recipientName},</p>
          <p>Please upload the sustenance document for your project.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /** Sustenance 2 reminder */
  async sendSustenance2ReminderEmail(toEmail: string, recipientName: string): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: toEmail,
      subject: 'GreenCo - Upload Sustenance 2 Document',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sustenance 2 Document Reminder</h2>
          <p>Dear ${recipientName},</p>
          <p>Please upload the second sustenance document for your project.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Help Desk: notify company when their ticket is resolved.
   */
  async sendHelpDeskTicketResolvedEmail(
    companyEmail: string,
    companyName: string,
    ticketSubject: string,
    remarks: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
      to: companyEmail,
      subject: 'GreenCo Help Desk - Your query has been resolved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Help Desk – Query Resolved</h2>
          <p>Dear ${companyName},</p>
          <p>Your help desk query has been resolved by GreenCo Admin.</p>
          <p><strong>Subject:</strong> ${ticketSubject}</p>
          <p><strong>Remarks / Resolution:</strong></p>
          <p>${remarks || 'No additional remarks provided.'}</p>
          <p>You can view all your tickets and status in the Help Desk section of the portal.</p>
          <p>Best regards,<br>Green Co Team</p>
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }
}

