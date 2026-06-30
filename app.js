// Global State
let skills = [];
let users = [];
let msalInstance;
let accountId = "";
let graphAccessToken = "";

// Initialize Microsoft Teams SDK and MSAL
async function initializeApp() {
  // 1. Initialize Teams (if running inside Teams)
  try {
    await microsoftTeams.app.initialize();
    microsoftTeams.app.registerOnThemeChangeHandler((theme) => {
      applyTheme(theme);
    });
    const context = await microsoftTeams.app.getContext();
    if (context && context.app.theme) applyTheme(context.app.theme);
  } catch (error) {
    console.log("Not running inside Teams, using default web mode.");
  }

  // 2. Initialize MSAL
  msalInstance = new msal.PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  // 3. Handle Redirect/Auth State
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      handleLoginResponse(response);
    } else {
      const currentAccounts = msalInstance.getAllAccounts();
      if (currentAccounts.length > 0) {
        accountId = currentAccounts[0].homeAccountId;
        showUserInfo(currentAccounts[0].name);
        await fetchSharePointData();
      } else {
        showLoginButton();
      }
    }
  } catch (error) {
    console.error("Auth error", error);
    showLoginButton();
  }

  // Attach login button event
  document.getElementById('auth-btn').addEventListener('click', () => {
    msalInstance.loginPopup(graphScopes).then(handleLoginResponse).catch(console.error);
  });
  
  // Search listener
  document.getElementById('search-input').addEventListener('input', (e) => {
    renderGrid(e.target.value);
  });
}

function showLoginButton() {
  document.getElementById('auth-btn').style.display = 'block';
  document.getElementById('user-info-container').style.display = 'none';
  document.getElementById('current-user-avatar').style.display = 'none';
  renderGrid(); // Render empty grid or fallback
}

function showUserInfo(name) {
  document.getElementById('auth-btn').style.display = 'none';
  document.getElementById('user-info-container').style.display = 'flex';
  document.getElementById('current-user-avatar').style.display = 'flex';
  document.getElementById('current-user-name').textContent = name;
  document.getElementById('current-user-avatar').textContent = (name || "U")[0].toUpperCase();
}

function handleLoginResponse(response) {
  if (response !== null) {
    accountId = response.account.homeAccountId;
    showUserInfo(response.account.name);
    fetchSharePointData();
  } else {
    showLoginButton();
  }
}

async function getToken() {
  const account = msalInstance.getAccountByHomeId(accountId);
  if (!account) throw new Error("No active account!");
  
  try {
    const response = await msalInstance.acquireTokenSilent({
      ...graphScopes,
      account: account
    });
    return response.accessToken;
  } catch (error) {
    if (error instanceof msal.InteractionRequiredAuthError) {
      const response = await msalInstance.acquireTokenPopup({
        ...graphScopes,
        account: account
      });
      return response.accessToken;
    }
    throw error;
  }
}

// Graph API Interactions
async function fetchSharePointData() {
  try {
    if (m365Config.siteId === "YOUR_SITE_ID_HERE") {
      console.warn("Config is not set up! Rendering mock data for demonstration.");
      return loadMockData();
    }

    const token = await getToken();
    const endpoint = `https://graph.microsoft.com/v1.0/sites/${m365Config.siteId}/lists/${m365Config.listId}/items?expand=fields`;
    
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error("Failed to fetch SP list");
    
    const data = await response.json();
    processSharePointItems(data.value);
  } catch (error) {
    console.error("Error fetching data:", error);
    // Fallback for demonstration if it fails
    loadMockData();
  }
}

function processSharePointItems(items) {
  const userMap = {};
  const skillSet = new Set();

  items.forEach(item => {
    const fields = item.fields;
    // Expected SP Columns: Title (Name), SkillName, ProficiencyLevel
    const name = fields.Title;
    const skill = fields.SkillName;
    const level = parseInt(fields.ProficiencyLevel) || 0;

    if (name && skill) {
      skillSet.add(skill);
      if (!userMap[name]) {
        userMap[name] = { id: item.id, name: name, role: "Team Member", skills: {} };
      }
      userMap[name].skills[skill] = level;
    }
  });

  skills = Array.from(skillSet).sort();
  users = Object.values(userMap);
  renderGrid();
}

