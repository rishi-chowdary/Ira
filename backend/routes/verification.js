const express = require('express');
const { getDb } = require('../../database/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/verification/status - Get user's verification status
router.get('/status', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT digilocker_verified, digilocker_id, aadhaar_verified,
             pan_verified, education_verified, income_verified,
             verification_documents
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({
      digilocker_verified: user.digilocker_verified || false,
      digilocker_id: user.digilocker_id,
      documents: {
        aadhaar: user.aadhaar_verified || false,
        pan: user.pan_verified || false,
        education: user.education_verified || false,
        income: user.income_verified || false,
      },
      verification_documents: user.verification_documents ? JSON.parse(user.verification_documents) : null
    });
  } catch (err) {
    console.error('Get verification status error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/verification/digilocker/initiate - Initiate DigiLocker verification
router.post('/digilocker/initiate', authMiddleware, (req, res) => {
  try {
    const { aadhaar_number } = req.body;

    if (!aadhaar_number || !/^\d{12}$/.test(aadhaar_number)) {
      return res.status(400).json({ error: 'Valid Aadhaar number is required.' });
    }

    const db = getDb();

    // Check if user already has DigiLocker ID
    const user = db.prepare('SELECT digilocker_id FROM users WHERE id = ?').get(req.user.id);
    if (user.digilocker_id) {
      return res.status(400).json({ error: 'DigiLocker already linked.' });
    }

    // Generate a unique DigiLocker ID (in real implementation, this would come from DigiLocker API)
    const digilockerId = `DL${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Store the DigiLocker ID
    db.prepare(`
      UPDATE users SET digilocker_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(digilockerId, req.user.id);

    res.json({
      message: 'DigiLocker verification initiated!',
      digilocker_id: digilockerId,
      redirect_url: `https://digilocker.gov.in/public/oauth2/1/authorize?response_type=code&client_id=${process.env.DIGILOCKER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DIGILOCKER_REDIRECT_URI)}&scope=verified&state=${digilockerId}`
    });
  } catch (err) {
    console.error('Initiate DigiLocker error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/verification/digilocker/callback - Handle DigiLocker callback
router.post('/digilocker/callback', authMiddleware, (req, res) => {
  try {
    const { code, state } = req.body;
    const db = getDb();

    // Verify the state matches user's DigiLocker ID
    const user = db.prepare('SELECT digilocker_id FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.digilocker_id !== state) {
      return res.status(400).json({ error: 'Invalid verification request.' });
    }

    // In real implementation, exchange code for access token and fetch documents
    // For demo purposes, we'll simulate document verification

    const verifiedDocuments = {
      aadhaar: true,
      pan: true,
      education: true,
      income: false // Income verification requires manual review
    };

    const verificationDocuments = {
      aadhaar: {
        number: 'XXXX-XXXX-1234',
        verified_at: new Date().toISOString(),
        issuer: 'UIDAI'
      },
      pan: {
        number: 'ABCDE1234F',
        verified_at: new Date().toISOString(),
        issuer: 'Income Tax Department'
      },
      education: {
        degree: 'Bachelor of Technology',
        institution: user.college || 'Verified Institution',
        verified_at: new Date().toISOString(),
        issuer: 'University Grants Commission'
      }
    };

    // Update user verification status
    db.prepare(`
      UPDATE users SET
        digilocker_verified = 1,
        aadhaar_verified = ?,
        pan_verified = ?,
        education_verified = ?,
        income_verified = ?,
        verification_documents = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      verifiedDocuments.aadhaar ? 1 : 0,
      verifiedDocuments.pan ? 1 : 0,
      verifiedDocuments.education ? 1 : 0,
      verifiedDocuments.income ? 1 : 0,
      JSON.stringify(verificationDocuments),
      req.user.id
    );

    res.json({
      message: 'DigiLocker verification completed!',
      verified_documents: verifiedDocuments,
      documents: verificationDocuments
    });
  } catch (err) {
    console.error('DigiLocker callback error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/verification/income - Submit income verification (manual)
router.post('/income', authMiddleware, (req, res) => {
  try {
    const { income_source, monthly_income, documents } = req.body;

    if (!income_source || !monthly_income) {
      return res.status(400).json({ error: 'Income source and monthly income are required.' });
    }

    const db = getDb();

    // Get current verification documents
    const user = db.prepare('SELECT verification_documents FROM users WHERE id = ?').get(req.user.id);
    let verificationDocs = user.verification_documents ? JSON.parse(user.verification_documents) : {};

    // Add income verification
    verificationDocs.income = {
      source: income_source,
      monthly_income: monthly_income,
      documents: documents || [],
      submitted_at: new Date().toISOString(),
      status: 'pending_review' // In real app, this would be reviewed manually
    };

    // For demo, auto-approve income verification
    db.prepare(`
      UPDATE users SET
        income_verified = 1,
        verification_documents = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(verificationDocs), req.user.id);

    res.json({
      message: 'Income verification submitted successfully!',
      income_verified: true
    });
  } catch (err) {
    console.error('Income verification error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;