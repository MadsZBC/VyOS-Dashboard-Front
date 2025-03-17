# Network Configuration Dashboard

A Next.js application for managing and visualizing network configurations, router connections, and system information.

## Overview

This dashboard provides a comprehensive interface for network administrators to:

- Monitor and control router connections
- Visualize IP address mappings
- Configure firewall rules
- Manage NAT rules
- View system information
- Configure network interfaces
- Manage services

## Tech Stack

- **Framework**: Next.js
- **UI Components**: Custom UI components (located in `/components/ui`)
- **Styling**: Tailwind CSS (inferred from class names)
- **Icons**: Lucide React

## Project Structure

```
/app
├── api/          # API routes
├── globals.css   # Global styles
├── layout.tsx    # Root layout component
└── page.tsx      # Main application page

/components
├── ui/           # Reusable UI components
├── firewall-rules.tsx     # Firewall rules management
├── ip-address-map.tsx     # IP address visualization
├── nat-rules.tsx          # NAT configuration
├── network-interfaces.tsx # Network interfaces management
├── router-connection.tsx  # Router connection handling
├── services.tsx           # Services management
├── system-info.tsx        # System information display
└── theme-provider.tsx     # Theme context provider
```

## Features

- **Router Connection**: Establish and manage connections to network routers
- **System Information**: View and modify system configuration
- **Firewall Management**: Create and edit firewall rules
- **NAT Rules**: Configure network address translation
- **Network Interfaces**: Monitor and configure network interfaces
- **IP Address Mapping**: Visualize IP address allocations
- **Services Management**: Control and monitor network services

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

This application is built with Next.js and leverages modern React patterns including:
- Client-side components
- Server components
- React hooks and contexts

## Security Considerations

This application manages sensitive network configurations. Ensure proper authentication and authorization mechanisms are in place before deploying to production environments. 