import { Outlet, Link, useLocation, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/dashboard#score-trend', label: 'Score Trend' },
    { path: '/dashboard#history', label: 'Interview History' },
  ];

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    if (path.startsWith('#')) {
      const element = document.getElementById(path.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (path.includes('#')) {
      const [route, hash] = path.split('#');
      if (route !== location.pathname) {
        window.location.href = path;
      } else {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  const initials = user?.fullName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header
        className={`sticky top-0 z-50 h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md transition-all duration-300 ${
          scrolled ? 'shadow-lg shadow-slate-950/50' : ''
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link
              to="/"
              onClick={(e) => { e.preventDefault(); handleNavClick('/'); }}
              className="flex items-center space-x-2 text-xl font-bold text-white hover:opacity-80 transition-opacity"
              aria-label="InterviewAI Home"
            >
              <span className="relative">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              <span className="hidden sm:block bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
                InterviewAI
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex md:items-center md:space-x-1 ml-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={(e) => {
                    if (link.path.includes('#')) {
                      e.preventDefault();
                      handleNavClick(link.path);
                    }
                  }}
                  end={link.path === '/'}
                  className={({ isActive }) => `
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'text-blue-400 border-b-2 border-blue-500 pb-[calc(2px-1px)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }
                  `}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Right Side: New Interview + User Menu */}
            <div className="flex items-center space-x-3">
              {/* New Interview Button */}
              <Link
                to="/setup"
                className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Interview</span>
              </Link>

              {/* Mobile New Interview Button */}
              <Link
                to="/setup"
                onClick={() => setMobileMenuOpen(false)}
                className="sm:hidden inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Interview</span>
              </Link>

              {/* User Avatar Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-800/50 transition-colors"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-medium text-white text-sm">
                    {initials}
                  </div>
                  <svg className="w-4 h-4 text-slate-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                         style={{
                           backgroundColor: '#1E293B',
                           border: '1px solid rgba(255,255,255,0.15)',
                           backdropFilter: 'none'
                         }}>
                      <div className="px-4 py-3 border-b border-slate-700/50">
                        <p className="font-medium text-white">{user?.fullName}</p>
                        <p className="text-sm text-slate-400">{user?.email}</p>
                      </div>
                      <NavLink
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Dashboard</span>
                      </NavLink>
                      <NavLink
                        to="/billing"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span>Billing</span>
                      </NavLink>
                      <div className="border-t border-slate-700/50 my-2" />
                      <button
                        onClick={logout}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden animate-in slide-in-from-top-2 duration-200 bg-slate-950 border-t border-slate-800">
              <div className="px-4 py-4 space-y-2">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={() => handleNavClick(link.path)}
                    end={link.path === '/'}
                    className={({ isActive }) => `
                      block px-4 py-3 rounded-xl text-base font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }
                    `}
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className="pt-2 border-t border-slate-800" />
                <Link
                  to="/setup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200"
                >
                  New Interview
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}