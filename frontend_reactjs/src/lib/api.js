// API base URL - loaded dynamically from config.json
let API_BASE_URL = '/api'; // default fallback

// Load configuration from public/config.json at runtime
async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    if (response.ok) {
      const config = await response.json();
      API_BASE_URL = config.API_URL || '/api';
      console.log('✅ API configuration loaded:', API_BASE_URL);
    }
  } catch (error) {
    console.warn('⚠️ Failed to load config.json, using default API URL:', API_BASE_URL, error);
  }
}

// Initialize config on module load
loadConfig();

// Get auth token from localStorage
function getAuthToken() {
  const user = localStorage.getItem('urbanopsUser');
  if (user) {
    const userData = JSON.parse(user);
    return userData.token;
  }
  return null;
}

// Get username from localStorage
function getUsername() {
  const user = localStorage.getItem('urbanopsUser');
  if (user) {
    const userData = JSON.parse(user);
    return userData.username;
  }
  return null;
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const username = getUsername();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (username) {
    headers['X-Username'] = username;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 404 gracefully for endpoints that don't exist
      if (response.status === 404) {
        return null;
      }

      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('urbanopsUser');
        throw new Error('Session expired. Please login again.');
      }

      // Safely read error response
      const contentType = response.headers.get('content-type');
      let errorMessage = `API Error: ${response.status}`;

      try {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          errorMessage = await response.text() || errorMessage;
        }
      } catch (readError) {
        // If reading fails, use status code
        errorMessage = `API Error: ${response.status} ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    // Check if response has content before parsing JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        return null;
      }
    }

    // For non-JSON responses, return text
    return await response.text();
  } catch (error) {
    // Handle network errors or CORS issues
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.warn(`API endpoint ${endpoint} not available or CORS issue`);
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

// Auth API
export async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Login failed';

      // Clone response to avoid "body already read" error
      const clonedResponse = response.clone();

      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If JSON parsing fails, try text from cloned response
          try {
            errorMessage = await clonedResponse.text() || errorMessage;
          } catch (textError) {
            errorMessage = `Login failed: ${response.status} ${response.statusText}`;
          }
        }
      } else {
        // Backend returns plain text for login errors
        errorMessage = await response.text() || errorMessage;
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    // Handle network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error: Unable to connect to server. Please check if the backend is running.');
    }
    throw error;
  }
}

export async function register(username, password, email = '', roles = ['ROLE_USER']) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, email, roles }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Registration failed';

      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If JSON parsing fails, try text (but clone first to avoid body already read error)
          try {
            errorMessage = await response.clone().text() || errorMessage;
          } catch (cloneError) {
            errorMessage = 'Registration failed. Please try again.';
          }
        }
      } else {
        errorMessage = await response.text() || errorMessage;
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    // Handle network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error: Unable to connect to server. Please check if the backend is running.');
    }
    // Re-throw if it's already an Error with message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Registration failed. Please try again.');
  }
}

// Profile API
export async function getProfile() {
  try {
    const data = await apiRequest('/auth/profile');
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function updateProfile(updates) {
  try {
    const data = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

export async function changePassword(oldPassword, newPassword) {
  try {
    const data = await apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return data;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

// Incidents API
export async function getIncidents() {
  try {
    const data = await apiRequest('/incidents/list');
    if (!data || !Array.isArray(data)) {
      return [];
    }
    // Map backend Incident model to frontend format
    // Fix status case sensitivity - backend uses uppercase, frontend expects lowercase
    return data.map((inc) => ({
      id: String(inc.id),
      title: inc.description || 'Untitled Incident',
      description: inc.description || '',
      status: (inc.status || 'active').toLowerCase(),
      severity: (inc.severity || 'medium').toLowerCase(),
      type: 'traffic', // Default type
      location: {
        lat: 0,
        lng: 0,
        address: inc.location || 'Unknown Location',
      },
      reportedAt: new Date().toISOString(),
      resolvedAt: null,
      assignedTo: null,
      tags: [],
    }));
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return [];
  }
}

export async function getIncidentById(id) {
  try {
    const data = await apiRequest(`/incidents/${id}`);
    if (!data) {
      return null;
    }
    return {
      id: String(data.id),
      title: data.description || 'Untitled Incident',
      description: data.description || '',
      status: (data.status || 'active').toLowerCase(),
      severity: (data.severity || 'medium').toLowerCase(),
      type: 'traffic',
      location: {
        lat: 0,
        lng: 0,
        address: data.location || 'Unknown Location',
      },
      reportedAt: new Date().toISOString(),
      resolvedAt: null,
      assignedTo: null,
      tags: [],
    };
  } catch (error) {
    console.error('Error fetching incident:', error);
    return null;
  }
}

export async function createIncident(incident) {
  try {
    const payload = {
      description: incident.description || incident.title,
      // ✅ Always send a plain string (fallback if empty)
      location:
        typeof incident.location === 'string'
          ? incident.location
          : incident.location?.address || 'Unknown Location',
      status: (incident.status || 'active').toUpperCase(),
      severity: (incident.severity || 'medium').toUpperCase(),
    };

    const data = await apiRequest('/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error creating incident:', error);
    throw error;
  }
}


export async function updateIncident(id, updates) {
  try {
    const payload = {
      description: updates.description || updates.title,
      location: updates.location?.address || updates.location,
      status: updates.status ? updates.status.toUpperCase() : 'ACTIVE',
      severity: updates.severity ? updates.severity.toUpperCase() : 'MEDIUM',
    };
    const data = await apiRequest(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error updating incident:', error);
    throw error;
  }
}

export async function deleteIncident(id) {
  try {
    await apiRequest(`/incidents/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting incident:', error);
    throw error;
  }
}

