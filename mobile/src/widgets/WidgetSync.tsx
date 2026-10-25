import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth } from '../auth/context';
import { createWidgetSnapshot, loadWidgetEvents } from './model';
import { WidgetSession } from './session';
import { widgetAvailable, widgetPublisher } from './native';

export function WidgetSync() {
  const { ready, tokens, me } = useAuth();
  const [session, setSession] = useState<WidgetSession | null>(null);
  const owner = me ? `${me.workspace_id}:${me.id}` : null;

  useEffect(() => {
    if (!widgetAvailable || !ready) return;
    if (!tokens) { widgetPublisher.clear(); setSession(null); }
    else if (me) setSession(widgetPublisher.begin(me.workspace_id, me.id));
  }, [ready, !!tokens, owner]);

  const query = useQuery({
    queryKey: [me?.workspace_id, 'home-screen-widget', session?.generation],
    enabled: widgetAvailable && ready && !!tokens && !!session && session.owner === owner,
    queryFn: async () => {
      const captured = session!;
      const items = await loadWidgetEvents(path => api.get(path));
      return { session: captured, snapshot: createWidgetSnapshot(items, captured.workspaceId, me!.timezone) };
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (tokens && me && query.data && query.data.session === session && session?.owner === owner) {
      widgetPublisher.publish(session, query.data.snapshot);
    }
  }, [query.data, query.dataUpdatedAt, session, owner, !!tokens]);
  return null;
}
