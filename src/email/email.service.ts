import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendOtp(email: string, name: string, otp: string): Promise<void> {
    const subject = 'Verifikasi Akun EcoPoint';
    const html = this.otpTemplate(name, otp);
    await this.send(email, subject, html);
  }

  async sendSubmissionApproved(
    email: string,
    name: string,
    wasteType: string,
    actualWeight: number,
    pointsEarned: number,
  ): Promise<void> {
    const subject = 'Pengajuan Sampah Disetujui – EcoPoint';
    const html = this.submissionApprovedTemplate(name, wasteType, actualWeight, pointsEarned);
    await this.send(email, subject, html);
  }

  async sendSubmissionRejected(
    email: string,
    name: string,
    wasteType: string,
    notes: string,
  ): Promise<void> {
    const subject = 'Pengajuan Sampah Ditolak – EcoPoint';
    const html = this.submissionRejectedTemplate(name, wasteType, notes);
    await this.send(email, subject, html);
  }

  async sendVoucherRedeemed(
    email: string,
    name: string,
    voucherName: string,
    pointsUsed: number,
  ): Promise<void> {
    const subject = 'Penukaran Voucher Berhasil – EcoPoint';
    const html = this.voucherRedeemedTemplate(name, voucherName, pointsUsed);
    await this.send(email, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_FROM'),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  private otpTemplate(name: string, otp: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #22c55e; margin: 0;">🌿 EcoPoint</h2>
        </div>
        <h3 style="color: #1a1a1a;">Halo, ${name}!</h3>
        <p style="color: #444; line-height: 1.6;">
          Terima kasih telah mendaftar di EcoPoint. Gunakan kode OTP berikut untuk memverifikasi akun Anda:
        </p>
        <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #16a34a;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">
          Kode ini berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapa pun.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          Jika Anda tidak mendaftar di EcoPoint, abaikan email ini.
        </p>
      </div>
    `;
  }

  private submissionApprovedTemplate(
    name: string,
    wasteType: string,
    actualWeight: number,
    pointsEarned: number,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #22c55e; margin: 0;">🌿 EcoPoint</h2>
        </div>
        <h3 style="color: #1a1a1a;">Halo, ${name}! 🎉</h3>
        <p style="color: #444; line-height: 1.6;">
          Pengajuan sampah Anda telah <strong style="color: #16a34a;">disetujui</strong> oleh petugas.
        </p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #444;"><strong>Jenis Sampah:</strong> ${wasteType}</p>
          <p style="margin: 4px 0; color: #444;"><strong>Berat Aktual:</strong> ${actualWeight} kg</p>
          <p style="margin: 4px 0; color: #16a34a; font-size: 18px;"><strong>Poin Diterima: +${pointsEarned} poin</strong></p>
        </div>
        <p style="color: #444; line-height: 1.6;">
          Poin Anda telah ditambahkan. Tukarkan poin dengan voucher menarik di aplikasi EcoPoint!
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">EcoPoint – Bersama Jaga Lingkungan</p>
      </div>
    `;
  }

  private submissionRejectedTemplate(
    name: string,
    wasteType: string,
    notes: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #22c55e; margin: 0;">🌿 EcoPoint</h2>
        </div>
        <h3 style="color: #1a1a1a;">Halo, ${name}</h3>
        <p style="color: #444; line-height: 1.6;">
          Mohon maaf, pengajuan sampah Anda <strong style="color: #ef4444;">ditolak</strong> oleh petugas.
        </p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #444;"><strong>Jenis Sampah:</strong> ${wasteType}</p>
          <p style="margin: 4px 0; color: #444;"><strong>Alasan:</strong> ${notes || 'Tidak ada keterangan'}</p>
        </div>
        <p style="color: #444; line-height: 1.6;">
          Silakan ajukan kembali setelah memastikan sampah sesuai dengan ketentuan.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">EcoPoint – Bersama Jaga Lingkungan</p>
      </div>
    `;
  }

  private voucherRedeemedTemplate(
    name: string,
    voucherName: string,
    pointsUsed: number,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #22c55e; margin: 0;">🌿 EcoPoint</h2>
        </div>
        <h3 style="color: #1a1a1a;">Halo, ${name}! 🎁</h3>
        <p style="color: #444; line-height: 1.6;">
          Penukaran voucher Anda <strong style="color: #16a34a;">berhasil</strong>!
        </p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #444;"><strong>Voucher:</strong> ${voucherName}</p>
          <p style="margin: 4px 0; color: #ef4444;"><strong>Poin Digunakan: -${pointsUsed} poin</strong></p>
        </div>
        <p style="color: #444; line-height: 1.6;">
          Cek voucher Anda di aplikasi EcoPoint dan gunakan sebelum kedaluwarsa.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">EcoPoint – Bersama Jaga Lingkungan</p>
      </div>
    `;
  }
}
