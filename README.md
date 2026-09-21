# 🌟 Akshra AI (2026 v1)

<div align="center">

![Akshra AI Logo](public/icons/icon-192x192.png)

### **Next-Generation, Blazing-Fast AI Assistant & Progressive Web App (PWA)**

*Built with Next.js 16 (App Router & Turbopack), React 19, Tailwind CSS v4, OpenRouter AI, and MongoDB.*

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Multi--Model-blueviolet?style=for-the-badge)](https://openrouter.ai/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Supported AI Models](#-supported-ai-models)
- [Progressive Web App (PWA)](#-progressive-web-app-pwa)
- [Performance & Smoothness Architecture](#-performance--smoothness-architecture)
- [Tech Stack](#-tech-stack)
- [Project Architecture & Structure](#-project-architecture--structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables Setup](#environment-variables-setup)
  - [Installation & Local Run](#installation--local-run)
- [API Routes](#-api-routes)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Overview

**Akshra AI** is a state-of-the-art conversational AI web application and full-featured Progressive Web App (PWA) designed to deliver an experience on par with ChatGPT. It combines multi-model intelligence via OpenRouter, passwordless OTP email authentication, real-time token streaming with zero stutter, rich markdown rendering, customizable themes, and responsive design across all devices (mobile, tablet, desktop).

---

## ✨ Key Features

### 🧠 Multi-Model AI Engine
- Switch seamlessly between top-tier reasoning, flagship, and lightning-fast models in real-time.
- Supports **DeepSeek V3**, **DeepSeek R1**, **Claude 3.5 Sonnet**, **GPT-4o**, **GPT-4o Mini**, **Gemini 2.0 Flash**, and **Llama 3.3 70B**.
- Streaming responses via Server-Sent Events (SSE) with live token rendering.
- Cancel / Stop generation mid-stream and regenerate answers with a single click.

### ⚡ Buttery Smooth Performance (60 FPS)
- **Token Batching via `requestAnimationFrame`**: Incoming streaming chunks are buffered and committed at display refresh rates to prevent DOM thrashing and CPU overload.
- **Message Row Virtualization & Memoization**: Past chat turns are memoized using `React.memo` and `useMemo` so markdown parsing is only executed once per message.
- **Hardware-Accelerated Scrolling**: Unthrottled scroll listeners and redundant composite layers have been replaced with fluid native inertia scrolling.
- **Quick Navigation**: Floating **"Back to top"** button smoothly ascends long discussions.

### 📱 Full Progressive Web App (PWA)
- **Installable Native App Experience**: Add to Home Screen on iOS, Android, macOS, and Windows.
- **Dedicated Install Prompts**: Custom one-click install button in sidebar and header with device detection (`Android/IOS` badge).
- **Offline Shell & Caching**: Custom Service Worker (`public/sw.js`) with cache-first strategy for static assets.
- **Mobile Edge-to-Edge Design**: Complete support for notch screens and mobile safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).

### 🔐 Passwordless Authentication & User Profiles
- **Email OTP Verification**: Secure, friction-free login/signup with 6-digit one-time passcodes sent via SMTP (Nodemailer).
- **Secure Sessions**: HTTP-only, encrypted JWT tokens (`akshra_token`) stored safely in browser cookies.
- **Dual Storage Strategy**: Persistent user accounts in **MongoDB Atlas** with automatic fallback to an in-memory store for rapid local development.
- **User Settings & Controls**: Manage theme preferences, history retention toggles, and account sign-out.

### 💬 Conversation & History Management
- Multiple chat sessions saved locally with automatic conversational title generation.
- Rename, switch, or delete previous discussions from the collapsible sidebar.
- History toggle in Settings allowing users to disable or clear chat history at any time.

### 🎨 Design & Accessibility
- **Dual Themes**: Polished Dark and Light modes powered by `next-themes` with seamless transitions.
- **Markdown & Code Engine**: Formats tables, blockquotes, lists, bold/italics, and provides code syntax highlighting with language badges and one-click copy buttons.
- **Device Adaptability**: Custom fluid drawer navigation for screens ranging from 320px phones to ultra-wide displays.

---

## 🤖 Supported AI Models

| Model | Provider | Badge | Ideal For |
| :--- | :--- | :--- | :--- |
| **DeepSeek V3** | DeepSeek | `Fast` (Default) | Ultra-fast programming, math, and daily coding |
| **DeepSeek R1** | DeepSeek | `Free` / `Reasoning` | Complex logical reasoning & chain-of-thought analysis |
| **Gemini 2.0 Flash** | Google | `Free` | Low-latency, high-accuracy conversational responses |
| **Llama 3.3 70B** | Meta | `Free` | Comprehensive open-weights knowledge & instruction following |
| **GPT-4o Mini** | OpenAI | `Fast` | Lightweight, cost-effective multimodal chat |
| **GPT-4o** | OpenAI | `Flagship` | High-intelligence reasoning and creative drafting |
| **Claude 3.5 Sonnet**| Anthropic | `Flagship` | Software engineering, complex debugging, and detailed writing |

---

## 📱 Progressive Web App (PWA)

Akshra AI includes a complete PWA manifest and service worker configuration:

- **Manifest**: [`public/manifest.json`](public/manifest.json) & [`src/app/manifest.ts`](src/app/manifest.ts)
- **Service Worker**: [`public/sw.js`](public/sw.js)
- **Display Mode**: `standalone` (removes browser URL bar and controls)
- **High-Res Assets**:
  - `favicon-32x32.png`
  - `icon-192x192.png` (Standard + Maskable)
  - `icon-512x512.png` (Standard + Maskable)
  - `apple-touch-icon.png` (iOS Safari Home Screen icon)

### How to Install:
- **Chrome / Edge (Desktop)**: Click the install icon in the address bar or the **Install App** button in the sidebar.
- **Android (Chrome)**: Tap **Install App (Android/IOS)** in the sidebar, or select **Add to Home screen** from the browser menu.
- **iOS (Safari)**: Tap the **Share** button $\rightarrow$ Select **Add to Home Screen**.

---

## ⚡ Performance & Smoothness Architecture

1. **`requestAnimationFrame` Stream Batching**: Rather than triggering React state updates on every incoming SSE chunk (which can arrive 80–120 times per second), chunks are buffered and flushed once per native animation frame (~16–25ms).
2. **Memoized Markdown AST**: Markdown parsing using regular expressions is wrapped inside `React.memo` and `useMemo` hooks, preventing previous messages from recalculating during active assistant generation.
3. **Optimized Scroll Container**: Heavy CSS layer filters (`-webkit-overflow-scrolling: touch`) were restricted strictly to scrollable containers, eliminating GPU composite layer bloat and mouse wheel stutter.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16.3](https://nextjs.org/) (App Router, Server Actions, Turbopack)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Theme Provider**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Database / ODM**: [MongoDB](https://www.mongodb.com/) & [Mongoose 9](https://mongoosejs.com/)
- **Email Delivery**: [Nodemailer](https://nodemailer.com/)
- **Authentication**: Stateless JSON Web Tokens ([`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken))
- **AI Integration**: [OpenRouter API](https://openrouter.ai/)

---

## 📂 Project Architecture & Structure

```text
Akshra-Ai_2026_v1/
├── public/                     # Static assets & PWA configuration
│   ├── icons/                  # PWA high-res & maskable icons
│   ├── manifest.json           # Web App Manifest
│   └── sw.js                   # Service worker for offline caching
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Backend API route handlers
│   │   │   ├── auth/           # Authentication endpoints (me, send-otp, verify-otp, logout)
│   │   │   └── chat/           # OpenRouter SSE streaming proxy handler
│   │   ├── globals.css         # Tailwind CSS v4 design system & scrollbar rules
│   │   ├── layout.tsx          # Root layout with ThemeProvider, PWAProvider, & viewport
│   │   └── page.tsx            # Main application coordinator & chat state
│   ├── components/             # Reusable UI components
│   │   ├── AuthModals.tsx      # OTP login/signup modal with verification countdown
│   │   ├── ChatLanding.tsx     # Hero welcome screen with prompt suggestion cards
│   │   ├── ChatMessages.tsx    # Memoized message feed, actions, & Back-to-Top button
│   │   ├── Header.tsx          # Navbar with model selector, auth buttons, & theme toggle
│   │   ├── MarkdownRenderer.tsx# High-performance formatted text & code blocks
│   │   ├── PWAProvider.tsx     # Service worker registration & beforeinstallprompt handler
│   │   ├── SettingsModal.tsx   # User preferences & history toggle controls
│   │   ├── Sidebar.tsx         # Conversation history, new chat, & PWA install trigger
│   │   ├── ThemeProvider.tsx   # Dark/Light theme context wrapper
│   │   └── ThemeSelector.tsx   # Visual theme switcher component
│   ├── lib/                    # Core utilities & server helpers
│   │   ├── auth.ts             # JWT token generation, verification, and cookie handler
│   │   ├── db-store.ts         # In-memory storage fallback for offline/development
│   │   ├── mailer.ts           # Nodemailer transport for transactional OTP emails
│   │   ├── models.ts           # OpenRouter model definitions and metadata
│   │   └── mongodb.ts          # Cached MongoDB connection manager
│   └── models/                 # Mongoose schemas
│       ├── Otp.ts              # Time-to-Live (TTL) OTP schema
│       └── User.ts             # Registered user profile schema
├── .env.example                # Template for environment configuration
├── next.config.ts              # Next.js build configuration
├── package.json                # Project dependencies and run scripts
└── tsconfig.json               # TypeScript compiler options
```

---

## 🏁 Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**, **yarn**, or **pnpm**
- An **OpenRouter API Key** ([Get one here](https://openrouter.ai/keys))
- *(Optional)* A **MongoDB Atlas** database URI & **Gmail App Password** for sending OTP emails.

---

### Environment Variables Setup

1. Copy the sample environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and populate the required keys:

   ```env
   # ==========================================
   # Akshra AI - Environment Variables
   # ==========================================

   # MongoDB Connection String (Atlas or Local)
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/Akshra-ai

   # JWT Secret for Signing Auth Cookies
   JWT_SECRET=your-super-secret-jwt-key-2026

   # SMTP Credentials for OTP Emails (e.g. Gmail)
   SMTP_SERVICE=gmail
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_gmail_app_password
   SMTP_FROM="Akshra AI <your_email@gmail.com>"

   # OpenRouter API Key (Required for AI responses)
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx

   # Default AI Model ID
   DEFAULT_OPENROUTER_MODEL=deepseek/deepseek-chat
   ```

> [!TIP]
> If `MONGODB_URI` or SMTP settings are not provided, Akshra AI will gracefully fall back to an in-memory session store for local testing.

---

### Installation & Local Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server with Turbopack**:
   ```bash
   npm run dev
   ```

3. **Open the application**:
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🔌 API Routes

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/chat` | `POST` | Streams AI completions via OpenRouter SSE based on model & message history |
| `/api/auth/send-otp` | `POST` | Generates a 6-digit OTP and sends it via email |
| `/api/auth/verify-otp` | `POST` | Validates OTP and issues a signed JWT cookie |
| `/api/auth/me` | `GET` | Returns authenticated user info from cookie session |
| `/api/auth/logout` | `POST` | Clears the authentication session cookie |

---

## 🚢 Deployment

### Deploying to Vercel

The easiest way to deploy Akshra AI is using [Vercel](https://vercel.com/):

1. Push your repository to GitHub.
2. Import the project into the [Vercel Dashboard](https://vercel.com/new).
3. Add your environment variables in **Project Settings $\rightarrow$ Environment Variables**.
4. Click **Deploy**.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/RohanJaiswalDev/Akshra-Ai_2026_v1/issues).

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📜 License

Distributed under the [MIT License](LICENSE). See `LICENSE` for more information.

---

<div align="center">

Crafted with ❤️ by **[Rohan Jaiswal](https://github.com/RohanJaiswalDev)**

**Akshra AI © 2026** • All Rights Reserved

</div>
