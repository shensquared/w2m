# W2M

<div align="center">
  <img src="frontend/public/w2mlogo.png" alt="W2M Logo with animal head, geometric cube, and CREATE A W2M text" width="300">
</div>

**Find the perfect meeting time that works for everyone.** W2M makes scheduling group events effortless with an intuitive interface and powerful features.

## ✨ Features

### 🎯 **Smart Grid Interface**
- **30-minute time slots** for easier, more practical scheduling
- **Drag & drop selection** to quickly mark your availability
- **Visual feedback** with color-coded availability levels (Preferred, Can if needed, Not available)
- **Responsive design** that works perfectly on desktop and mobile
- **Interactive heatmap** showing group availability with real-time updates

### 👥 **Three Powerful Views**
- **Your Availability Tab** - Mark your own availability with drag-to-select and keyboard shortcuts
- **Group Availability Tab** - See everyone's availability in a beautiful heatmap with individual highlighting
- **VIP Tab** - Give important participants double weight in scheduling decisions

### 🎨 **Enhanced User Experience**
- **Clear usage instructions** on every tab with consistent white background and purple borders
- **No gaps or spacing issues** - perfectly aligned interface elements
- **Keyboard shortcuts** for power users:
  - `Cmd/Ctrl + A` - Select all time slots
  - `Cmd/Ctrl + I` - Invert selections
  - `Cmd/Ctrl + Shift + A` - Clear all selections
- **Google Calendar integration** for seamless availability import
- **One-click time slot copying** for easy sharing

### 🎯 **Advanced Scheduling Features**
- **VIP participant weighting** - Mark key attendees to give their preferences double influence
- **Individual participant highlighting** - Hover over names to see their specific availability
- **Real-time availability calculation** with visual scoring
- **Timezone support** with automatic detection and manual selection
- **Recent events tracking** for quick access to previous meetings

### 📱 **Mobile Optimized**
- **Touch-friendly controls** with larger interaction areas
- **Responsive grid sizing** that adapts to any screen size
- **Optimized for mobile browsers** with smooth interactions
- **Gesture support** for drag and drop on touch devices

### 🔧 **Developer Friendly**
- **Open source** - fully transparent and customizable
- **Modern tech stack** - Next.js frontend with TypeScript, Rust backend with Axum
- **Component-based architecture** with reusable UI components
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

# Start the backend (Rust API)
cd api && cargo run

# Start the frontend (Next.js) in a new terminal
cd frontend && npm run dev
```

Visit `http://localhost:1234` to start scheduling!

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript, SCSS modules, and modern React patterns
- **Backend**: Rust API with Axum framework and async/await support
- **Storage**: Flexible adaptor system supporting in-memory and SQL databases
- **UI Components**: Reusable, consistent components with proper TypeScript interfaces
- **Deployment**: Docker and Fly.io ready with optimized builds

## 🎨 UI/UX Highlights

- **Consistent Design Language**: All tabs follow the same visual structure with unified spacing
- **Accessibility First**: Keyboard navigation, screen reader support, and proper ARIA labels
- **Performance Optimized**: Web workers for heavy calculations, efficient re-renders
- **Internationalization Ready**: Built-in i18n support for multiple languages
- **Theme Support**: CSS custom properties for easy theming and customization

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
