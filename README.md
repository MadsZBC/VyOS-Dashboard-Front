# VyOS Network Manager

A Next.js web application for managing VyOS routers via their HTTP API.

![VyOS Network Manager Screenshot](docs/screenshot.png)

## Features

- Connect to VyOS routers via secure API
- View and configure interfaces
- Manage DHCP server configurations and view active leases
- Support for both HTTP and HTTPS connections
- Support for self-signed certificates
- Visualize network components

## Getting Started

### Prerequisites

- Node.js 16.x or later
- VyOS router with API enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vyos-network-manager.git
cd vyos-network-manager

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Connecting to VyOS

Before connecting to your VyOS router, you need to:

1. Enable the HTTP API on your VyOS router:

```
set service https api
commit
save
```

2. Generate an API key:

```
generate auth api-key id my-app-key
```

3. Enter your router's address and API key in the connection form.

4. If your VyOS router uses a self-signed certificate (common in testing environments), you may need to enable the "Allow Self-Signed Certificate" option when connecting.

## Self-Signed Certificate Support

The application includes built-in support for connecting to VyOS routers with self-signed SSL certificates.

When using the "Allow Self-Signed Certificate" option:

1. The connection will bypass certificate validation for the specified host only
2. This is handled securely in the server-side proxy to prevent CORS issues
3. The setting only applies to the current connection and is not permanently stored

**Note:** While this feature enables connections to test environments, for production use, it's recommended to properly configure trusted certificates on your VyOS routers.

## Development

The application architecture consists of:

- Next.js frontend with React components
- API proxy for handling HTTPS connections and self-signed certificates
- TypeScript for type safety
- shadcn/ui for the UI components

## License

MIT 