# Dastarkhwan 🍲

> **An intelligent, local-first meal planner designed specifically for Pakistani households.**

![Live Demo](https://img.shields.io/badge/Live-Demo-success?style=for-the-badge)
**Try it now:** [https://usama-akmal.github.io/Dastarkhwan/](https://usama-akmal.github.io/Dastarkhwan/)

Every day, families face the eternal question: *"Aaj kya pakayein?"* (What should we cook today?). **Dastarkhwan** solves this problem by offering a one-stop, fully offline Progressive Web App (PWA) that intelligently recommends daily meals based on your family's unique preferences.

## ✨ Features

- 🧠 **Smart Recommendation Engine:** Suggests daily meals (Lunch & Dinner, or just one meal per day) by analyzing your family's preferences and ensuring you don't repeat the same dish within 7 days.
- 👨‍👩‍👧‍👦 **Bulk Preference Manager:** Manage profiles for every family member (husband, kids, etc.) and assign ❤️ *Loves*, 👍 *Eats*, or 🚫 *Won't Touch* preferences for over 80+ built-in authentic Pakistani dishes.
- 📱 **Progressive Web App (PWA):** Installable on iOS and Android straight from the browser. 
- 🔒 **100% Offline-First:** Powered by `Dexie.js` and IndexedDB. All data (including your cooking history and family preferences) lives entirely on your device. No cloud storage, no loading spinners, complete privacy.
- 🎨 **Premium Glassmorphic UI:** Features a sleek, modern, frosted-glass dark theme with smooth micro-animations.

## 🛠 Tech Stack

- **Framework:** React + Vite
- **Routing:** React Router (`HashRouter` for GitHub Pages compatibility)
- **Database:** Dexie.js (IndexedDB wrapper)
- **Styling:** Vanilla CSS Variables + Custom Utility Classes
- **Deployment:** GitHub Actions -> GitHub Pages

## 🚀 Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/usama-akmal/Dastarkhwan.git
   cd Dastarkhwan
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

## 📦 Building for Production

To create an optimized production build:
```bash
npm run build
```

To test the production build locally:
```bash
npm run preview
```

## 📝 License
This project is open-source. Feel free to fork and customize it for your own household!
