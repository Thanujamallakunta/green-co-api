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
}

