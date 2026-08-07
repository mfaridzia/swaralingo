import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Settings, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import type { UserProfile } from './Auth';

interface NavbarProps {
  activeTab: 'diary' | 'chunks' | 'stats' | 'settings' | 'simulator';
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: UserProfile | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  user,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe guard check for anonymous visitors (e.g., Landing Page)
  if (!user) {
    return (
      <header className="sticky top-0 z-50 border-b border-[#27272a]/80 bg-[#09090b]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3 md:px-6 lg:px-0">
          <NavLink to="/" className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight hover:opacity-90 transition-opacity flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#22c55e] to-[#15803d] text-[#09090b]">
              <BookOpen className="h-4 w-4" />
            </div>
            <span>SwaraLingo</span>
          </NavLink>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#27272a]/80 bg-[#09090b]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3 md:px-6 lg:px-0">
        
        {/* App Branding Logo */}
        <NavLink to="/dashboard" className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight hover:opacity-90 transition-opacity flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#22c55e] to-[#15803d] text-[#09090b]">
            <BookOpen className="h-4 w-4" />
          </div>
          <span>SwaraLingo</span>
        </NavLink>

        {/* Desktop Navigation Link Tabs (Shortened to save horizontal space) */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => 
              `flex items-center px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 border border-transparent ${
                isActive 
                  ? 'bg-[#22c55e]/10 border-[#22c55e]/25 text-[#4ade80]' 
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50'
              }`
            }
          >
            Diary
          </NavLink>

          <NavLink
            to="/dashboard/chunks"
            className={({ isActive }) => 
              `flex items-center px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 border border-transparent ${
                isActive 
                  ? 'bg-[#22c55e]/10 border-[#22c55e]/25 text-[#4ade80]' 
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50'
              }`
            }
          >
            Chunks
          </NavLink>

          <NavLink
            to="/dashboard/stats"
            className={({ isActive }) => 
              `flex items-center px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 border border-transparent ${
                isActive 
                  ? 'bg-[#22c55e]/10 border-[#22c55e]/25 text-[#4ade80]' 
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50'
              }`
            }
          >
            Stats
          </NavLink>

          <NavLink
            to="/dashboard/simulator"
            className={({ isActive }) => 
              `flex items-center px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 border border-transparent ${
                isActive 
                  ? 'bg-[#22c55e]/10 border-[#22c55e]/25 text-[#4ade80]' 
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50'
              }`
            }
          >
            Interview
          </NavLink>

          <NavLink
            to="/dashboard/journal"
            className={({ isActive }) => 
              `flex items-center px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 border border-transparent ${
                isActive 
                  ? 'bg-[#22c55e]/10 border-[#22c55e]/25 text-[#4ade80]' 
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50'
              }`
            }
          >
            Journal
          </NavLink>
        </nav>

        {/* Desktop User Dropdown Panel (Saves massive horizontal space) */}
        <div className="hidden md:block relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-[#27272a] hover:border-white bg-[#121214]/60 text-white transition-all cursor-pointer select-none text-left"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#27272a] to-[#3f3f46] flex items-center justify-center text-xs font-bold text-white border border-[#3f3f46]">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col mr-1">
              <span className="text-[11px] font-bold leading-none">{user.name || 'User'}</span>
              <span className="text-[9px] text-[#a1a1aa] mt-0.5 leading-none">ID: #{user.id || 0}</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-[#71717a] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu Overlay */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#27272a] bg-[#09090b] p-1.5 shadow-2xl z-50">
              <NavLink
                to="/dashboard/settings"
                onClick={() => setIsDropdownOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#22c55e]/10 text-[#4ade80]'
                      : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
                  }`
                }
              >
                <Settings className="h-4 w-4" />
                Profile Settings
              </NavLink>
              <div className="h-px bg-[#27272a] my-1" />
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all text-left cursor-pointer border-none bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                Logout Account
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-[#a1a1aa] hover:text-white rounded-lg transition-colors cursor-pointer border-none bg-transparent"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Panel Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#27272a] bg-[#09090b] px-5 py-4 space-y-4">
          <nav className="flex flex-col gap-2">
            <NavLink
              to="/dashboard"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => 
                `px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider block ${
                  isActive ? 'bg-[#22c55e]/10 text-[#4ade80]' : 'text-[#a1a1aa]'
                }`
              }
            >
              Diary
            </NavLink>
            <NavLink
              to="/dashboard/chunks"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => 
                `px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider block ${
                  isActive ? 'bg-[#22c55e]/10 text-[#4ade80]' : 'text-[#a1a1aa]'
                }`
              }
            >
              Chunks
            </NavLink>
            <NavLink
              to="/dashboard/stats"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => 
                `px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider block ${
                  isActive ? 'bg-[#22c55e]/10 text-[#4ade80]' : 'text-[#a1a1aa]'
                }`
              }
            >
              Stats
            </NavLink>
            <NavLink
              to="/dashboard/simulator"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => 
                `px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider block ${
                  isActive ? 'bg-[#22c55e]/10 text-[#4ade80]' : 'text-[#a1a1aa]'
                }`
              }
            >
              Interview
            </NavLink>
            <NavLink
              to="/dashboard/journal"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => 
                `px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider block ${
                  isActive ? 'bg-[#22c55e]/10 text-[#4ade80]' : 'text-[#a1a1aa]'
                }`
              }
            >
              Journal
            </NavLink>
            <NavLink
              to="/dashboard/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => 
                `px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider block ${
                  isActive ? 'bg-[#22c55e]/10 text-[#4ade80]' : 'text-[#a1a1aa]'
                }`
              }
            >
              Profile Settings
            </NavLink>
          </nav>

          <div className="pt-4 border-t border-[#27272a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#27272a] flex items-center justify-center text-xs font-bold text-white">
                {(user.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{user.name || 'User'}</span>
                <span className="text-[9px] text-[#a1a1aa]">ID: #{user.id || 0}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
