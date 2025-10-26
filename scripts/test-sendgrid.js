#!/usr/bin/env node

/**
 * Test script for SendGrid email integration
 * Usage: node scripts/test-sendgrid.js
 */

require('dotenv').config();
const emailService = require('../services/emailService');

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Email Integration...\n');
  
  // Check configuration
  const provider = emailService.getProvider();
  console.log(`📧 Email Provider: ${provider}`);
  
  if (provider === 'sendgrid') {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY not found in environment variables');
      console.log('Please add SENDGRID_API_KEY to your .env file');
      process.exit(1);
    }
    
    if (!process.env.SENDGRID_FROM_EMAIL && !process.env.EMAIL_USER) {
      console.error('❌ SENDGRID_FROM_EMAIL or EMAIL_USER not found');
      console.log('Please add SENDGRID_FROM_EMAIL to your .env file');
      process.exit(1);
    }
    
    console.log('✅ SendGrid configuration found');
    console.log(`📤 From Email: ${process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER}`);
  } else {
    console.log('ℹ️  Using nodemailer provider. To test SendGrid, set EMAIL_PROVIDER=sendgrid');
    process.exit(0);
  }
  
  // Test email sending
  const testEmail = process.env.TEST_EMAIL || 'mbabarwaseem@gmail.com';
  const testUsername = 'Test User';
  const testOTP = emailService.generateOTP();
  
  console.log(`\n📨 Sending test email to: ${testEmail}`);
  console.log(`🔢 Test OTP: ${testOTP}`);
  
  try {
    await emailService.sendOTP(testEmail, testOTP, testUsername);
    console.log('✅ Test email sent successfully!');
    console.log('📬 Check your email inbox for the OTP message');
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your SendGrid API key is correct');
    console.log('2. Make sure your sender email is verified in SendGrid');
    console.log('3. Check SendGrid dashboard for any account issues');
    process.exit(1);
  }
}

// Run the test
testSendGrid().catch(console.error);
