import { createContext, useContext, useEffect, forwardRef } from "react";

interface ThemeContextType {
  theme: "light";
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "light", toggle: () => {} });

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, _ref) => {
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
  }
);

ThemeProvider.displayName = "ThemeProvider";

export const ThemeToggle = () => null;

export default useThemeContext;