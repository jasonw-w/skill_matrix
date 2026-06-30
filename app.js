let currentUser = null;
let matrixData = { members: [], proficiencies: {}, skillsTree: [] };
let flatSkills = [];
let searchTerm = '';
let currentWsFilter = 'all';
let sortBy = 'name';

// Mapping DB strings to 1-4 levels
const LEVEL_MAP = {
    'none': { num: '', class: 'level-none', next: 'beginner' },
    'beginner': { num: '1', class: 'level-1', next: 'intermediate' },
    'intermediate': { num: '2', class: 'level-2', next: 'advanced' },
    'advanced': { num: '3', class: 'level-3', next: 'expert' },
    'expert': { num: '4', class: 'level-4', next: 'none' }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const sessionRes = await fetch('/api/session');
        if (!sessionRes.ok) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = await sessionRes.json();
        const displayName = currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username;
        document.getElementById('userInfo').textContent = `Logged in as: ${displayName} (${currentUser.role})`;
        
        if (currentUser.role === 'admin') {
            document.getElementById('adminControls').style.display = 'flex';
        }
    } catch (e) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': 'true' } });
        window.location.href = 'login.html';
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderMatrix();
    });

    document.getElementById('wsFilterSelect').addEventListener('change', (e) => {
        currentWsFilter = e.target.value;
        renderMatrix();
    });

    document.getElementById('sortSelect').addEventListener('change', (e) => {
        sortBy = e.target.value;
        renderMatrix();
    });

    await fetchData();
    renderMatrix();
});

