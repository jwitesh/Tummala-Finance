const API_URL = 'http://localhost:5000';

// 1. Security Check
window.onload = () => {
    const session = localStorage.getItem('tummala_session');
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    const user = JSON.parse(session);
    if (!user.isAdmin) {
        alert("Unauthorized Area. Redirecting to Public Vault.");
        window.location.href = 'index.html';
        return;
    }

    loadApplications();
};

document.getElementById('logoutAdminBtn').addEventListener('click', () => {
    localStorage.removeItem('tummala_session');
    window.location.href = 'index.html';
});

// 2. Fetch & Render Applications with FULL DETAILS
async function loadApplications() {
    try {
        const res = await fetch(`${API_URL}/api/loans/all`);
        const apps = await res.json();
        
        document.getElementById('totalCount').innerText = apps.length;
        const grid = document.getElementById('applicationsGrid');
        
        if (apps.length === 0) {
            grid.innerHTML = '<p style="color: #94a3b8;">No pending applications found.</p>';
            return;
        }

        grid.innerHTML = ''; 
        
        apps.reverse().forEach(app => {
            const card = document.createElement('div');
            card.className = 'app-card';
            
            card.innerHTML = `
                <div class="app-header">
                    <span class="app-name">${app.name}</span>
                    <span class="app-id">#${app.id}</span>
                </div>
                
                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="color: var(--gold); font-size: 0.8rem; text-transform: uppercase; margin-bottom: 5px;">Client Profile</p>
                    <div class="app-detail"><strong><i class="fa-solid fa-user"></i> Age:</strong> ${app.age} Years</div>
                    <div class="app-detail"><strong><i class="fa-brands fa-whatsapp"></i> Phone:</strong> +91 ${app.phone}</div>
                    <div class="app-detail"><strong><i class="fa-solid fa-location-dot"></i> Address:</strong> ${app.address} (PIN: ${app.pincode})</div>
                </div>

                <div style="border-top: 1px dashed rgba(212, 175, 55, 0.3); padding-top: 15px; margin-bottom: 10px;">
                    <div class="app-detail"><strong><i class="fa-solid fa-sack-dollar"></i> Requested:</strong> <span style="color:#25D366; font-size: 1.1rem;">₹${parseInt(app.amount).toLocaleString('en-IN')}</span></div>
                    <div class="app-detail"><strong><i class="fa-solid fa-briefcase"></i> Asset Type:</strong> ${app.purpose}</div>
                    <div class="app-detail" style="margin-top: 10px;"><strong>Status:</strong> <span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 5px; font-size: 0.8rem;">${app.status}</span></div>
                </div>
                <div class="action-row">
                    <select class="status-select" id="status-${app.id}">
                        <option value="Pending Review">Pending Review</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Disbursed">Disbursed</option>
                    </select>
                    <button class="btn-update" onclick="updateStatus(${app.id})">Update Client</button>
                </div>
                
                <div class="action-row">
                    <select class="status-select" id="status-${app.id}">
                        <option value="Pending Review">Pending Review</option>
                        <option value="Approved - Processing">Approve Loan</option>
                        <option value="Rejected">Reject Loan</option>
                        <option value="Disbursed">Disbursed</option>
                    </select>
                    <button class="btn-update" onclick="updateStatus(${app.id})">Update Client</button>
                </div>
            `;
            grid.appendChild(card);
            document.getElementById(`status-${app.id}`).value = app.status;
        });

    } catch (err) {
        document.getElementById('applicationsGrid').innerHTML = '<p style="color: red;">Failed to connect to the secure server.</p>';
    }
}

// 3. Update Status
window.updateStatus = async (id) => {
    const newStatus = document.getElementById(`status-${id}`).value;
    try {
        const res = await fetch(`${API_URL}/api/loans/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });

        if (res.ok) {
            alert("Client notified via WhatsApp!");
            loadApplications(); 
        }
    } catch (err) { alert("Server connection failed."); }
};