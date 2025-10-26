const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Create transporter
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER || "itsichn5@gmail.com",
        pass: process.env.EMAIL_PASSWORD || "wqtf tpsn iwtq qpda",
      },
    });``
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP email
  async sendOTP(email, otp, username) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Login OTP - SICHN VPN Tunnel',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
                border-radius: 10px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background-color: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .otp-box {
                background-color: #f0f0f0;
                border: 2px dashed #667eea;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
                border-radius: 8px;
              }
              .otp-code {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
                letter-spacing: 5px;
              }
              .warning {
                color: #e74c3c;
                font-size: 14px;
                margin-top: 20px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #777;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Login Verification</h1>
              </div>
              <div class="content">
                <h2>Hello ${username}!</h2>
                <p>You have requested to log in to your Custom Ngrok account.</p>
                <p>Please use the following One-Time Password (OTP) to complete your login:</p>
                
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                </div>
                
                <p><strong>This OTP will expire in 5 minutes.</strong></p>
                
                <div class="warning">
                  ⚠️ If you did not request this login, please ignore this email and consider changing your password.
                </div>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} Custom Ngrok. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hello ${username}!

You have requested to log in to your Custom Ngrok account.

Your OTP is: ${otp}

This OTP will expire in 5 minutes.

If you did not request this login, please ignore this email and consider changing your password.

This is an automated email. Please do not reply.
© ${new Date().getFullYear()} Custom Ngrok. All rights reserved.
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send OTP email');
    }
  }
}

module.exports = new EmailService();

