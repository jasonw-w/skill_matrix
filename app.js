let currentUser = null;
let currentToken = null;
let matrixData = { members: [], proficiencies: {}, skillsTree: [] };
let expandedNodes = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    currentToken = localStorage.getItem('token');
    if (!currentToken) {
        window.location.href = 'login.html';
        return;
    }

    // Decode JWT payload (simple base64 decoding for UI logic)
    try {
        const payload = JSON.parse(atob(currentToken.split('.')[1]));
        currentUser = { id: payload.id, username: payload.username, role: payload.role };
        document.getElementById('userInfo').textContent = `Logged in as: ${currentUser.username} (${currentUser.role})`;
        
        if (currentUser.role === 'admin') {
            document.getElementById('adminControls').style.display = 'flex';
        }
    } catch (e) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    await fetchData();
});

async function fetchData() {
    const matrixBody = document.getElementById('matrixBody');
    try {
        const response = await fetch('/api/matrix-data', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        matrixData = await response.json();
        
        // Auto-expand all workstations by default
        matrixData.skillsTree.forEach(ws => expandedNodes.add(ws.id));
        
        renderMatrix();
        populateSkillDropdown();
    } catch (error) {
        matrixBody.innerHTML = '<div style="padding: 2rem; color: #ef4444;">Failed to connect to database.</div>';
    }
}

function renderMatrix() {
    const matrixContainer = document.getElementById('matrixContainer');
    const matrixHeader = document.getElementById('matrixHeader');
    const matrixBody = document.getElementById('matrixBody');

    matrixContainer.style.setProperty('--member-count', matrixData.members.length);

    // Header
    let html = `<div class="grid-row"><div class="cell skill-cell">Skills Domain</div>`;
    matrixData.members.forEach(member => {
        const isMe = member.id === currentUser.id;
        html += `<div class="cell" style="${isMe ? 'color: #a5b4fc; font-weight:bold;' : ''}">${member.name}</div>`;
    });
    html += `</div>`;
    matrixHeader.innerHTML = html;

    // Body
    html = '';
    function renderNode(node, depth, parentId) {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        
        let toggleIcon = hasChildren ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>` : `<span style="width: 12px; display:inline-block"></span>`;
        let toggleClass = isExpanded ? 'expanded' : '';
        
        let rowClasses = ['grid-row', 'skill-row'];
        if (hasChildren) rowClasses.push('has-children');
        
        html += `
            <div class="${rowClasses.join(' ')}" data-id="${node.id}" data-parent="${parentId || ''}" style="--depth: ${depth};">
                <div class="cell skill-cell">
                    ${hasChildren ? `<button class="toggle-btn ${toggleClass}" data-id="${node.id}">${toggleIcon}</button>` : `<span class="toggle-btn"></span>`}
                    <span class="skill-name">${node.name}</span>
                </div>
        `;

        matrixData.members.forEach(member => {
            if (hasChildren) {
                html += `<div class="cell"></div>`;
            } else {
                let level = (matrixData.proficiencies[member.id] && matrixData.proficiencies[member.id][node.id]) || 'none';
                const isMe = member.id === currentUser.id;
                const interactiveClass = isMe ? 'interactive-dot' : '';
                html += `<div class="cell"><div class="prof-indicator ${level} ${interactiveClass}" data-skill="${node.id}" data-member="${member.id}" data-level="${level}" title="${member.name}: ${level}"></div></div>`;
            }
        });

        html += `</div>`;

        if (hasChildren) {
            node.children.forEach(child => renderNode(child, depth + 1, node.id));
        }
    }

    matrixData.skillsTree.forEach(node => renderNode(node, 0, null));
    matrixBody.innerHTML = html;
    updateVisibility();
}

// Tree visibility logic
function updateVisibility() {
    const rows = document.querySelectorAll('.skill-row');
    rows.forEach(row => {
        const parentId = row.getAttribute('data-parent');
        let isVisible = true;
        let currentParent = parentId;
        while (currentParent) {
            if (!expandedNodes.has(currentParent)) { isVisible = false; break; }
            const pRow = document.querySelector(`.skill-row[data-id="${currentParent}"]`);
            currentParent = pRow ? pRow.getAttribute('data-parent') : null;
        }
        if (isVisible) row.classList.remove('hidden');
        else row.classList.add('hidden');
    });
}

// Global Event Delegation for Matrix
document.getElementById('matrixBody').addEventListener('click', async (e) => {
    // Expand/Collapse
    const btn = e.target.closest('.toggle-btn');
    if (btn && btn.dataset.id) {
        const id = btn.dataset.id;
        if (expandedNodes.has(id)) { expandedNodes.delete(id); btn.classList.remove('expanded'); } 
        else { expandedNodes.add(id); btn.classList.add('expanded'); }
        updateVisibility();
        return;
    }

    // Proficiency Clicking
    const dot = e.target.closest('.interactive-dot');
    if (dot) {
        const memberId = dot.dataset.member;
        if (memberId !== currentUser.id) return; // double check

        const skillId = dot.dataset.skill;
        const currentLevel = dot.dataset.level;
        
        const levels = ['none', 'beginner', 'intermediate', 'expert'];
        const nextLevel = levels[(levels.indexOf(currentLevel) + 1) % levels.length];

        // Optimistic UI update
        dot.className = `prof-indicator ${nextLevel} interactive-dot`;
        dot.dataset.level = nextLevel;

        try {
            await fetch('/api/proficiencies', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                body: JSON.stringify({ skill_id: skillId, level: nextLevel })
            });
            // Update local memory so re-renders don't flash back
            if (!matrixData.proficiencies[memberId]) matrixData.proficiencies[memberId] = {};
            matrixData.proficiencies[memberId][skillId] = nextLevel;
        } catch (err) {
            console.error("Failed to update", err);
            // Revert
            dot.className = `prof-indicator ${currentLevel} interactive-dot`;
            dot.dataset.level = currentLevel;
        }
    }
});

// Modals
window.openModal = function(id) { document.getElementById(id).style.display = 'flex'; }
window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; }

function populateSkillDropdown() {
    const select = document.getElementById('skillWsId');
    select.innerHTML = matrixData.skillsTree.map(ws => `<option value="${ws.id}">${ws.name}</option>`).join('');
}

window.addWorkstation = async function() {
    const name = document.getElementById('wsName').value;
    if (!name) return;
    await fetch('/api/workstations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ name })
    });
    document.getElementById('wsName').value = '';
    closeModal('wsModal');
    fetchData();
}

window.addSkill = async function() {
    const workstation_id = document.getElementById('skillWsId').value;
    const name = document.getElementById('skillName').value;
    if (!name || !workstation_id) return;
    await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ workstation_id, name })
    });
    document.getElementById('skillName').value = '';
    closeModal('skillModal');
    fetchData();
}

// Admin functions
window.addUser = async function() {
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newUserRole').value;
    await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ username, password, role })
    });
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    closeModal('addUserModal');
    fetchData(); // to refresh members
}

window.loadUsersAndOpenModal = async function() {
    const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${currentToken}` } });
    const users = await res.json();
    const list = document.getElementById('userList');
    list.innerHTML = users.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:0.5rem; border-radius:4px;">
            <span style="color:white;">${u.username} (${u.role})</span>
            ${u.role === 'user' ? `<button class="btn btn-admin" style="padding:0.2rem 0.5rem;" onclick="promoteUser('${u.id}')">Make Admin</button>` : '<span></span>'}
        </div>
    `).join('');
    openModal('manageRolesModal');
}

window.promoteUser = async function(id) {
    await fetch(`/api/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ role: 'admin' })
    });
    loadUsersAndOpenModal(); // Refresh modal list
}
