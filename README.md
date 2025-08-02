# W2M

<div align="center">
  <img src="frontend/public/w2mlogo.png" alt="W2M Logo with animal head, geometric cube, and CREATE A W2M text" width="300">
</div>

[![Frontend Checks](https://github.com/GRA0007/crab.fit/actions/workflows/check_frontend.yml/badge.svg)](https://github.com/GRA0007/crab.fit/actions/workflows/check_frontend.yml)
[![API Checks](https://github.com/GRA0007/crab.fit/actions/workflows/check_api.yml/badge.svg)](https://github.com/GRA0007/crab.fit/actions/workflows/check_api.yml)

**Find the perfect meeting time that works for everyone.** W2M makes scheduling group events effortless with an intuitive interface and powerful features.

## ✨ Features

### 🎯 **Smart Grid Interface**
- **30-minute time slots** for easier, more practical scheduling
- **Drag & drop selection** to quickly mark your availability
- **Visual feedback** with color-coded availability levels
- **Responsive design** that works perfectly on desktop and mobile

### 👥 **Group Coordination**
- **Real-time availability view** to see when everyone is free
- **VIP participant weighting** - give important attendees double influence
- **Individual participant highlighting** - hover to see specific availability
- **Copy time slots** with one click for easy sharing

### 🎨 **User-Friendly Experience**
- **Clear usage instructions** on every page
- **Consistent interface** across all views
- **Keyboard shortcuts** for power users (Cmd/Ctrl+A for select all, Cmd/Ctrl+I for invert)
- **Google Calendar integration** for seamless import

### 📱 **Mobile Optimized**
- **Touch-friendly controls** with larger interaction areas
- **Responsive grid sizing** that adapts to any screen
- **Optimized for mobile browsers** with smooth interactions

### 🔧 **Developer Friendly**
- **Open source** - fully transparent and customizable
- **Modern tech stack** - Next.js frontend, Rust backend
- **Docker ready** - easy deployment and scaling
- **Comprehensive documentation** for contributors

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Git

### Local Development
```bash
# Clone the repository
git clone https://github.com/your-username/w2m.git
cd w2m

# Start the backend
cd api && cargo run

# Start the frontend (in a new terminal)
cd frontend && npm run dev
```

Visit `http://localhost:3000` to start scheduling!

## 🏗️ Architecture

- **Frontend**: Next.js with TypeScript and SCSS modules
- **Backend**: Rust API with Axum framework  
- **Storage**: In-memory and SQL adaptors
- **Deployment**: Docker and Fly.io ready

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](./CONTRIBUTING.md) for:
- Development environment setup
- Code style guidelines
- Pull request process
- Issue reporting

## 📄 License

This project is licensed under the [GNU GPLv3](./LICENSE).

## 🙏 Acknowledgments

Built on the foundation of [crab.fit](https://github.com/GRA0007/crab.fit) by [@GRA0007](https://github.com/GRA0007).

---

**W2M** - because finding the perfect meeting time should be simple! 

---

**Why W2M?** Inspired by when2meet, whenisgood, and a play on "[WideTiM](https://widetim.com) wants to meet"! 🦦
