// src/renderer.ts

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Your styles
import App from './App'; // Import the App component you just created

// Find the root element in your index.html
const rootElement = document.getElementById('root');

// Ensure the root element exists before trying to render
if (rootElement) {
  // Create a React root
  const root = ReactDOM.createRoot(rootElement);

  // Render the App component into the root
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Failed to find the root element. Make sure your index.html has <div id="root"></div>.');
}