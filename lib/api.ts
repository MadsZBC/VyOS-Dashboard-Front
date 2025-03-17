const API_BASE_URL = "http://localhost:8000";

type ConnectionParams = {
  host: string;
  username: string;
  password?: string;
  port?: string | number;
  use_keys?: boolean;
  key_file?: string;
  key_content?: string;
};

type SSHKeyUpload = {
  key_content: string;
  key_name?: string;
};

// Option 1: Direct API call (might have CORS issues)
export async function fetchRouterData(
  endpoint: string,
  connectionParams: ConnectionParams
) {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("API key is missing. Please set NEXT_PUBLIC_API_KEY in your environment.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(connectionParams),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

// Option 2: Use our Next.js proxy to avoid CORS
export async function fetchRouterDataViaProxy(
  endpoint: string,
  connectionParams: ConnectionParams
) {
  try {
    const response = await fetch('/api/proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint,
        data: connectionParams
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API proxy request failed:", error);
    throw error;
  }
}

export async function uploadSSHKey(keyData: SSHKeyUpload) {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("API key is missing. Please set NEXT_PUBLIC_API_KEY in your environment.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/upload-ssh-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(keyData),
      mode: "cors",
      credentials: "same-origin",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("SSH key upload failed:", error);
    throw error;
  }
}

// Upload SSH key via proxy
export async function uploadSSHKeyViaProxy(keyData: SSHKeyUpload) {
  try {
    const response = await fetch('/api/proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: 'upload-ssh-key',
        data: keyData
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("SSH key upload failed:", error);
    throw error;
  }
}

// Placeholder for direct key content use
export async function uploadSSHKeyViaConnect(keyData: SSHKeyUpload) {
  return {
    success: true,
    data: {},
    message: "SSH key will be used directly with the connection request"
  };
}

// The functions below now use the proxy by default to avoid CORS issues

export async function getVyOSConfig(connectionParams: ConnectionParams) {
  try {
    return await fetchRouterDataViaProxy("get-config", connectionParams);
  } catch (error) {
    console.error("Using direct API call as fallback");
    return fetchRouterData("get-config", connectionParams);
  }
}

export async function getInterfaces(connectionParams: ConnectionParams) {
  try {
    return await fetchRouterDataViaProxy("get-interfaces", connectionParams);
  } catch (error) {
    console.error("Using direct API call as fallback");
    return fetchRouterData("get-interfaces", connectionParams);
  }
}

export async function getSystemInfo(connectionParams: ConnectionParams) {
  try {
    return await fetchRouterDataViaProxy("get-system-info", connectionParams);
  } catch (error) {
    console.error("Using direct API call as fallback");
    return fetchRouterData("get-system-info", connectionParams);
  }
}

export async function getDhcpConfig(connectionParams: ConnectionParams) {
  try {
    return await fetchRouterDataViaProxy("get-dhcp-config", connectionParams);
  } catch (error) {
    console.error("Using direct API call as fallback");
    return fetchRouterData("get-dhcp-config", connectionParams);
  }
} 