import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { WidgetBridge, WidgetPublisher } from './session';

type NativeWidget = WidgetBridge & { requestPin: () => Promise<boolean> };
const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeWidget>('UpcomingEvents') : null;
export const widgetAvailable = !!native;
export const widgetPublisher = new WidgetPublisher(native || { beginSession: () => {}, publish: () => false, clear: () => {} });
export const requestWidgetPin = () => native?.requestPin() ?? Promise.resolve(false);
