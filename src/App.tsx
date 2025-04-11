// src/App.tsx

import React, { useState, useEffect } from 'react';
import './index.css'; // Import the CSS file

// --- Define the interface for the exposed API (TypeScript only) ---
// If using JavaScript, you can skip this interface definition.
declare global {
  interface Window {
    electronAPI: {
      loadDemos: () => Promise<any[]>; // Define types more strictly if needed
      launchDemo: (demoId: string) => Promise<{ status: string; message: string }>;
    };
  }
}

// --- DemoCard Component ---
function DemoCard({ demo, onLaunch }: { demo: any; onLaunch: (id: string) => void }) {
  // Use a relative path if images are in the public folder served by Vite
  const imageUrl = demo.image && demo.image.startsWith('./') ? demo.image.substring(2) : 'default_card_image.png';

  return (
    <div className="demo-card">
      {/* Use default image if specified one fails */}
      <img
        src={imageUrl}
        alt={demo.name}
        className="demo-image"
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
           const target = e.target as HTMLImageElement;
           target.onerror = null; // prevent infinite loop if default also fails
           target.src='default_card_image.png';
         }}
       />
      <h3>{demo.name}</h3>
      <p>{demo.description || "No description available."}</p>
      <button onClick={() => onLaunch(demo.id)}>Launch Demo</button>
    </div>
  );
}

// --- Main App Component ---
function App() {
  const [demos, setDemos] = useState<any[]>([]); // Use a more specific type if known
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Use string type for error message

  // Fetch demos using the preload script API
  useEffect(() => {
    window.electronAPI.loadDemos()
      .then(loadedDemos => {
        console.log("Demos loaded:", loadedDemos);
        setDemos(loadedDemos);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading demos via IPC:", err);
        setError(`Failed to load demos. Check main process logs and demos.json. Error: ${err.message || err}`);
        setLoading(false);
      });
  }, []); // Empty dependency array means this runs once on mount

  // Function to handle launching a demo using the preload script API
  const handleLaunchDemo = async (demoId: string) => {
    console.log(`Requesting launch for demo ID: ${demoId} via IPC`);
    try {
      const result = await window.electronAPI.launchDemo(demoId);
      console.log(`Launch response for ${demoId}:`, result);
      if (result.status === 'success') {
        // Maybe show a brief success notification instead of alert
        console.log(`Demo '${demoId}' launch initiated successfully!`);
      } else {
        alert(`Error launching demo '${demoId}': ${result.message}`); // Keep alert for errors
      }
    } catch (err) {
        console.error(`Error launching demo ${demoId} via IPC:`, err);
        alert(`Failed to send launch command for ${demoId}. Error: ${err.message || err}`);
    }
  };

  // Render loading, error, or demo cards
  if (loading) {
    return <div className="app-container">Loading demos...</div>;
  }

  if (error) {
    return <div className="app-container error-message">{error}</div>;
  }

  return (
    <div className="app-container">
      <h1>AI Project Demonstrations</h1>
      <div className="demo-grid">
        {demos.length > 0 ? (
          demos.map(demo => (
            <DemoCard key={demo.id} demo={demo} onLaunch={handleLaunchDemo} />
          ))
        ) : (
          <p>No demos found. Check logs and ensure demos.json exists and is readable.</p>
        )}
      </div>
    </div>
  );
}

export default App; // Export the App component