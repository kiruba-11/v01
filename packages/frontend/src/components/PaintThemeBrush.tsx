import { useTheme } from '../context/ThemeContext';
import './PaintThemeBrush.css';

export default function PaintThemeBrush() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="paint-brush-button"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <svg
        style={{ width: '18px', height: '18px' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 11v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6" />
        <path d="M12 15v-3" />
        <path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
        <path d="M12 3v2" />
        <path d="M12 15c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5S13.5 15 12 15z" />
      </svg>
    </button>
  );
}
