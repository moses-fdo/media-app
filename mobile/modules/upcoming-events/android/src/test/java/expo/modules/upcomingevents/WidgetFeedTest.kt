package expo.modules.upcomingevents

import org.junit.Assert.*
import org.junit.Test

class WidgetFeedTest {
  private val now = 1_800_000_000_000L
  private fun event(id: String, offset: Long) = WidgetEvent(id, "An event", "Main Hall", now + offset)

  @Test fun picksThreeNearestEventsAndDropsPastStarts() {
    val events = listOf(event("past", -1), event("four", 4000), event("two", 2000), event("one", 1000), event("three", 3000))
    assertEquals(listOf("one", "two", "three"), WidgetFeed.upcoming(events, now, now + WidgetFeed.MAX_AGE, now).map { it.id })
  }

  @Test fun redrawAdvancesTheSavedListWithoutTheAppRunning() {
    val events = listOf(event("one", 1000), event("two", 2000))
    assertEquals(listOf("two"), WidgetFeed.upcoming(events, now, now + WidgetFeed.MAX_AGE, now + 1500).map { it.id })
  }

  @Test fun expiredSnapshotsNeverDisplayEventsEvenWithAnInvalidLongExpiry() {
    assertTrue(WidgetFeed.upcoming(listOf(event("one", WidgetFeed.MAX_AGE * 3)), now, now + WidgetFeed.MAX_AGE, now + WidgetFeed.MAX_AGE).isEmpty())
    assertFalse(WidgetFeed.isFresh(now, now + WidgetFeed.MAX_AGE * 10, now + WidgetFeed.MAX_AGE))
    assertFalse(WidgetFeed.isFresh(now + 120_000, now + WidgetFeed.MAX_AGE, now))
  }

  @Test fun aCompactWidgetHasOneEventAndExpandedNeverExceedsThree() {
    val events = (1..5).map { event("$it", it * 1000L) }
    assertEquals(1, WidgetFeed.upcoming(events, now, now + WidgetFeed.MAX_AGE, now, 1).size)
    assertEquals(3, WidgetFeed.upcoming(events, now, now + WidgetFeed.MAX_AGE, now, 99).size)
  }
}
