import { WidgetPublisher } from '../src/widgets/session';
import { WidgetSnapshot } from '../src/widgets/model';

function setup() {
  const writes: WidgetSnapshot[] = [];
  let stored: WidgetSnapshot | null = null;
  const publisher = new WidgetPublisher({
    beginSession: () => {},
    publish: (_generation, payload) => { stored = JSON.parse(payload); writes.push(stored!); return true; },
    clear: () => { stored = null; },
  });
  return { publisher, writes, get stored() { return stored; } };
}
const snapshot = (workspaceId: string) => ({ workspaceId, timezone: 'Asia/Kolkata', updatedAt: 1, expiresAt: 2, events: [] });

test('a delayed request cannot repopulate the widget after logout', () => {
  const fixture = setup();
  const session = fixture.publisher.begin('workspace-a', 'staff-a');
  fixture.publisher.publish(session, snapshot('workspace-a'));
  fixture.publisher.clear();
  expect(fixture.stored).toBeNull();
  expect(fixture.publisher.publish(session, snapshot('workspace-a'))).toBe(false);
  expect(fixture.stored).toBeNull();
  expect(fixture.writes).toHaveLength(1);
});

test('workspace switches and re-login invalidate previous publishing sessions', () => {
  const fixture = setup();
  const old = fixture.publisher.begin('workspace-a', 'staff-a');
  const current = fixture.publisher.begin('workspace-b', 'staff-b');
  expect(fixture.publisher.publish(old, snapshot('workspace-a'))).toBe(false);
  expect(fixture.publisher.publish(current, snapshot('workspace-a'))).toBe(false);
  expect(fixture.publisher.publish(current, snapshot('workspace-b'))).toBe(true);
  fixture.publisher.clear();
  fixture.publisher.begin('workspace-b', 'staff-b');
  expect(fixture.publisher.publish(current, snapshot('workspace-b'))).toBe(false);
});
