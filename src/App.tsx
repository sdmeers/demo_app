// src/App.tsx
// (Keep imports and DemoCard component the same)
import React, { useState, useEffect } from 'react';
import './index.css';

// --- Define the interface for the exposed API (TypeScript only) ---
declare global {
  interface Window {
    electronAPI: {
      loadDemos: () => Promise<any[]>;
      launchDemo: (demoId: string) => Promise<{ status: string; message: string }>;
    };
  }
}

// --- DemoCard Component (Keep as before) ---
function DemoCard({ demo, onLaunch }: { demo: any; onLaunch: (id: string) => void }) {
  const imageUrl = demo.image && demo.image.startsWith('./') ? demo.image.substring(2) : 'default_card_image.png';
  return (
    <div className="demo-card">
      <img
        src={imageUrl}
        alt={demo.name}
        className="demo-image"
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
           const target = e.target as HTMLImageElement;
           target.onerror = null;
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
  const [demos, setDemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App component mounted, requesting demos..."); // <-- Add log
    window.electronAPI.loadDemos()
      .then(loadedDemos => {
        // --- Add Logs Here ---
        console.log("Received data from main process:", loadedDemos);
        if (Array.isArray(loadedDemos)) {
            console.log(`Received ${loadedDemos.length} demos.`);
            setDemos(loadedDemos);
        } else {
            console.error("Received data is not an array:", loadedDemos);
            setError("Failed to load demos: Invalid data format received.");
        }
        // --- End Logs ---
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading demos via IPC:", err);
        setError(`Failed to load demos. Check main process logs and demos.json. Error: ${err.message || err}`);
        setLoading(false);
      });
  }, []);

  const handleLaunchDemo = async (demoId: string) => {
    // (Keep handleLaunchDemo function as before)
    console.log(`Requesting launch for demo ID: ${demoId} via IPC`);
    try {
      const result = await window.electronAPI.launchDemo(demoId);
      console.log(`Launch response for ${demoId}:`, result);
      if (result.status === 'success') {
        console.log(`Demo '${demoId}' launch initiated successfully!`);
      } else {
        alert(`Error launching demo '${demoId}': ${result.message}`);
      }
    } catch (err) {
        console.error(`Error launching demo ${demoId} via IPC:`, err);
        alert(`Failed to send launch command for ${demoId}. Error: ${err.message || err}`);
    }
  };

  // (Keep rendering logic as before)
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
          // Display message if loading is finished but demos array is empty
          !loading && <p>No demos loaded. Check console logs (in DevTools) and main process output.</p>
        )}
      </div>
    </div>
  );
}

export default App;