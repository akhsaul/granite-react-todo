import React, { useState, useEffect, createContext, useContext } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("todo-theme") || "light"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("todo-theme", theme);

    // Communicate theme changes to other tabs/windows (for sticky notes)
    try {
      // We use a uniquely named channel for our app.
      const channel = new BroadcastChannel("todo_app_sync_channel");

      // Send an object with a type and payload. This is good practice for future extensibility.
      channel.postMessage({ type: "THEME_CHANGE", theme: theme });

      // Close the channel after sending the message to clean up resources.
      channel.close();
    } catch (error) {
      // This will catch errors in browsers that don't support BroadcastChannel.
      console.error("BroadcastChannel is not supported or failed:", error);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
