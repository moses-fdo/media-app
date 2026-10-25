import { WidgetSnapshot } from './model';

export type WidgetBridge = {
  beginSession: (owner: string, generation: string) => void;
  publish: (generation: string, payload: string) => boolean;
  clear: () => void;
};
export type WidgetSession = { workspaceId: string; owner: string; generation: string };

// Keep publishing separate from fetching: responses from an old query can never
// repopulate a widget after sign-out, even if the same user signs back in.
export class WidgetPublisher {
  private current: WidgetSession | null = null;
  private sequence = 0;
  constructor(private bridge: WidgetBridge) {}

  begin(workspaceId: string, memberId: string): WidgetSession {
    const owner = `${workspaceId}:${memberId}`;
    if (this.current?.owner === owner) return this.current;
    const session = { workspaceId, owner, generation: `${Date.now()}-${++this.sequence}-${Math.random().toString(36).slice(2)}` };
    this.bridge.beginSession(owner, session.generation);
    this.current = session;
    return session;
  }

  publish(session: WidgetSession, snapshot: WidgetSnapshot): boolean {
    if (this.current !== session || session.workspaceId !== snapshot.workspaceId) return false;
    return this.bridge.publish(session.generation, JSON.stringify(snapshot));
  }

  clear(): void {
    this.current = null;
    this.bridge.clear();
  }
}
