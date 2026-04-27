import { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Database, Settings, LogOut } from 'lucide-react';
import PSAVsLiquid from './components/PSAVsLiquid';
import PSAVsCylinders from './components/PSAVsCylinders';
import PSAVsAnyPSA from './components/PSAVsAnyPSA';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import Login from './components/Login';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState('psa-vs-liquid');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const tabs = [
    { id: 'psa-vs-liquid', label: 'PSA Vs Liquid', icon: Database },
    { id: 'psa-vs-cylinders', label: 'PSA Vs Cylinders', icon: Database },
    { id: 'psa-vs-any-psa', label: 'PSA vs Any PSA', icon: Settings }
  ];

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 print:hidden flex justify-between items-center">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 py-4 px-4 mr-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'psa-vs-liquid' && <PSAVsLiquid />}
            {activeTab === 'psa-vs-cylinders' && <PSAVsCylinders />}
            {activeTab === 'psa-vs-any-psa' && <PSAVsAnyPSA />}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}