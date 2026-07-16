import { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Database, LogOut, Settings, Calculator } from 'lucide-react';
import PSAVsLiquid from './components/PSAVsLiquid';
import PSAVsCylinders from './components/PSAVsCylinders';
import PSAVsAnyPSA from './components/PSAVsAnyPSA';
import PSAVsPSADeoxo from './components/PSAVsPSADeoxo';

import { CmcApp } from './components/cmc';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import Login from './components/Login';
import PasswordRecovery from './components/PasswordRecovery';

const lufgaFontStyle = `
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-SemiBold.otf') format('opentype');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }
`;

type Group = 'new-psa' | 'existing-psa' | null;

export default function App() {

  const [session, setSession] = useState<Session | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group>('new-psa');
  const [activeTab, setActiveTab] = useState('psa-vs-liquid');

  const isRecoveryMode = window.location.pathname === '/reset-password';
  const handleRecoveryExit = () => { window.location.href = '/'; };

  useEffect(() => {

    if (isRecoveryMode) return;

    // -------- HANDLE SUPABASE HASH --------
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(
        hash.replace(/^#/, '')
      );
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');
      if (access_token && refresh_token) {
        supabase.auth
          .setSession({ access_token, refresh_token })
          .then(() => {
            if (type === 'recovery') {
              window.location.href = '/reset-password';
            } else {
              window.history.replaceState({}, '', '/calculators');
            }
          });
      }
    }

    // -------- NORMAL SESSION --------
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };

  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const newPsaTabs = [
    { id: 'psa-vs-liquid', label: 'PSA Vs Liquid', icon: Database },
    { id: 'psa-vs-cylinders', label: 'PSA Vs Cylinders', icon: Settings },
    { id: 'psa-vs-any-psa', label: 'PSA vs Any PSA', icon: Settings },
    { id: 'psa-vs-psa-deoxo', label: 'PSA vs PSA + Deoxo', icon: Settings },
  ];

  const existingPsaTabs = [
    { id: 'shield', label: 'Maintenance', icon: Calculator },
  ];

  const handleGroupSelect = (group: 'new-psa' | 'existing-psa') => {
    setActiveGroup(group);
    if (group === 'new-psa') {
      setActiveTab('psa-vs-liquid');
    } else {
      setActiveTab('shield');
    }
  };

  const activeTabs = activeGroup === 'new-psa' ? newPsaTabs : existingPsaTabs;

  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <PasswordRecovery onCancel={handleRecoveryExit} />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        fontFamily: "'Lufga', sans-serif",
        fontWeight: 400,
      }}
    >
      <style>{lufgaFontStyle}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* ── Two pill buttons ── */}
        <div className="flex items-center gap-4 mb-6 print:hidden">

          <button
            onClick={() => handleGroupSelect('new-psa')}
            className="px-6 py-2.5 rounded-full text-sm transition-all duration-150 hover:bg-blue-50"
            style={{
              fontFamily: "'Lufga', sans-serif",
              fontWeight: 600,
              background: activeGroup === 'new-psa' ? '#2563eb' : '#fff',
              color: activeGroup === 'new-psa' ? '#fff' : '#2563eb',
              border: '2px solid #2563eb',
            }}
          >
            If you are considering a new PSA plant
          </button>

          <button
            onClick={() => handleGroupSelect('existing-psa')}
            className="px-6 py-2.5 rounded-full text-sm transition-all duration-150 hover:bg-blue-50"
            style={{
              fontFamily: "'Lufga', sans-serif",
              fontWeight: 600,
              background: activeGroup === 'existing-psa' ? '#2563eb' : '#fff',
              color: activeGroup === 'existing-psa' ? '#fff' : '#2563eb',
              border: '2px solid #2563eb',
            }}
          >
            If you have an existing PSA plant
          </button>

          {/* Sign out pushed to the right */}
          <button
            onClick={handleSignOut}
            className="ml-auto flex items-center space-x-2 text-gray-500 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4" />
            <span
              className="text-sm"
              style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}
            >
              Sign Out
            </span>
          </button>

        </div>

        {/* ── Tabs + content — only shown after a group is selected ── */}
        {activeGroup !== null && (
          <div className="bg-white rounded-lg shadow">

            <div className="border-b border-gray-200 print:hidden flex justify-between items-center">

              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {activeTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? activeGroup === 'new-psa'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 text-sm flex items-center space-x-2`}
                      style={{
                        fontFamily: "'Lufga', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

            </div>

            <div className="p-6">
              {activeTab === 'psa-vs-liquid' && <PSAVsLiquid />}
              {activeTab === 'psa-vs-cylinders' && <PSAVsCylinders />}
              {activeTab === 'psa-vs-any-psa' && <PSAVsAnyPSA />}
              {activeTab === 'psa-vs-psa-deoxo' && <PSAVsPSADeoxo />}
              {activeTab === 'shield' && <CmcApp />}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}