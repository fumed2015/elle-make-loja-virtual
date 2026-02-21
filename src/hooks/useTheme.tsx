import { createContext, useContext, useEffect } from "react";

interface ThemeContextType {
  theme: "light";
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "light", toggle: () => {} });

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    localStorage.setItem("theme", "light");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", "#f5f0eb");
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light", toggle: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const ThemeToggle = () => null;

export default useThemeContext;