async function updateSkillInSharePoint(userName, skillName, newLevel) {
  if (m365Config.siteId === "YOUR_SITE_ID_HERE") {
    alert(`(Mock Update) Changed ${skillName} for ${userName} to ${newLevel}`);
    // Local mock update
    const user = users.find(u => u.name === userName);
    if (user) user.skills[skillName] = newLevel;
    renderGrid(document.getElementById('search-input').value);
    return;
  }

  try {
    const token = await getToken();
    
    // In a flat list, we would need to find the specific item ID to PATCH, 
    // or POST a new item if it doesn't exist.
    // For simplicity in this demo, we assume we just POST a new entry or we need to query it first.
    // Ideally, we'd GET the item id, then PATCH it.
    
    alert(`Graph API Update triggered for ${userName}: ${skillName} = ${newLevel}\n(Check app.js updateSkillInSharePoint to implement full write logic)`);
    
  } catch (error) {
    console.error("Failed to update:", error);
    alert("Failed to update skill in SharePoint.");
  }
}

// UI Rendering
function loadMockData() {
  skills = ["React", "Node.js", "Azure", "Python", "UX Design"];
  users = [
    { id: "u1", name: "Alex Johnson", role: "Frontend Dev", skills: { "React": 5, "Node.js": 2, "Azure": 1, "UX Design": 4 } },
    { id: "u2", name: "Sarah Smith", role: "Backend Dev", skills: { "Node.js": 5, "Azure": 4, "Python": 4 } }
  ];
  renderGrid();
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'default') {
    root.style.setProperty('--bg-color', '#f3f2f1');
    root.style.setProperty('--panel-bg', '#ffffff');
    root.style.setProperty('--text-primary', '#242424');
    root.style.setProperty('--text-secondary', '#605e5c');
    root.style.setProperty('--panel-border', '#edebe9');
  } else if (theme === 'dark') {
    root.style.setProperty('--bg-color', '#0f0f11');
    root.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.03)');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#8b8d98');
    root.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.08)');
  }
}

function renderGrid(filterText = "") {
  const grid = document.getElementById('matrix-grid');
  grid.innerHTML = ''; 
  
  if (skills.length === 0) {
    grid.innerHTML = '<div style="padding: 24px; color: var(--text-secondary);">No data loaded.</div>';
    return;
  }

  grid.style.gridTemplateColumns = `200px repeat(${skills.length}, minmax(100px, 1fr))`;

  const headerRow = document.createElement('div');
  headerRow.className = 'matrix-header-row';
  
  const emptyCell = document.createElement('div');
  emptyCell.className = 'matrix-cell header-cell user-cell';
  emptyCell.textContent = 'Team Member';
  headerRow.appendChild(emptyCell);
  
  skills.forEach(skill => {
    const cell = document.createElement('div');
    cell.className = 'matrix-cell header-cell';
    cell.textContent = skill;
    headerRow.appendChild(cell);
  });
  
  grid.appendChild(headerRow);

  const lowerFilter = filterText.toLowerCase();
  
  users.forEach(user => {
    if (filterText && !user.name.toLowerCase().includes(lowerFilter)) return;

    const row = document.createElement('div');
    row.className = 'matrix-row';

    const userCell = document.createElement('div');
    userCell.className = 'matrix-cell user-cell';
    userCell.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="avatar" style="width:28px; height:28px; font-size:0.75rem;">${user.name[0]}</div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:0.875rem;">${user.name}</span>
        </div>
      </div>
    `;
    row.appendChild(userCell);

    skills.forEach(skill => {
      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      
      const level = user.skills[skill] || 0;
      const badge = document.createElement('div');
      badge.className = `skill-badge level-${level}`;
      badge.textContent = level > 0 ? level : '-';
      
      badge.onclick = () => {
        const newLevel = level === 5 ? 0 : level + 1;
        updateSkillInSharePoint(user.name, skill, newLevel);
      };
      
      cell.appendChild(badge);
      row.appendChild(cell);
    });

    grid.appendChild(row);
  });
}

// Boot
document.addEventListener('DOMContentLoaded', initializeApp);
