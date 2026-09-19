/**
 * LocalGrow Firebase & Lead Storage Adapter
 * Secure client-side Firestore integration with resilient localStorage fallback.
 * Works seamlessly on GitHub Pages without requiring a paid server.
 */

window.LOCALGROW_FIREBASE_CONFIG = {
  // Replace these placeholders with your actual Firebase Web App credentials when ready:
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "localgrow-app.firebaseapp.com",
  projectId: "localgrow-app",
  storageBucket: "localgrow-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

(function () {
  let db = null;
  let isFirebaseReady = false;

  // Check if credentials are still placeholder
  const isConfigured = 
    window.LOCALGROW_FIREBASE_CONFIG && 
    window.LOCALGROW_FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY" &&
    window.LOCALGROW_FIREBASE_CONFIG.projectId !== "localgrow-app";

  // Try initializing Firebase SDK if scripts are loaded and config is live
  if (isConfigured && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.LOCALGROW_FIREBASE_CONFIG);
      }
      db = firebase.firestore();
      isFirebaseReady = true;
      console.log('[LocalGrow] Firebase Firestore connected successfully.');
    } catch (err) {
      console.warn('[LocalGrow] Firebase initialization skipped or failed:', err);
    }
  } else {
    console.log('[LocalGrow] Running in resilient LocalStorage fallback mode (Ready for live Firebase keys).');
  }

  // Rate-limiting timestamp cache to prevent form spamming
  let lastSubmissionTime = 0;
  const RATE_LIMIT_MS = 10000; // 10 seconds

  /**
   * Basic XSS and input sanitizer
   */
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .trim();
  }

  /**
   * Save a lead either to Firestore or localStorage
   */
  async function saveLead(data) {
    const now = Date.now();
    if (now - lastSubmissionTime < RATE_LIMIT_MS) {
      throw new Error('Please wait a few seconds before submitting again.');
    }

    // Minimum data validation
    if (!data.name || !data.phone) {
      throw new Error('Name and phone number are required.');
    }

    const cleanLead = {
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: sanitize(data.name),
      business: sanitize(data.business || 'Not Specified'),
      businessType: sanitize(data.businessType || 'General'),
      phone: sanitize(data.phone),
      city: sanitize(data.city || 'Not Specified'),
      requirement: sanitize(data.requirement || 'Not Specified'),
      package: sanitize(data.package || 'Not Specified'),
      message: sanitize(data.message || ''),
      language: sanitize(data.language || 'hinglish'),
      status: 'NEW', // NEW, CONTACTED, DEMO SENT, FOLLOW-UP, CONVERTED, NOT INTERESTED
      source: sanitize(data.source || 'website_quote_wizard'),
      createdAt: new Date().toISOString()
    };

    lastSubmissionTime = now;

    // 1. Always save in localStorage backup
    try {
      const localLeads = JSON.parse(localStorage.getItem('localgrow_leads') || '[]');
      localLeads.unshift(cleanLead);
      // Keep up to 200 leads locally
      if (localLeads.length > 200) localLeads.pop();
      localStorage.setItem('localgrow_leads', JSON.stringify(localLeads));
      window.dispatchEvent(new CustomEvent('leadAdded', { detail: cleanLead }));
    } catch (e) {
      console.error('LocalStorage lead write failed:', e);
    }

    // 2. If Firebase Firestore is connected, persist to remote cloud
    if (isFirebaseReady && db) {
      try {
        await db.collection('enquiries').doc(cleanLead.id).set(cleanLead);
        console.log('[LocalGrow] Lead synced to Firebase Firestore.');
      } catch (err) {
        console.warn('[LocalGrow] Firestore sync failed, retained in local storage:', err);
      }
    }

    return cleanLead;
  }

  /**
   * Retrieve all stored leads (for admin panel)
   */
  async function getLeads() {
    if (isFirebaseReady && db) {
      try {
        const snapshot = await db.collection('enquiries').orderBy('createdAt', 'desc').limit(100).get();
        const leads = [];
        snapshot.forEach(doc => leads.push(doc.data()));
        return leads;
      } catch (err) {
        console.warn('[LocalGrow] Firestore read failed, falling back to localStorage:', err);
      }
    }

    // Fallback: load from localStorage
    try {
      return JSON.parse(localStorage.getItem('localgrow_leads') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Update lead status (for admin panel)
   */
  async function updateLeadStatus(leadId, newStatus) {
    // 1. Update in localStorage
    try {
      const localLeads = JSON.parse(localStorage.getItem('localgrow_leads') || '[]');
      const target = localLeads.find(l => l.id === leadId);
      if (target) {
        target.status = newStatus;
        localStorage.setItem('localgrow_leads', JSON.stringify(localLeads));
      }
    } catch (e) {}

    // 2. Update in Firestore if available
    if (isFirebaseReady && db) {
      try {
        await db.collection('enquiries').doc(leadId).update({ status: newStatus });
      } catch (err) {
        console.warn('[LocalGrow] Firestore status update failed:', err);
      }
    }
    return true;
  }

  // Export globally
  window.LocalGrowStorage = {
    saveLead,
    getLeads,
    updateLeadStatus,
    isFirebaseReady: () => isFirebaseReady
  };
})();
