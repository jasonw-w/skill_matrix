// Configuration for Microsoft 365 Integration
const m365Config = {
  // 1. Azure AD App Registration Details
  // Get this from Microsoft Entra ID (Azure AD) -> App Registrations
  clientId: "YOUR_CLIENT_ID_HERE", // e.g. "a1b2c3d4-..."
  tenantId: "common", // Use "common" for multi-tenant or your specific Tenant ID

  // 2. SharePoint Details
  // The Site ID where your list lives. Format: hostname,spsite.id,spweb.id
  // You can get this via Graph Explorer: GET https://graph.microsoft.com/v1.0/sites/YOURDOMAIN.sharepoint.com:/sites/YOURSITE
  siteId: "YOUR_SITE_ID_HERE", 
  
  // The ID of the List you created. 
  // You can get this via Graph Explorer: GET https://graph.microsoft.com/v1.0/sites/{siteId}/lists
  listId: "YOUR_LIST_ID_HERE"
};

// MSAL (Microsoft Authentication Library) Configuration
const msalConfig = {
  auth: {
    clientId: m365Config.clientId,
    authority: `https://login.microsoftonline.com/${m365Config.tenantId}`,
    // In a real app, set this to the URL where your app is hosted. 
    // For local testing, it defaults to the current page.
    redirectUri: window.location.origin + window.location.pathname
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

// Graph API Scopes required
const graphScopes = {
  scopes: ["User.Read", "Sites.ReadWrite.All"]
};