// Sensors API
export async function getSensors() {
  try {
    const data = await apiRequest('/sensors/list');
    if (!data || !Array.isArray(data)) {
      return [];
    }
    // Map backend Sensor model to frontend format - match DB schema: id, last_updated, status, type, value
    return data.map((sensor) => ({
      id: String(sensor.id),
      name: `Sensor ${sensor.id}`,
      type: sensor.type || null,
      status: sensor.status ? (typeof sensor.status === 'string' ? sensor.status.toLowerCase() : null) : null,
      value: sensor.value !== null && sensor.value !== undefined ? sensor.value : null,
      lastUpdated: sensor.lastUpdated ? new Date(sensor.lastUpdated).toISOString() : null,
      location: {
        lat: 0,
        lng: 0,
        address: 'Sensor Location',
      },
      lastReading: {
        value: sensor.value !== null && sensor.value !== undefined ? sensor.value : 0,
        unit: 'units',
        timestamp: sensor.lastUpdated ? new Date(sensor.lastUpdated).toISOString() : new Date().toISOString(),
      },
      metrics: [],
    }));
  } catch (error) {
    console.error('Error fetching sensors:', error);
    return [];
  }
}

export async function getSensorById(id) {
  try {
    const data = await apiRequest(`/sensors/${id}`);
    if (!data) {
      return null;
    }
    return {
      id: String(data.id),
      name: `Sensor ${data.id}`,
      type: data.type || 'traffic',
      status: (data.status || 'online').toLowerCase(),
      value: data.value || 0,
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated).toISOString() : null,
      location: {
        lat: 0,
        lng: 0,
        address: 'Sensor Location',
      },
      lastReading: {
        value: data.value || 0,
        unit: 'units',
        timestamp: data.lastUpdated ? new Date(data.lastUpdated).toISOString() : new Date().toISOString(),
      },
      metrics: [],
    };
  } catch (error) {
    console.error('Error fetching sensor:', error);
    return null;
  }
}

export async function createSensor(sensor) {
  try {
    const payload = {
      type: sensor.type || 'traffic',
      value: sensor.value || sensor.lastReading?.value || 0,
      status: (sensor.status || 'online').toUpperCase(),
      lastUpdated: new Date().toISOString(),
    };
    const data = await apiRequest('/sensors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error creating sensor:', error);
    throw error;
  }
}

