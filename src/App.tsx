import { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Database, Settings, LogOut } from 'lucide-react';

import PSAVsLiquid from './components/PSAVsLiquid';
import PSAVsCylinders from './components/PSAVsCylinders';
import PSAVsAnyPSA from './components/PSAVsAnyPSA';
import PSAVsPSADeoxo from './components/PSAVsPSADeoxo';

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

export default function App() {

  const [session, setSession] = useState<Session | null>(null);

  const [activeTab, setActiveTab] =
    useState('psa-vs-liquid');

  const [isRecoveryMode, setIsRecoveryMode] =
    useState(false);

  useEffect(() => {

    const path = window.location.pathname;

    const hashParams =
      new URLSearchParams(
        window.location.hash.replace(/^#/, '')
      );

    const isPasswordRecovery =
      path === '/reset-password' ||
      hashParams.get('type') === 'recovery';

    if (isPasswordRecovery) {

      setIsRecoveryMode(true);

    }

    supabase.auth.getSession().then(
      ({ data: { session } }) => {

        // If we're in password recovery,
        // allow the session.

        if (isPasswordRecovery) {

          setSession(session);

          return;
        }

        // Detect email confirmation session.

        const emailConfirmed =
          session?.user?.email_confirmed_at;

        if (emailConfirmed && !isPasswordRecovery) {

          // Destroy auto login

          supabase.auth.signOut();

          setSession(null);

          return;
        }

        setSession(session);

      }
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (
          event === 'PASSWORD_RECOVERY'
        ) {

          setIsRecoveryMode(true);

          return;
        }

        if (
          event === 'SIGNED_OUT'
        ) {

          setSession(null);

          setIsRecoveryMode(false);

          return;
        }

        setSession(session);

      }
    );

    return () => subscription.unsubscribe();

  }, []);

  const handleSignOut = async () => {

    await supabase.auth.signOut();

  };

  const handleRecoveryExit = () => {

    setIsRecoveryMode(false);

    window.history.replaceState(
      null,
      '',
      '/'
    );

  };

  const tabs = [

    {
      id: 'psa-vs-liquid',
      label: 'PSA Vs Liquid',
      icon: Database,
    },

    {
      id: 'psa-vs-cylinders',
      label: 'PSA Vs Cylinders',
      icon: Settings,
    },

    {
      id: 'psa-vs-any-psa',
      label: 'PSA vs Any PSA',
      icon: Settings,
    },

    {
      id: 'psa-vs-psa-deoxo',
      label: 'PSA vs PSA + Deoxo',
      icon: Settings,
    },

  ];

  if (isRecoveryMode) {

    return (

      <div className="min-h-screen bg-slate-100 flex flex-col">

        <SiteHeader />

        <main className="flex-1">

          <PasswordRecovery
            onCancel={handleRecoveryExit}
          />

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

        <div className="bg-white rounded-lg shadow">

          <div className="border-b border-gray-200 print:hidden flex justify-between items-center">

            <nav
              className="-mb-px flex space-x-8"
              aria-label="Tabs"
            >

              {tabs.map((tab) => {

                const Icon = tab.icon;

                return (

                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 text-sm flex items-center space-x-2`}
                    style={{
                      fontFamily:
                        "'Lufga', sans-serif",
                      fontWeight: 600,
                    }}
                  >

                    <Icon className="h-4 w-4" />

                    <span>
                      {tab.label}
                    </span>

                  </button>

                );

              })}

            </nav>

            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 py-4 px-4 mr-2"
            >

              <LogOut className="h-4 w-4" />

              <span
                className="text-sm"
                style={{
                  fontFamily:
                    "'Lufga', sans-serif",
                  fontWeight: 400,
                }}
              >

                Sign Out

              </span>

            </button>

          </div>

          <div className="p-6">

            {activeTab ===
              'psa-vs-liquid' &&
              <PSAVsLiquid />}

            {activeTab ===
              'psa-vs-cylinders' &&
              <PSAVsCylinders />}

            {activeTab ===
              'psa-vs-any-psa' &&
              <PSAVsAnyPSA />}

            {activeTab ===
              'psa-vs-psa-deoxo' &&
              <PSAVsPSADeoxo />}

          </div>

        </div>

      </div>

    </div>

  );

}