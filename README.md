# Fitly

A monorepo containing both client and server applications for Fitly.

## 🎨 Design System: Midnight Luxe + Violet

Fitly uses a premium, high-fashion aesthetic characterized by deep contrast and a unique signature accent.

- **Primary Background**: `#0C0C0C` (Deep Obsidian)
- **Primary Accent**: `#D4C4A8` (Champagne Gold)
- **Secondary Accent**: `#262626` (Brushed Steel)
- **Typography**: `#F5F5F7` (Platinum White)
- **Signature Stroke**: `#A855F7` (Electric Violet)
  - Applied as a **1px bottom border** on the `Header`
  - Applied as a **1px top border** on primary `Cards` (e.g., Auth forms)

This combination represents the core brand identity: luxury, modern technology, and high-fashion "couture" touches.

## 📁 Project Structure

```
fitly/
├── client/          # Next.js frontend application
├── server/          # NestJS backend application
├── .github/         # GitHub Actions CI/CD workflows
├── package.json     # Root workspace configuration
├── tsconfig.json    # Shared TypeScript configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

First, fix npm cache permissions if needed:

```bash
sudo chown -R $(whoami) ~/.npm
```

Then install dependencies for both applications:

```bash
npm install
```

### Development

Run both client and server concurrently:

```bash
npm run dev
```

Or run them separately:

```bash
# Run server only (default port: 3000)
npm run dev:server

# Run client only (default port: 3001)
npm run dev:client
```

## 🏗️ Building

Build both applications:

```bash
npm run build
```

Build individually:

```bash
# Build server
npm run build:server

# Build client
npm run build:client
```

## 🧪 Testing

Run tests for both applications:

```bash
npm run test
```

Run tests individually:

```bash
# Test server
npm run test:server

# Test client
npm run test:client
```

## 📝 Code Quality

Lint all code:

```bash
npm run lint
```

Format all code:

```bash
npm run format
```

## 📦 Client (Next.js)

The client application is built with:

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Turbopack** - Fast bundler
- **ESLint** - Code linting

### Client-specific commands

```bash
cd client
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## 🔧 Server (NestJS)

The server application is built with:

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type safety
- **Jest** - Testing framework
- **ESLint** - Code linting

### Server-specific commands

```bash
cd server
npm run start:dev  # Start development server with watch mode
npm run build      # Build for production
npm run start:prod # Start production server
npm run test       # Run unit tests
npm run test:e2e   # Run end-to-end tests
npm run lint       # Run ESLint
```

## 🔄 CI/CD

This monorepo uses GitHub Actions for continuous integration and deployment:

- **Server Pipeline** (`.github/workflows/server-ci.yml`)
  - Triggers on changes to `server/**`
  - Runs tests, linting, and builds
  - Deploys to production (when configured)

- **Client Pipeline** (`.github/workflows/client-ci.yml`)
  - Triggers on changes to `client/**`
  - Runs tests, linting, and builds
  - Deploys to production (when configured)

## 📚 Workspace Structure

This project uses npm workspaces to manage dependencies across both applications:

- Shared dependencies are defined in the root `package.json`
- Application-specific dependencies are in their respective `package.json` files
- Run commands from the root using `--workspace` flag or navigate to specific directories

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

UNLICENSED
