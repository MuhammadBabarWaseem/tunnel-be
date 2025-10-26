const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    // Initialize email provider based on environment variable
    this.provider = process.env.EMAIL_PROVIDER || 'nodemailer'; // 'nodemailer' or 'sendgrid'
    
    if (this.provider === 'sendgrid') {
      // Initialize SendGrid
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sgMail = sgMail;
    } else {
      // Create nodemailer transporter
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER || "itsichn5@gmail.com",
          pass: process.env.EMAIL_PASSWORD || "wqtf tpsn iwtq qpda",
        },
      });
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Get current email provider
  getProvider() {
    return this.provider;
  }

  // Send OTP email
  async sendOTP(email, otp, username) {
    try {
      const fromEmail = this.provider === 'sendgrid' 
        ? process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER
        : process.env.EMAIL_USER;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login Verification Code</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background-color: #2563eb;
              color: #ffffff;
              padding: 30px 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px 20px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #1f2937;
            }
            .message {
              font-size: 16px;
              margin-bottom: 25px;
              color: #4b5563;
            }
            .otp-container {
              background-color: #f8fafc;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 25px;
              text-align: center;
              margin: 25px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: 700;
              color: #2563eb;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
              margin: 10px 0;
            }
            .otp-label {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .expiry-notice {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              color: #92400e;
              font-size: 14px;
            }
            .security-notice {
              background-color: #fef2f2;
              border: 1px solid #fca5a5;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              color: #991b1b;
              font-size: 14px;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px;
              text-align: center;
              border-radius: 0 0 8px 8px;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Login Verification</h1>
            </div>
            <div class="content">
              <div class="greeting">Hello ${username},</div>
              
              <div class="message">
                We received a request to sign in to your SICHN VPN Tunnel account. Please use the verification code below to complete your login.
              </div>
              
              <div class="otp-container">
                <div class="otp-label">Your verification code is:</div>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="expiry-notice">
                <strong>Important:</strong> This code will expire in 5 minutes for security reasons.
              </div>
              
              <div class="security-notice">
                <strong>Security Notice:</strong> If you did not request this login, please ignore this email and consider changing your account password.
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message from SICHN VPN Tunnel</p>
              <p>Please do not reply to this email</p>
              <p>&copy; ${new Date().getFullYear()} SICHN VPN Tunnel. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Hello ${username},

We received a request to sign in to your SICHN VPN Tunnel account. Please use the verification code below to complete your login.

Your verification code is: ${otp}

IMPORTANT: This code will expire in 5 minutes for security reasons.

SECURITY NOTICE: If you did not request this login, please ignore this email and consider changing your account password.

This is an automated message from SICHN VPN Tunnel.
Please do not reply to this email.

© ${new Date().getFullYear()} SICHN VPN Tunnel. All rights reserved.
      `;

      if (this.provider === 'sendgrid') {
        // Send via SendGrid with proper headers
        const msg = {
          to: email,
          from: {
            email: fromEmail,
            name: 'SICHN VPN Tunnel'
          },
          replyTo: process.env.EMAIL_REPLY_TO || fromEmail,
          subject: 'Your Login OTP - SICHN VPN Tunnel',
          text: textContent,
          html: htmlContent,
          headers: {
            'X-Mailer': 'SICHN-VPN-Tunnel',
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high',
            'List-Unsubscribe': '<mailto:unsubscribe@yourdomain.com>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
          },
          categories: ['otp', 'authentication'],
          customArgs: {
            type: 'otp',
            service: 'sichn-vpn'
          }
        };

        await this.sgMail.send(msg);
      } else {
        // Send via nodemailer with proper headers
        const mailOptions = {
          from: `"SICHN VPN Tunnel" <${fromEmail}>`,
          to: email,
          replyTo: process.env.EMAIL_REPLY_TO || fromEmail,
          subject: 'Your Login OTP - SICHN VPN Tunnel',
          html: htmlContent,
          text: textContent,
          headers: {
            'X-Mailer': 'SICHN-VPN-Tunnel',
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high',
            'List-Unsubscribe': '<mailto:unsubscribe@yourdomain.com>',
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
          }
        };

        await this.transporter.sendMail(mailOptions);
      }

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send OTP email');
    }
  }
}

module.exports = new EmailService();

