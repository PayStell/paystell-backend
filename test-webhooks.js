const fetch = require('node-fetch');
const readline = require('readline');

// Base URL for the API
const API_URL = 'http://localhost:3000/api'; // Adjust port if needed

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Placeholder for user API token
let apiToken = '';

// Main menu
async function showMenu() {
  console.log('\n===== PayStell Webhook Testing Tool =====');
  console.log('1. Set API Token');
  console.log('2. Register a webhook');
  console.log('3. List webhooks');
  console.log('4. Get webhook details');
  console.log('5. Update webhook');
  console.log('6. Delete webhook');
  console.log('7. List available event types');
  console.log('8. Send test webhook');
  console.log('9. Exit');
  
  rl.question('\nSelect an option: ', async (answer) => {
    switch (answer.trim()) {
      case '1':
        await setApiToken();
        break;
      case '2':
        await registerWebhook();
        break;
      case '3':
        await listWebhooks();
        break;
      case '4':
        await getWebhook();
        break;
      case '5':
        await updateWebhook();
        break;
      case '6':
        await deleteWebhook();
        break;
      case '7':
        await getEventTypes();
        break;
      case '8':
        await sendTestWebhook();
        break;
      case '9':
        console.log('Exiting...');
        rl.close();
        return;
      default:
        console.log('Invalid option. Please try again.');
        showMenu();
        break;
    }
  });
}

// Set API token
async function setApiToken() {
  rl.question('Enter your API token: ', (token) => {
    apiToken = token.trim();
    console.log('API token set successfully!');
    showMenu();
  });
}

// Helper function for API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  if (!apiToken) {
    console.log('Please set an API token first (option 1)');
    showMenu();
    return null;
  }

  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    return { status: response.status, data };
  } catch (error) {
    console.error('Error making API request:', error.message);
    return null;
  }
}

// Register a webhook
async function registerWebhook() {
  rl.question('Enter webhook URL: ', (url) => {
    rl.question('Enter event types (comma separated, or leave empty for all): ', async (eventTypes) => {
      const webhookData = {
        url: url.trim()
      };
      
      if (eventTypes.trim()) {
        webhookData.eventTypes = eventTypes.split(',').map(type => type.trim());
      }
      
      const result = await apiRequest('/webhooks', 'POST', webhookData);
      
      if (result) {
        console.log(`Response (${result.status}):`);
        console.log(JSON.stringify(result.data, null, 2));
      }
      
      showMenu();
    });
  });
}

// List webhooks
async function listWebhooks() {
  const result = await apiRequest('/webhooks');
  
  if (result) {
    console.log(`Response (${result.status}):`);
    console.log(JSON.stringify(result.data, null, 2));
  }
  
  showMenu();
}

// Get webhook details
async function getWebhook() {
  const result = await apiRequest('/webhooks');
  
  if (result) {
    console.log(`Response (${result.status}):`);
    console.log(JSON.stringify(result.data, null, 2));
  }
  
  showMenu();
}

// Update webhook
async function updateWebhook() {
  rl.question('Enter new webhook URL (or leave empty to keep current): ', (url) => {
    rl.question('Enter event types (comma separated, or leave empty to keep current): ', async (eventTypes) => {
      const webhookData = {};
      
      if (url.trim()) {
        webhookData.url = url.trim();
      }
      
      if (eventTypes.trim()) {
        webhookData.eventTypes = eventTypes.split(',').map(type => type.trim());
      }
      
      const result = await apiRequest('/webhooks', 'PUT', webhookData);
      
      if (result) {
        console.log(`Response (${result.status}):`);
        console.log(JSON.stringify(result.data, null, 2));
      }
      
      showMenu();
    });
  });
}

// Delete webhook
async function deleteWebhook() {
  const result = await apiRequest('/webhooks', 'DELETE');
  
  if (result) {
    console.log(`Response (${result.status}):`);
    console.log(result.data ? JSON.stringify(result.data, null, 2) : 'Webhook deleted successfully');
  }
  
  showMenu();
}

// Get available event types
async function getEventTypes() {
  const result = await apiRequest('/webhook-events');
  
  if (result) {
    console.log(`Response (${result.status}):`);
    console.log(JSON.stringify(result.data, null, 2));
  }
  
  showMenu();
}

// Send test webhook
async function sendTestWebhook() {
  const result = await apiRequest('/webhooks/test', 'POST');
  
  if (result) {
    console.log(`Response (${result.status}):`);
    console.log(JSON.stringify(result.data, null, 2));
  }
  
  showMenu();
}

// Start the application
console.log('Welcome to the PayStell Webhook Testing Tool');
showMenu(); 