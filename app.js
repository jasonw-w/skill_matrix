let currentUser = null;
let matrixData = { members: [], proficiencies: {}, skillsTree: [] };
let flatSkills = [];

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
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = 'login.html';
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
                    flatSkills.push({ ...skill, wsName: ws.name });
                });
            } else {
                // Keep the workstation visible even if it has no skills
                flatSkills.push({ id: `empty-${ws.id}`, name: 'No skills added', wsName: ws.name, isEmpty: true });
            }
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

    // Prepare grid layout
    let html = `<div class="matrix-table" style="--skill-count: ${flatSkills.length}">`;
    
    // Row 1: Super Headers (Workstations)
    html += `<div class="matrix-row">
        <div class="corner-cell" style="grid-row: span 2;">Employee Name</div>`;
    
    let currentWs = null;
    let wsSpan = 0;
    matrixData.skillsTree.forEach(ws => {
        const span = (ws.children && ws.children.length > 0) ? ws.children.length : 1;
        html += `<div class="ws-header" style="grid-column: span ${span}" title="${ws.name}">${ws.name}</div>`;
    });
    html += `</div>`; // End Row 1

    // Row 2: Skill Vertical Headers
    html += `<div class="matrix-row">`;
    flatSkills.forEach(skill => {
        html += `<div class="skill-header" title="${skill.name}">${skill.name}</div>`;
    });
    html += `</div>`; // End Row 2

    // Member Rows
    matrixData.members.forEach(member => {
        html += `<div class="matrix-row">
            <div class="member-cell">${member.name}</div>`;
        
        flatSkills.forEach(skill => {
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
            headers: { 'Content-Type': 'application/json' },
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

window.addWorkstation = () => alert('Cloudflare API migration in progress. This feature will be available shortly.');
window.addSkill = () => alert('Cloudflare API migration in progress. This feature will be available shortly.');
window.addUser = () => alert('Cloudflare API migration in progress. This feature will be available shortly.');
window.loadUsersAndOpenModal = () => alert('Cloudflare API migration in progress. This feature will be available shortly.');
