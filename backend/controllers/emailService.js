/**
 * Email Service Module
 * Handles sending transactional emails for college registration
 * 
 * Currently implements console logging for development/testing.
 * Can be extended with SendGrid, AWS SES, Nodemailer, etc.
 */

/**
 * Send college approval email
 * 
 * @param {string} recipientEmail - College contact email address
 * @param {string} collegeName - College name
 * @param {string} universityName - University name
 * @param {string} programId - College Program ID
 * @param {string} tempPassword - Temporary password
 * @param {object} options - Additional options (dashboard URL, etc.)
 * @returns {Promise<object>} { success: true, messageId: string, timestamp: ISO }
 */
async function sendApprovalEmail(
  recipientEmail,
  collegeName,
  universityName,
  programId,
  tempPassword,
  options = {}
) {
  try {
    const dashboardUrl = options.dashboardUrl || 'https://yourapp.com/college/login';
    const appName = options.appName || 'IRA College Registration System';
    const timestamp = new Date().toISOString();
    
    const emailContent = {
      to: recipientEmail,
      subject: `${appName} - College Registration Approved`,
      htmlContent: generateApprovalEmailHTML(
        collegeName,
        universityName,
        programId,
        tempPassword,
        dashboardUrl,
        appName
      ),
      textContent: generateApprovalEmailText(
        collegeName,
        universityName,
        programId,
        tempPassword,
        dashboardUrl,
        appName
      ),
      timestamp: timestamp,
      type: 'approval'
    };

    // TODO: Integrate with actual email service (SendGrid, AWS SES, Nodemailer, etc.)
    // For now, log to console and return mock messageId
    console.log('\n' + '='.repeat(80));
    console.log('EMAIL SERVICE: APPROVAL EMAIL');
    console.log('='.repeat(80));
    console.log(`To: ${emailContent.to}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log('-'.repeat(80));
    console.log(emailContent.htmlContent);
    console.log('='.repeat(80) + '\n');

    // Return mock response (mimic SendGrid/SES response structure)
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timestamp,
      recipient: recipientEmail,
      type: 'approval',
      status: 'queued',
      note: 'Email logged to console (integration needed for production)'
    };
  } catch (error) {
    console.error('Approval email error:', error);
    throw error;
  }
}

/**
 * Send college rejection email
 * 
 * @param {string} recipientEmail - College contact email address
 * @param {string} collegeName - College name
 * @param {string} universityName - University name
 * @param {string} reason - Rejection reason
 * @param {object} options - Additional options
 * @returns {Promise<object>} { success: true, messageId: string, timestamp: ISO }
 */
async function sendRejectionEmail(
  recipientEmail,
  collegeName,
  universityName,
  reason,
  options = {}
) {
  try {
    const supportEmail = options.supportEmail || 'support@yourapp.com';
    const appName = options.appName || 'IRA College Registration System';
    const timestamp = new Date().toISOString();

    const emailContent = {
      to: recipientEmail,
      subject: `${appName} - College Registration Status Update`,
      htmlContent: generateRejectionEmailHTML(
        collegeName,
        universityName,
        reason,
        supportEmail,
        appName
      ),
      textContent: generateRejectionEmailText(
        collegeName,
        universityName,
        reason,
        supportEmail,
        appName
      ),
      timestamp: timestamp,
      type: 'rejection'
    };

    // Log to console for now
    console.log('\n' + '='.repeat(80));
    console.log('EMAIL SERVICE: REJECTION EMAIL');
    console.log('='.repeat(80));
    console.log(`To: ${emailContent.to}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log('-'.repeat(80));
    console.log(emailContent.htmlContent);
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timestamp,
      recipient: recipientEmail,
      type: 'rejection',
      status: 'queued',
      note: 'Email logged to console (integration needed for production)'
    };
  } catch (error) {
    console.error('Rejection email error:', error);
    throw error;
  }
}

/**
 * Send password change confirmation email
 * 
 * @param {string} recipientEmail - College contact email address
 * @param {string} collegeName - College name
 * @param {object} options - Additional options
 * @returns {Promise<object>} { success: true, messageId: string }
 */