async function fetchData() {
    try {
        const res = await fetch('/api/matrix-data');
        if (!res.ok) throw new Error('Failed to fetch data');
        matrixData = await res.json();
        
        // Flatten skills for columns
        flatSkills = [];
        matrixData.skillsTree.forEach(ws => {
            if (ws.children && ws.children.length > 0) {
                ws.children.forEach(skill => {
                    flatSkills.push({ ...skill, wsName: ws.name, wsId: ws.id });
                });
            } else {
                // Keep the workstation visible even if it has no skills
                flatSkills.push({ id: `empty-${ws.id}`, name: 'No skills added', wsName: ws.name, wsId: ws.id, isEmpty: true });
            }
        });

        const wsSelect = document.getElementById('wsFilterSelect');
        wsSelect.innerHTML = '<option value="all">All Workstations</option>';
        matrixData.skillsTree.forEach(ws => {
            wsSelect.innerHTML += `<option value="${ws.id}">${ws.name}</option>`;
        });
    } catch (e) {
        document.getElementById('matrixContainer').innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error: ${e.message}</div>`;
    }
}

function renderMatrix() {
    const container = document.getElementById('matrixContainer');
    
    if (flatSkills.length === 0) {
        container.innerHTML = '<div style="padding: 2rem;">No skills defined yet.</div>';
        return;
    }

    // Apply WS filter
    const visibleSkills = currentWsFilter === 'all' 
        ? flatSkills 
        : flatSkills.filter(s => s.wsId === currentWsFilter);

    if (visibleSkills.length === 0) {
        container.innerHTML = '<div style="padding: 2rem;">No skills found for this Workstation.</div>';
        return;
    }

    // Prepare grid layout
    let html = `<div class="matrix-table" style="--skill-count: ${visibleSkills.length}">`;
    
    // Row 1: Super Headers (Workstations)
    html += `<div class="matrix-row">
        <div class="corner-cell" style="grid-row: span 2;">Team Member Name</div>`;
    
    const visibleWsList = currentWsFilter === 'all' 
        ? matrixData.skillsTree 
        : matrixData.skillsTree.filter(w => w.id === currentWsFilter);

    visibleWsList.forEach(ws => {
        const span = (ws.children && ws.children.length > 0) ? ws.children.length : 1;
        html += `<div class="ws-header" style="grid-column: span ${span}" title="${ws.name}">${ws.name}</div>`;
    });
    html += `</div>`; // End Row 1

    // Row 2: Skill Vertical Headers
    html += `<div class="matrix-row">`;
    visibleSkills.forEach(skill => {
        html += `<div class="skill-header" title="${skill.name}">${skill.name}</div>`;
    });
    html += `</div>`; // End Row 2

    // Filter and Sort Members
    let displayMembers = matrixData.members;
    if (searchTerm) {
        const terms = searchTerm.split(',').map(t => t.trim()).filter(t => t);
        displayMembers = displayMembers.filter(m => {
            const lowerName = m.name.toLowerCase();
            return terms.some(t => lowerName.includes(t));
        });
    }

    displayMembers.sort((a, b) => {
        if (sortBy === 'score') {
            const getScore = (memberId) => {
                let score = 0;
                visibleSkills.forEach(s => {
                    if (!s.isEmpty) {
                        const level = (matrixData.proficiencies[memberId] && matrixData.proficiencies[memberId][s.id]) || 'none';
                        score += (parseInt(LEVEL_MAP[level]?.num) || 0);
                    }
                });
                return score;
            };
            return getScore(b.id) - getScore(a.id);
        } else {
            return a.name.localeCompare(b.name);
        }
    });

    // Member Rows
    displayMembers.forEach(member => {
        html += `<div class="matrix-row">
            <div class="member-cell">${member.name}</div>`;
        
        visibleSkills.forEach(skill => {
            if (skill.isEmpty) {
                html += `<div class="data-cell"><div class="prof-indicator level-none"></div></div>`;
                return;
            }

            const level = (matrixData.proficiencies[member.id] && matrixData.proficiencies[member.id][skill.id]) || 'none';
            const mapped = LEVEL_MAP[level] || LEVEL_MAP['none'];
            const isClickable = (currentUser.role === 'admin' || currentUser.id === member.id);
            
            html += `
                <div class="data-cell">
                    <div class="prof-indicator ${mapped.class}" 
                         data-member-id="${member.id}" 
                         data-skill-id="${skill.id}" 
                         data-level="${level}"
                         ${isClickable ? 'onclick="toggleProficiency(this)"' : 'style="cursor: default;"'}
                         title="${skill.name}"
                    >
                        ${mapped.num}
                    </div>
                </div>`;
        });
        html += `</div>`; // End member row
    });

    html += `</div>`; // End matrix-table
    container.innerHTML = html;
}

window.toggleProficiency = async (element) => {
    const memberId = element.dataset.memberId;
    const skillId = element.dataset.skillId;
    const currentLevel = element.dataset.level;
    
    // Safety check - though UI hides pointer events, good to verify logic
    if (currentUser.role !== 'admin' && currentUser.id !== memberId) {
        return;
    }

    const nextLevel = LEVEL_MAP[currentLevel].next;
    const mapped = LEVEL_MAP[nextLevel];

    // Optimistic UI update
    element.dataset.level = nextLevel;
    element.className = `prof-indicator ${mapped.class}`;
    element.textContent = mapped.num;

    // Update state
    if (!matrixData.proficiencies[memberId]) matrixData.proficiencies[memberId] = {};
    matrixData.proficiencies[memberId][skillId] = nextLevel;

    try {
        await fetch('/api/proficiency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'true' },
            body: JSON.stringify({ memberId, skillId, level: nextLevel })
        });
    } catch (e) {
        console.error('Failed to update proficiency');
        // Revert UI on failure
        element.dataset.level = currentLevel;
        const revertMapped = LEVEL_MAP[currentLevel];
        element.className = `prof-indicator ${revertMapped.class}`;
        element.textContent = revertMapped.num;
    }
};

window.exportToCSV = () => {
    let csv = 'Team Member Name,';
    
    // Headers
    csv += flatSkills.map(s => `"${s.wsName} - ${s.name}"`).join(',') + '\\n';

    // Rows
    matrixData.members.forEach(member => {
        let row = `"${member.name}",`;
        let levels = flatSkills.map(skill => {
            if (skill.isEmpty) return 'N/A';
            const level = (matrixData.proficiencies[member.id] && matrixData.proficiencies[member.id][skill.id]) || 'none';
            return LEVEL_MAP[level]?.num || '';
        });
        row += levels.join(',');
        csv += row + '\\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'skill_matrix_export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Modal Handling
window.openModal = (id) => {
    document.getElementById(id).style.display = 'flex';
    // Populate dropdowns if needed
    if (id === 'skillModal') {
        const select = document.getElementById('skillWsId');
        select.innerHTML = '';
        matrixData.skillsTree.forEach(ws => {
            select.innerHTML += `<option value="${ws.id}">${ws.name}</option>`;
        });
    }
};

window.closeModal = (id) => {
    document.getElementById(id).style.display = 'none';
};

window.addWorkstation = () => openModal('wsModal');

window.submitWorkstation = async () => {
    const name = document.getElementById('wsName').value.trim();
    if (!name) return;

    try {
        const res = await fetch('/api/admin/workstations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'true' },
            body: JSON.stringify({ name })
        });
        
        if (res.ok) location.reload();
        else alert('Error: ' + (await res.json()).error);
    } catch (e) {
        alert('Failed to connect to server.');
    }
};

window.addSkill = () => openModal('skillModal');

window.submitSkill = async () => {
    const wsId = document.getElementById('skillWsId').value;
    const name = document.getElementById('skillName').value.trim();
    if (!wsId || !name) return;

    try {
        const res = await fetch('/api/admin/skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'true' },
            body: JSON.stringify({ name, workstation_id: wsId })
        });
        
        if (res.ok) location.reload();
        else alert('Error: ' + (await res.json()).error);
    } catch (e) {
        alert('Failed to connect to server.');
    }
};

window.removeSkill = () => {
    const wsSelect = document.getElementById('removeSkillWsId');
    wsSelect.innerHTML = '<option value="">Select Workstation</option>';
    matrixData.skillsTree.forEach(ws => {
        wsSelect.innerHTML += `<option value="${ws.id}">${ws.name}</option>`;
    });
    document.getElementById('removeSkillId').innerHTML = '';
    openModal('removeSkillModal');
};

window.populateRemoveSkillDropdown = () => {
    const wsId = document.getElementById('removeSkillWsId').value;
    const skillSelect = document.getElementById('removeSkillId');
    skillSelect.innerHTML = '';
    if (!wsId) return;

    const ws = matrixData.skillsTree.find(w => w.id === wsId);
    if (!ws || !ws.children || ws.children.length === 0) {
        skillSelect.innerHTML = '<option value="">No skills found</option>';
        return;
    }

    ws.children.forEach(skill => {
        skillSelect.innerHTML += `<option value="${skill.id}">${skill.name}</option>`;
    });
};

window.submitRemoveSkill = async () => {
    const skillId = document.getElementById('removeSkillId').value;
    if (!skillId) return;

    if (!confirm(`Are you sure you want to completely remove this skill? This will delete all associated proficiency records for all team members.`)) return;

    try {
        const res = await fetch('/api/admin/skills', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'true' },
            body: JSON.stringify({ skill_id: skillId })
        });
        
        if (res.ok) location.reload();
        else alert('Error: ' + (await res.json()).error);
    } catch (e) {
        alert('Failed to connect to server.');
    }
};

window.addUser = () => openModal('addUserModal');

window.submitAddUser = async () => {
    const firstName = document.getElementById('newFirstName').value.trim();
    const lastName = document.getElementById('newLastName').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const role = document.getElementById('newUserRole').value;

    if (!firstName || !lastName) {
        alert('First and Last name are required');
        return;
    }

    try {
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'true' },
            body: JSON.stringify({ email, firstName, lastName, role })
        });
        
        if (res.ok) location.reload();
        else alert('Error: ' + (await res.json()).error);
    } catch (e) {
        alert('Failed to connect to server.');
    }
};

window.loadUsersAndOpenModal = async () => {
    try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Unauthorized');
        const users = await res.json();
        
        const container = document.getElementById('userList');
        container.innerHTML = '';
        users.forEach(u => {
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius:4px;">
                    <span style="color:white;">${u.email}</span>
                    <select onchange="updateUserRole('${u.id}', this.value)" style="padding:0.25rem; border-radius:4px; background:rgba(0,0,0,0.4); color:white; border:1px solid var(--border-glass);">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            `;
        });
        openModal('manageRolesModal');
    } catch (e) {
        alert('Failed to load users.');
    }
};

window.updateUserRole = async (userId, role) => {
    try {
        const updateRes = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'true' },
            body: JSON.stringify({ userId, role })
        });

        if (!updateRes.ok) {
            alert('Failed to update role.');
        }
    } catch (e) {
        alert('Failed to update role.');
    }
};
