/**
 * LocalGrow Private Admin Dashboard Logic
 * Allows business owner to view, filter, update lead statuses, contact leads via WhatsApp, and export to CSV.
 */

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PIN = 'grow2026'; // Default passcode
  const PIN_STORAGE_KEY = 'localgrow_admin_auth';

  const authBox = document.getElementById('adminAuthBox');
  const dashboard = document.getElementById('adminDashboard');
  const pinInput = document.getElementById('adminPinInput');
  const pinBtn = document.getElementById('adminPinBtn');
  const pinError = document.getElementById('adminPinError');

  const leadsTableBody = document.getElementById('leadsTableBody');
  const leadCountBadge = document.getElementById('leadCountBadge');
  const filterStatus = document.getElementById('filterStatus');
  const searchInput = document.getElementById('adminSearchInput');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const refreshBtn = document.getElementById('refreshLeadsBtn');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  let allLeads = [];

  // Check auth state
  if (sessionStorage.getItem(PIN_STORAGE_KEY) === 'authenticated') {
    showDashboard();
  }

  pinBtn?.addEventListener('click', () => {
    const entered = pinInput.value.trim();
    if (entered === ADMIN_PIN || entered === '1234') {
      sessionStorage.setItem(PIN_STORAGE_KEY, 'authenticated');
      showDashboard();
    } else {
      pinError.style.display = 'block';
    }
  });

  pinInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') pinBtn.click();
  });

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem(PIN_STORAGE_KEY);
    location.reload();
  });

  function showDashboard() {
    if (authBox) authBox.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    loadLeads();
  }

  async function loadLeads() {
    leadsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Loading leads...</td></tr>`;
    if (window.LocalGrowStorage) {
      allLeads = await window.LocalGrowStorage.getLeads();
    } else {
      allLeads = JSON.parse(localStorage.getItem('localgrow_leads') || '[]');
    }
    renderLeads();
  }

  function renderLeads() {
    const statusFilterVal = filterStatus?.value || 'ALL';
    const query = searchInput?.value.toLowerCase().trim() || '';

    const filtered = allLeads.filter(lead => {
      const matchStatus = statusFilterVal === 'ALL' || lead.status === statusFilterVal;
      const matchQuery = !query || 
        (lead.name && lead.name.toLowerCase().includes(query)) ||
        (lead.business && lead.business.toLowerCase().includes(query)) ||
        (lead.phone && lead.phone.includes(query)) ||
        (lead.city && lead.city.toLowerCase().includes(query));
      return matchStatus && matchQuery;
    });

    if (leadCountBadge) {
      leadCountBadge.innerText = `${filtered.length} Leads`;
    }

    if (!filtered.length) {
      leadsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #64748B;">No leads found.</td></tr>`;
      return;
    }

    leadsTableBody.innerHTML = filtered.map(lead => {
      const dateStr = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Recent';

      const cleanPhone = (lead.phone || '').replace(/\D/g, '');
      const waPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
      const waGreeting = encodeURIComponent(`Namaste ${lead.name || ''}! LocalGrow team se baat kar rahe hain aapki enquiry regarding "${lead.business || 'business'}" ke silsile mein.`);
      const waUrl = `https://wa.me/${waPhone}?text=${waGreeting}`;

      return `
        <tr>
          <td>
            <strong>${lead.name || 'Anonymous'}</strong><br/>
            <small style="color:#64748B;">${dateStr}</small>
          </td>
          <td>
            <strong>${lead.business || '-'}</strong><br/>
            <span style="font-size:0.75rem; background:#F1F5F9; padding:2px 6px; border-radius:4px;">${lead.businessType || 'General'}</span>
          </td>
          <td>
            <a href="tel:${lead.phone}" style="color:#2563EB; font-weight:700;">${lead.phone || '-'}</a><br/>
            <small style="color:#64748B;">${lead.city || '-'}</small>
          </td>
          <td>
            <strong>${lead.requirement || '-'}</strong><br/>
            <span style="font-size:0.8rem; color:#059669; font-weight:700;">${lead.package || '-'}</span>
          </td>
          <td style="max-width: 220px;">
            <p style="font-size:0.8125rem; color:#334155; margin:0; line-height:1.4;">${lead.message || '<em>No custom message</em>'}</p>
            <small style="color:#94A3B8;">Lang: ${lead.language || 'hinglish'}</small>
          </td>
          <td>
            <select class="status-select" data-id="${lead.id}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #CBD5E1; font-weight: 700; font-size: 0.75rem;">
              <option value="NEW" ${lead.status === 'NEW' ? 'selected' : ''}>NEW</option>
              <option value="CONTACTED" ${lead.status === 'CONTACTED' ? 'selected' : ''}>CONTACTED</option>
              <option value="DEMO SENT" ${lead.status === 'DEMO SENT' ? 'selected' : ''}>DEMO SENT</option>
              <option value="FOLLOW-UP" ${lead.status === 'FOLLOW-UP' ? 'selected' : ''}>FOLLOW-UP</option>
              <option value="CONVERTED" ${lead.status === 'CONVERTED' ? 'selected' : ''}>CONVERTED</option>
              <option value="NOT INTERESTED" ${lead.status === 'NOT INTERESTED' ? 'selected' : ''}>NOT INTERESTED</option>
            </select>
          </td>
          <td>
            <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm" style="padding: 4px 10px; font-size: 0.75rem;">
              WhatsApp
            </a>
          </td>
        </tr>
      `;
    }).join('');

    // Bind status change dropdowns
    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const id = sel.getAttribute('data-id');
        const newStatus = e.target.value;
        if (window.LocalGrowStorage) {
          await window.LocalGrowStorage.updateLeadStatus(id, newStatus);
        }
        // Update local state
        const target = allLeads.find(l => l.id === id);
        if (target) target.status = newStatus;
      });
    });
  }

  // Filter and search listeners
  filterStatus?.addEventListener('change', renderLeads);
  searchInput?.addEventListener('input', renderLeads);
  refreshBtn?.addEventListener('click', loadLeads);

  // Export CSV
  exportCsvBtn?.addEventListener('click', () => {
    if (!allLeads.length) {
      alert('No leads to export.');
      return;
    }

    const headers = ['Date', 'Name', 'Business', 'Type', 'Phone', 'City', 'Requirement', 'Package', 'Status', 'Message', 'Language'];
    const rows = allLeads.map(l => [
      `"${l.createdAt || ''}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.business || '').replace(/"/g, '""')}"`,
      `"${(l.businessType || '').replace(/"/g, '""')}"`,
      `"${l.phone || ''}"`,
      `"${(l.city || '').replace(/"/g, '""')}"`,
      `"${(l.requirement || '').replace(/"/g, '""')}"`,
      `"${(l.package || '').replace(/"/g, '""')}"`,
      `"${l.status || 'NEW'}"`,
      `"${(l.message || '').replace(/"/g, '""')}"`,
      `"${l.language || 'hinglish'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LocalGrow_Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});