export async function updateSensor(id, updates) {
  try {
    const payload = {
      type: updates.type,
      value: updates.value || updates.lastReading?.value || 0,
      status: updates.status ? updates.status.toUpperCase() : 'ONLINE',
      lastUpdated: new Date().toISOString(),
    };
    const data = await apiRequest(`/sensors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error updating sensor:', error);
    throw error;
  }
}

export async function deleteSensor(id) {
  try {
    await apiRequest(`/sensors/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting sensor:', error);
    throw error;
  }
}

// Alerts API
export async function getAlerts() {
  try {
    const data = await apiRequest('/alerts/list');
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map((alert) => ({
      id: String(alert.id),
      title: alert.title || 'Alert',
      message: alert.message || '',
      priority: (alert.priority || 'medium').toLowerCase(),
      timestamp: alert.timestamp ? new Date(alert.timestamp).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

export async function getAlertById(id) {
  try {
    const data = await apiRequest(`/alerts/${id}`);
    if (!data) {
      return null;
    }
    return {
      id: String(data.id),
      title: data.title || 'Alert',
      message: data.message || '',
      priority: (data.priority || 'medium').toLowerCase(),
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching alert:', error);
    return null;
  }
}

export async function createAlert(alert) {
  try {
    const payload = {
      title: alert.title || 'Alert',
      message: alert.message || '',
      priority: (alert.priority || 'medium').toUpperCase(),
      timestamp: alert.timestamp || new Date().toISOString(),
    };
    const data = await apiRequest('/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
}

export async function updateAlert(id, updates) {
  try {
    const payload = {
      title: updates.title,
      message: updates.message,
      priority: updates.priority ? updates.priority.toUpperCase() : 'MEDIUM',
      timestamp: updates.timestamp || new Date().toISOString(),
    };
    const data = await apiRequest(`/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error updating alert:', error);
    throw error;
  }
}

export async function deleteAlert(id) {
  try {
    await apiRequest(`/alerts/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    throw error;
  }
}

// Helper functions for dashboard
export async function getActiveIncidentsCount() {
  try {
    const incidents = await getIncidents();
    return incidents.filter((i) => i.status?.toLowerCase() === 'active').length;
  } catch (error) {
    console.error('Error getting active incidents count:', error);
    return 0;
  }
}

export async function getOnlineSensorsCount() {
  try {
    const sensors = await getSensors();
    return sensors.filter((s) => s.status?.toLowerCase() === 'online' || s.status?.toLowerCase() === 'ok').length;
  } catch (error) {
    console.error('Error getting online sensors count:', error);
    return 0;
  }
}

// CCTV Cameras API
export async function getCCTVCameras() {
  try {
    const data = await apiRequest('/cameras/list');
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map((camera) => ({
      id: String(camera.id),
      name: camera.name || `Camera ${camera.id}`,
      location: {
        lat: 0,
        lng: 0,
        address: camera.location || 'Unknown Location',
      },
      status: camera.status ? (typeof camera.status === 'string' ? camera.status.toLowerCase() : 'offline') : 'offline',
      streamUrl: camera.streamUrl || '',
      lastUpdated: camera.lastUpdated ? new Date(camera.lastUpdated).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching cameras:', error);
    return [];
  }
}

export async function getCameraById(id) {
  try {
    const data = await apiRequest(`/cameras/${id}`);
    if (!data) {
      return null;
    }
    return {
      id: String(data.id),
      name: data.name || `Camera ${data.id}`,
      location: {
        lat: 0,
        lng: 0,
        address: data.location || 'Unknown Location',
      },
      status: data.status ? data.status.toLowerCase() : 'offline',
      streamUrl: data.streamUrl || '',
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching camera:', error);
    return null;
  }
}

export async function createCamera(camera) {
  try {
    const payload = {
      name: camera.name || `Camera ${Date.now()}`,
      location: camera.location?.address || camera.location || '',
      status: camera.status ? camera.status.toUpperCase() : 'OFFLINE',
      streamUrl: camera.streamUrl || '',
      lastUpdated: new Date().toISOString(),
    };
    const data = await apiRequest('/cameras', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error creating camera:', error);
    throw error;
  }
}

export async function updateCamera(id, updates) {
  try {
    const payload = {
      name: updates.name,
      location: updates.location?.address || updates.location,
      status: updates.status,
      streamUrl: updates.streamUrl,
      lastUpdated: new Date().toISOString(),
    };
    const data = await apiRequest(`/cameras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data;
  } catch (error) {
    console.error('Error updating camera:', error);
    throw error;
  }
}

export async function deleteCamera(id) {
  try {
    await apiRequest(`/cameras/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting camera:', error);
    throw error;
  }
}

export async function getOnlineCamerasCount() {
  try {
    const cameras = await getCCTVCameras();
    return cameras.filter((c) => c.status?.toLowerCase() === 'online').length;
  } catch (error) {
    console.error('Error getting online cameras count:', error);
    return 0;
  }
}

// Python Integration API - Traffic Predictions
export async function getPredictions() {
  try {
    const data = await apiRequest('/predictions');
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return [];
  }
}

export async function sendPredictions(predictions) {
  try {
    const data = await apiRequest('/predictions', {
      method: 'POST',
      body: JSON.stringify(predictions),
    });
    return data;
  } catch (error) {
    console.error('Error sending predictions:', error);
    throw error;
  }
}

