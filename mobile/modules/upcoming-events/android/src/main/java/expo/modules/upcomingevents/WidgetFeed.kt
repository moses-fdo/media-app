package expo.modules.upcomingevents

data class WidgetEvent(val id: String, val title: String, val venue: String, val startsAt: Long)

object WidgetFeed {
  const val MAX_AGE = 86_400_000L

  fun isFresh(updatedAt: Long, expiresAt: Long, now: Long): Boolean =
    updatedAt > 0 && updatedAt <= now + 60_000 && now < expiresAt && now - updatedAt < MAX_AGE

  fun upcoming(events: List<WidgetEvent>, updatedAt: Long, expiresAt: Long, now: Long, limit: Int = 3): List<WidgetEvent> {
    if (!isFresh(updatedAt, expiresAt, now)) return emptyList()
    return events.filter { it.startsAt >= now }.distinctBy { it.id }
      .sortedWith(compareBy<WidgetEvent> { it.startsAt }.thenBy { it.id })
      .take(limit.coerceIn(1, 3))
  }
}
