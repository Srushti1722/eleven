'use client';

import { useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { getSandboxTokenSource } from '@/lib/utils';

// authentication
import { AuthProvider, useAuth } from '@/components/auth/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  return (
    <AuthProvider>
      <AppWithAuth appConfig={appConfig} />
    </AuthProvider>
  );
}

// separate component renders either auth flow or the main application
function AppWithAuth({ appConfig }: AppProps) {
  const { user } = useAuth();
  if (!user) {
    return <AuthPage appConfig={appConfig} />;
  }
  return <AppInner appConfig={appConfig} user={user} />;
}

interface AppInnerProps extends AppProps {
  user: { email: string; name?: string };
}

function AppInner({ appConfig, user }: AppInnerProps) {
  // hooks order is now stable because this component always renders only
  // when a user exists; gating happens one level above.
  const { logout } = useAuth();
  const tokenSource = useMemo(() => {
    const identity = user.email;
    const name = user.name;

    if (typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string') {
      return getSandboxTokenSource(appConfig, identity, name);
    }

    return TokenSource.custom(async () => {
      const body: Record<string, any> = {};
      if (identity) body.identity = identity;
      if (name) body.name = name;
      if (appConfig.agentName) {
        body.room_config = {
          agents: [{ agent_name: appConfig.agentName }],
        };
      }
      try {
        const res = await fetch('/api/connection-details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        return await res.json();
      } catch (err) {
        console.error('error fetching connection details', err);
        throw err;
      }
    });
  }, [appConfig, user.email, user.name]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  const handleLogout = () => {
    session.end();
    logout();
  };

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <div className="absolute bottom-4 right-4 z-20">
        <button
          onClick={handleLogout}
          className="px-3 py-2 text-sm font-medium text-white bg-destructive rounded hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>
      <main className="grid h-svh grid-cols-1 place-content-center">
        <ViewController appConfig={appConfig} />
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
