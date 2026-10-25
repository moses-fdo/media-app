package expo.modules.upcomingevents

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UpcomingEventsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UpcomingEvents")

    Function("beginSession") { owner: String, generation: String ->
      val context = requireNotNull(appContext.reactContext)
      WidgetStore.begin(context, owner, generation)
      UpcomingEventsWidget.updateAll(context)
    }

    Function("publish") { generation: String, payload: String ->
      val context = requireNotNull(appContext.reactContext)
      val accepted = WidgetStore.publish(context, generation, payload)
      if (accepted) UpcomingEventsWidget.updateAll(context)
      accepted
    }

    Function("clear") {
      val context = requireNotNull(appContext.reactContext)
      WidgetStore.clear(context)
      UpcomingEventsWidget.updateAll(context)
    }

    AsyncFunction("requestPin") {
      val context = requireNotNull(appContext.reactContext)
      val manager = AppWidgetManager.getInstance(context)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.isRequestPinAppWidgetSupported) {
        manager.requestPinAppWidget(ComponentName(context, UpcomingEventsWidget::class.java), null, null)
      } else false
    }
  }
}