async function sendPasswordChangeEmail(
  recipientEmail,
  collegeName,
  options = {}
) {
  try {
    const appName = options.appName || 'IRA College Registration System';
    const timestamp = new Date().toISOString();

    const emailContent = {
      to: recipientEmail,
      subject: `${appName} - Password Changed Successfully`,
      htmlContent: generatePasswordChangeEmailHTML(collegeName, appName),
      textContent: generatePasswordChangeEmailText(collegeName, appName),
      timestamp: timestamp,
      type: 'password_change'
    };

    console.log('\n' + '='.repeat(80));
    console.log('EMAIL SERVICE: PASSWORD CHANGE CONFIRMATION');
    console.log('='.repeat(80));
    console.log(`To: ${emailContent.to}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log('-'.repeat(80));
    console.log(emailContent.htmlContent);
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: timestamp,
      recipient: recipientEmail,
      type: 'password_change',
      status: 'sent'
    };
  } catch (error) {
    console.error('Password change email error:', error);
    throw error;
  }
}

// ============ HTML TEMPLATES ============

function generateApprovalEmailHTML(collegeName, universityName, programId, tempPassword, dashboardUrl, appName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { margin: 20px 0; }
    .section h3 { color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    .field { margin: 10px 0; line-height: 1.6; }
    .label { font-weight: bold; color: #555; }
    .value { font-family: 'Courier New', monospace; background-color: #f5f5f5; padding: 10px; border-radius: 5px; }
    .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
    .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✓ College Registration Approved</h2>
    </div>
    
    <div class="content">
      <p>Dear ${collegeName} Administration,</p>
      
      <p>Congratulations! Your college registration has been <strong>approved</strong> in the ${appName}. Your institution is now registered in our system.</p>
      
      <div class="section">
        <h3>Approval Details</h3>
        <div class="field">
          <span class="label">College Name:</span>
          <br>${collegeName}
        </div>
        <div class="field">
          <span class="label">University:</span>
          <br>${universityName}
        </div>
        <div class="field">
          <span class="label">College Program ID:</span>
          <div class="value">${programId}</div>
          <p style="font-size: 12px; color: #666; margin-top: 5px;">This ID is used for student registration and enrollment</p>
        </div>
      </div>
      
      <div class="section">
        <h3>Login Credentials</h3>
        <div class="field">
          <span class="label">College Code:</span>
          <div class="value">${programId.split(' ')[5]}</div>
        </div>
        <div class="field">
          <span class="label">Temporary Password:</span>
          <div class="value">${tempPassword}</div>
        </div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> Please change this temporary password immediately after your first login. The temporary password is formatted as DDMMYYYYHHMMSS of your approval timestamp.
      </div>
      
      <div class="section">
        <h3>Next Steps</h3>
        <ol>
          <li>Visit the college dashboard using the link below</li>
          <li>Log in with your College Code and temporary password</li>
          <li>Change your password to a secure one (8+ characters with uppercase, lowercase, digit, and special character)</li>
          <li>Set up your college profile and student enrollment information</li>
        </ol>
      </div>
      
      <div class="section">
        <a href="${dashboardUrl}" class="button">Access College Dashboard → </a>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">Copy this link if the button doesn't work: <br>${dashboardUrl}</p>
      </div>
      
      <div class="section">
        <h3>Security Recommendations</h3>
        <ul>
          <li>Change your temporary password immediately on first login</li>
          <li>Keep your College Code and password confidential</li>
          <li>Do not share login credentials with unauthorized personnel</li>
          <li>Enable two-factor authentication if available</li>
        </ul>
      </div>
      
      <p>If you have any questions or need assistance, please contact our support team.</p>
      
      <p>Best regards,<br>
      <strong>${appName}</strong><br>
      Registration Authority
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>© 2026 ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateApprovalEmailText(collegeName, universityName, programId, tempPassword, dashboardUrl, appName) {
  return `
${appName} - COLLEGE REGISTRATION APPROVED

Dear ${collegeName} Administration,

Congratulations! Your college registration has been APPROVED in the ${appName}.

APPROVAL DETAILS:
- College Name: ${collegeName}
- University: ${universityName}
- College Program ID: ${programId}

LOGIN CREDENTIALS:
- College Code: ${programId.split(' ')[5]}
- Temporary Password: ${tempPassword}

IMPORTANT: Please change this temporary password immediately after your first login.
The temporary password format is DDMMYYYYHHMMSS of your approval timestamp.

NEXT STEPS:
1. Visit: ${dashboardUrl}
2. Log in with your College Code and temporary password
3. Change your password to a secure one (8+ characters: uppercase, lowercase, digit, special char)
4. Complete your college profile and set up student enrollment

SECURITY RECOMMENDATIONS:
- Change your temporary password immediately
- Keep credentials confidential
- Don't share login details with unauthorized personnel
- Enable two-factor authentication if available

If you have questions, please contact our support team.

Best regards,
${appName}
  `;
}

function generateRejectionEmailHTML(collegeName, universityName, reason, supportEmail, appName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; }
    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { margin: 20px 0; }
    .section h3 { color: #f44336; border-bottom: 2px solid #f44336; padding-bottom: 10px; }
    .field { margin: 10px 0; line-height: 1.6; }
    .label { font-weight: bold; color: #555; }
    .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    .highlight { background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Update on Your Registration Application</h2>
    </div>
    
    <div class="content">
      <p>Dear ${collegeName} Administration,</p>
      
      <p>Thank you for applying to the ${appName}. We have reviewed your application and would like to inform you of the current status.</p>
      
      <div class="section">
        <h3>Application Details</h3>
        <div class="field">
          <span class="label">College Name:</span> ${collegeName}
        </div>
        <div class="field">
          <span class="label">University:</span> ${universityName}
        </div>
        <div class="field">
          <span class="label">Status:</span> <strong>Under Review / Pending</strong>
        </div>
      </div>
      
      <div class="highlight">
        <strong>Reason for Current Status:</strong><br>
        ${reason}
      </div>
      
      <div class="section">
        <h3>What Happens Next?</h3>
        <p>Our team is reviewing your application. We may contact you if we need additional information or clarification.</p>
        <p>You can reach us at: <strong>${supportEmail}</strong></p>
      </div>
      
      <div class="section">
        <h3>Reapplication</h3>
        <p>If you believe there's an error or would like to provide additional information for your application, please contact our support team.</p>
      </div>
      
      <p>Thank you for your patience and interest in the ${appName}.</p>
      
      <p>Best regards,<br>
      <strong>${appName}</strong><br>
      Registration Authority
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
      <p>Contact Support: ${supportEmail}</p>
      <p>© 2026 ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateRejectionEmailText(collegeName, universityName, reason, supportEmail, appName) {
  return `
${appName} - REGISTRATION STATUS UPDATE

Dear ${collegeName} Administration,

Thank you for applying to the ${appName}. We have reviewed your application and would like to inform you of its status.

APPLICATION DETAILS:
- College Name: ${collegeName}
- University: ${universityName}
- Status: Under Review / Pending

REASON FOR CURRENT STATUS:
${reason}

WHAT HAPPENS NEXT?
Our team is reviewing your application. We may contact you if we need additional information.

You can reach us at: ${supportEmail}

If you believe there's an error or would like to provide more information, please contact our support team.

Thank you for your interest in the ${appName}.

Best regards,
${appName}
Support: ${supportEmail}
  `;
}

function generatePasswordChangeEmailHTML(collegeName, appName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { margin: 20px 0; }
    .section h3 { color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 10px; }
    .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✓ Password Changed Successfully</h2>
    </div>
    
    <div class="content">
      <p>Dear ${collegeName} Administration,</p>
      
      <p>Your password has been changed successfully in the ${appName} dashboard.</p>
      
      <div class="section">
        <h3>Security Notice</h3>
        <p>If you did not request this change, please contact our support team immediately.</p>
      </div>
      
      <p>You can now log in with your new password.</p>
      
      <p>Best regards,<br>
      <strong>${appName}</strong>
      </p>
    </div>
    
    <div class="footer">
      <p>© 2026 ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generatePasswordChangeEmailText(collegeName, appName) {
  return `
${appName} - PASSWORD CHANGED SUCCESSFULLY

Dear ${collegeName} Administration,

Your password has been changed successfully in the ${appName} dashboard.

If you did not request this change, please contact our support team immediately.

You can now log in with your new password.

Best regards,
${appName}
  `;
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendPasswordChangeEmail
};
