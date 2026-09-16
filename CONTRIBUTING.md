# Contributing to CodeGraph Galaxy

Thank you for your interest in contributing to CodeGraph Galaxy! We welcome contributions from engineers, researchers, and open-source enthusiasts worldwide.

## Development Workflow

### Prerequisites
- Python 3.8 or higher
- Node.js 18 or higher & npm

### Local Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/dardeaw/codegraph-galaxy.git
   cd codegraph-galaxy
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -e .
   ```

3. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

4. **Launch Development Mode**:
   ```bash
   # Launch Desktop App (Electron)
   npm start

   # Or launch Web Visualizer directly
   python app.py -p 5001
   ```

## Pull Request Guidelines
1. Fork the repository and create your branch from `main` (e.g. `feat/custom-shaders` or `fix/camera-jitter`).
2. Ensure JavaScript syntax validity (`node -c`).
3. Follow the Single Source of Truth architecture and keep LOD filter mappings clean.
4. Submit your Pull Request with a clear description and screenshots/recordings of UI changes.

## Code of Conduct
Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all community interactions.
