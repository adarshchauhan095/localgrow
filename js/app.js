/**
 * LocalGrow Application Logic
 * Interactive quote wizard, mobile menu, toast notifications, and WhatsApp pre-fill.
 */

document.addEventListener('DOMContentLoaded', () => {
  const WHATSAPP_NUMBER = '917015027886'; // +91 7015027886
  const PHONE_NUMBER = '+917015027886';

  // --- 1. Sticky Header Scroll Effect ---
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }, { passive: true });

  // --- 2. Mobile Navigation Drawer ---
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileDrawer = document.querySelector('.mobile-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  function toggleMobileMenu() {
    const isOpen = mobileDrawer?.classList.contains('open');
    if (isOpen) {
      mobileDrawer?.classList.remove('open');
      menuToggle?.classList.remove('active');
      document.body.style.overflow = '';
    } else {
      mobileDrawer?.classList.add('open');
      menuToggle?.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  menuToggle?.addEventListener('click', toggleMobileMenu);

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileDrawer?.classList.remove('open');
      menuToggle?.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // --- 3. Toast Notifications ---
  function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
  window.showToast = showToast;

  // --- 4. Interactive 4-Step Quote Wizard ---
  const wizardData = {
    businessType: '',
    requirement: '',
    package: '',
    name: '',
    business: '',
    phone: '',
    city: '',
    message: ''
  };

  let currentStep = 1;
  const totalSteps = 4;

  const steps = document.querySelectorAll('.wizard-step');
  const progressNodes = document.querySelectorAll('.progress-step-node');
  const progressBarFill = document.querySelector('.progress-bar-fill');
  const prevBtn = document.getElementById('wizardPrevBtn');
  const nextBtn = document.getElementById('wizardNextBtn');
  const submitBtn = document.getElementById('wizardSubmitBtn');
  const formSuccess = document.getElementById('wizardSuccessState');

  function updateWizardUI() {
    // Show current step container
    steps.forEach(step => {
      const stepNum = parseInt(step.getAttribute('data-step'), 10);
      if (stepNum === currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // Update progress nodes
    progressNodes.forEach((node, index) => {
      const stepNum = index + 1;
      if (stepNum === currentStep) {
        node.classList.add('active');
        node.classList.remove('completed');
      } else if (stepNum < currentStep) {
        node.classList.remove('active');
        node.classList.add('completed');
      } else {
        node.classList.remove('active', 'completed');
      }
    });

    // Update progress bar width
    if (progressBarFill) {
      const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
      progressBarFill.style.width = `${Math.max(percentage, 10)}%`;
    }

    // Toggle Back / Next / Submit buttons
    if (prevBtn) {
      prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
    }
    if (nextBtn) {
      nextBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
    }
    if (submitBtn) {
      submitBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
    }
  }

  // Handle Option Card selection in Step 1, 2, 3
  document.querySelectorAll('.option-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parentStep = btn.closest('.wizard-step');
      const stepNum = parseInt(parentStep.getAttribute('data-step'), 10);
      const value = btn.getAttribute('data-value');

      // Clear previous active in same step
      parentStep.querySelectorAll('.option-card-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      if (stepNum === 1) wizardData.businessType = value;
      if (stepNum === 2) wizardData.requirement = value;
      if (stepNum === 3) wizardData.package = value;

      // Auto-advance to next step smoothly
      if (currentStep < totalSteps) {
        setTimeout(() => {
          currentStep++;
          updateWizardUI();
        }, 180);
      }
    });
  });

  // Next Button click
  nextBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentStep === 1 && !wizardData.businessType) {
      showToast(window.i18n ? window.i18n.t('quote.step1Label') : 'Please select your business type', 'warning');
      return;
    }
    if (currentStep === 2 && !wizardData.requirement) {
      showToast(window.i18n ? window.i18n.t('quote.step2Label') : 'Please select your requirement', 'warning');
      return;
    }
    if (currentStep === 3 && !wizardData.package) {
      showToast(window.i18n ? window.i18n.t('quote.step3Label') : 'Please select a package/budget', 'warning');
      return;
    }

    if (currentStep < totalSteps) {
      currentStep++;
      updateWizardUI();
    }
  });

  // Prev Button click
  prevBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentStep > 1) {
      currentStep--;
      updateWizardUI();
    }
  });

  // Submit Lead Form
  const leadForm = document.getElementById('leadContactForm');
  leadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('leadName')?.value.trim();
    const business = document.getElementById('leadBusiness')?.value.trim();
    const phone = document.getElementById('leadPhone')?.value.trim();
    const city = document.getElementById('leadCity')?.value.trim();
    const message = document.getElementById('leadMessage')?.value.trim();

    if (!name || !phone || !business) {
      showToast(window.i18n ? window.i18n.t('quote.errorMsg') : 'Please fill all required fields.', 'warning');
      return;
    }

    wizardData.name = name;
    wizardData.business = business;
    wizardData.phone = phone;
    wizardData.city = city;
    wizardData.message = message;
    wizardData.language = window.i18n ? window.i18n.getLang() : 'hinglish';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = window.i18n ? window.i18n.t('quote.submitting') : 'Submitting...';
    }

    try {
      if (window.LocalGrowStorage) {
        await window.LocalGrowStorage.saveLead(wizardData);
      }

      // Prepare WhatsApp message
      const isHinglish = wizardData.language === 'hinglish';
      const waText = isHinglish
        ? `Namaste LocalGrow Team! Mera naam *${name}* hai. Mera business *${business}* (${city || 'Mohali'}) mein hai. Mujhe *${wizardData.businessType || 'General'}* ke liye *${wizardData.requirement || 'Website'}* chahiye. Package: *${wizardData.package || 'Discussion'}*. Please contact karein.`
        : `Hello LocalGrow Team! My name is *${name}*. My business is *${business}* located in *${city || 'Mohali'}*. I need *${wizardData.requirement || 'Website'}* for my *${wizardData.businessType || 'Business'}*. Package: *${wizardData.package || 'Discussion'}*. Please share details.`;

      const encodedMsg = encodeURIComponent(waText);
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMsg}`;

      // Update WhatsApp direct button in success state
      const directWaBtn = document.getElementById('wizardDirectWhatsAppBtn');
      if (directWaBtn) {
        directWaBtn.href = waUrl;
      }

      // Hide wizard steps and show success card
      document.querySelector('.wizard-form-body').style.display = 'none';
      if (formSuccess) {
        formSuccess.style.display = 'block';
      }

      showToast('Thank you! Your details have been submitted.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit. Please try again or WhatsApp us directly.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = window.i18n ? window.i18n.t('quote.submitBtn') : 'Submit My Requirement 🚀';
      }
    }
  });

  // --- 5. Pricing Plan CTAs Quick Select ---
  document.querySelectorAll('[data-select-plan]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const planVal = btn.getAttribute('data-select-plan');
      wizardData.package = planVal;

      // Mark in Step 3
      const step3 = document.querySelector('.wizard-step[data-step="3"]');
      if (step3) {
        step3.querySelectorAll('.option-card-btn').forEach(b => {
          if (b.getAttribute('data-value') === planVal) {
            b.classList.add('selected');
          } else {
            b.classList.remove('selected');
          }
        });
      }

      // Scroll smoothly to quote section and jump to step 3 or 4
      const quoteSec = document.getElementById('quote-section');
      if (quoteSec) {
        quoteSec.scrollIntoView({ behavior: 'smooth' });
        currentStep = 3;
        updateWizardUI();
      }
    });
  });

  // --- 6. Quick Contact Requirement Pills ---
  const quickPills = document.querySelectorAll('.quick-pill');
  let selectedQuickService = 'Website Banwani Hai';

  function updateQuickWhatsAppLink() {
    const waQuickBtn = document.getElementById('quickWhatsAppBtn');
    if (waQuickBtn) {
      const msg = `Namaste LocalGrow! Mujhe apne business ke liye *${selectedQuickService}* ke baare mein jaankari chahiye.`;
      waQuickBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    }
  }

  quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      quickPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedQuickService = pill.innerText.trim();
      updateQuickWhatsAppLink();
    });
  });
  updateQuickWhatsAppLink();

  // Set Direct Call buttons
  document.querySelectorAll('.action-call-btn').forEach(b => {
    b.setAttribute('href', `tel:${PHONE_NUMBER}`);
  });

  // Initialize Wizard UI
  updateWizardUI();
});
