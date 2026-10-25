package expo.modules.upcomingevents

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class UpcomingEventsWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { update(context, manager, it) }
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
    update(context, manager, id)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action in listOf(Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_CONFIGURATION_CHANGED)) updateAll(context)
  }

  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      manager.getAppWidgetIds(ComponentName(context, UpcomingEventsWidget::class.java)).forEach { update(context, manager, it) }
    }

    private fun open(context: Context, path: String): PendingIntent? {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
      launch.action = Intent.ACTION_VIEW
      launch.data = Uri.parse("mediaops:///$path")
      launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun format(timestamp: Long, pattern: String, timezone: String): String =
      SimpleDateFormat(pattern, Locale.getDefault()).apply { timeZone = TimeZone.getTimeZone(timezone) }.format(Date(timestamp))

    private fun update(context: Context, manager: AppWidgetManager, id: Int) {
      val views = RemoteViews(context.packageName, R.layout.upcoming_widget)
      val saved = WidgetStore.snapshot(context)
      val now = System.currentTimeMillis()
      val fresh = saved != null && WidgetFeed.isFresh(saved.updatedAt, saved.expiresAt, now)
      val height = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 250)
      val fontScale = context.resources.configuration.fontScale
      val count = if (height < 80 + 192 * fontScale) 1 else 3
      val events = if (fresh) WidgetFeed.upcoming(saved!!.events, saved.updatedAt, saved.expiresAt, now, count) else emptyList()
      open(context, "agenda")?.let { intent ->
        views.setOnClickPendingIntent(R.id.widget_root, intent)
        views.setOnClickPendingIntent(R.id.widget_header, intent)
        views.setOnClickPendingIntent(R.id.widget_footer, intent)
      }
      val rows = intArrayOf(R.id.widget_event_1, R.id.widget_event_2, R.id.widget_event_3)
      val titles = intArrayOf(R.id.widget_title_1, R.id.widget_title_2, R.id.widget_title_3)
      val times = intArrayOf(R.id.widget_time_1, R.id.widget_time_2, R.id.widget_time_3)
      val venues = intArrayOf(R.id.widget_venue_1, R.id.widget_venue_2, R.id.widget_venue_3)
      for (index in rows.indices) {
        val event = events.getOrNull(index)
        views.setViewVisibility(rows[index], if (event == null) View.GONE else View.VISIBLE)
        if (event != null) {
          views.setInt(titles[index], "setMaxLines", if (count == 3 || height < 220 || index > 0) 1 else 2)
          views.setViewVisibility(venues[index], if (height < 220) View.GONE else View.VISIBLE)
          views.setTextViewText(titles[index], event.title)
          views.setTextViewText(times[index], format(event.startsAt, "EEE, d MMM · h:mm a", saved!!.timezone))
          views.setTextViewText(venues[index], event.venue)
          views.setContentDescription(rows[index], "${event.title}, ${format(event.startsAt, "EEEE, d MMMM, h:mm a", saved.timezone)}, ${event.venue}")
          open(context, "requests/${Uri.encode(event.id)}")?.let { views.setOnClickPendingIntent(rows[index], it) }
        }
      }
      views.setViewVisibility(R.id.widget_empty_body, if (height < 220) View.GONE else View.VISIBLE)
      views.setInt(R.id.widget_empty_title, "setMaxLines", if (height < 220) 1 else 2)
      views.setViewVisibility(R.id.widget_empty, if (events.isEmpty()) View.VISIBLE else View.GONE)
      views.setTextViewText(R.id.widget_empty_title, context.getString(when {
        saved == null -> R.string.upcoming_widget_connect
        !fresh -> R.string.upcoming_widget_stale
        else -> R.string.upcoming_widget_empty
      }))
      views.setTextViewText(R.id.widget_empty_body, context.getString(when {
        saved == null -> R.string.upcoming_widget_connect_body
        !fresh -> R.string.upcoming_widget_stale_body
        else -> R.string.upcoming_widget_empty_body
      }))
      views.setTextViewText(R.id.widget_updated, if (saved == null) context.getString(R.string.upcoming_widget_not_synced)
        else context.getString(R.string.upcoming_widget_updated, format(saved.updatedAt, "EEE h:mm a z", saved.timezone)))
      manager.updateAppWidget(id, views)
    }
  }
}
