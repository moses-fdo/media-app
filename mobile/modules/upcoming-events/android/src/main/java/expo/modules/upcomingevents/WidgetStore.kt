package expo.modules.upcomingevents

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

data class SavedFeed(val updatedAt: Long, val expiresAt: Long, val timezone: String, val events: List<WidgetEvent>)

// The snapshot lives outside Android backup. It never contains a session token,
// source email, equipment, or contact information.
object WidgetStore {
  private fun file(context: Context) = AtomicFile(File(context.noBackupFilesDir, "upcoming-events.json"))

  private fun read(context: Context): JSONObject = try {
    JSONObject(file(context).openRead().bufferedReader().use { it.readText() })
  } catch (_: Exception) { JSONObject() }

  private fun write(context: Context, value: JSONObject) {
    val destination = file(context)
    val stream = destination.startWrite()
    try {
      stream.write(value.toString().toByteArray(Charsets.UTF_8))
      destination.finishWrite(stream)
    } catch (error: Exception) {
      destination.failWrite(stream)
      throw error
    }
  }

  @Synchronized fun begin(context: Context, owner: String, generation: String) {
    val saved = read(context)
    val next = if (saved.optString("owner") == owner) saved else JSONObject()
    next.put("owner", owner).put("generation", generation)
    write(context, next)
  }

  @Synchronized fun publish(context: Context, generation: String, payload: String): Boolean {
    val saved = read(context)
    if (saved.optString("generation") != generation || payload.length > 65536) return false
    val input = JSONObject(payload)
    val events = input.optJSONArray("events") ?: JSONArray()
    val safeEvents = JSONArray()
    for (index in 0 until minOf(events.length(), 50)) {
      val event = events.optJSONObject(index) ?: continue
      val id = event.optString("id")
      val startsAt = event.optLong("startsAt")
      if (!id.matches(Regex("[A-Za-z0-9_-]{1,128}")) || startsAt <= 0) continue
      safeEvents.put(JSONObject().put("id", id).put("title", event.optString("title").take(200))
        .put("venue", event.optString("venue").take(200)).put("startsAt", startsAt))
    }
    val snapshot = JSONObject().put("updatedAt", input.getLong("updatedAt"))
      .put("expiresAt", input.getLong("expiresAt")).put("timezone", input.optString("timezone", "Asia/Kolkata"))
      .put("events", safeEvents)
    saved.put("snapshot", snapshot)
    write(context, saved)
    return true
  }

  @Synchronized fun clear(context: Context) { file(context).delete() }

  @Synchronized fun snapshot(context: Context): SavedFeed? {
    val snapshot = read(context).optJSONObject("snapshot") ?: return null
    val events = snapshot.optJSONArray("events") ?: JSONArray()
    return SavedFeed(snapshot.optLong("updatedAt"), snapshot.optLong("expiresAt"), snapshot.optString("timezone", "Asia/Kolkata"),
      (0 until events.length()).mapNotNull { index -> events.optJSONObject(index)?.let {
        WidgetEvent(it.optString("id"), it.optString("title"), it.optString("venue"), it.optLong("startsAt"))
      } })
  }
}
