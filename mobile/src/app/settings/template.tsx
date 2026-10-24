import React, { useState } from 'react';
import { View, ScrollView, Pressable, Platform, Share, Alert } from 'react-native';
import { router } from 'expo-router';
import { Copy, Check, Share2, FileText, CheckCircle2, Info, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Label, Button } from '../../components/ui';

export const STANDARD_MEDIA_REQUEST_TEMPLATE = `Email Subject: [MEDIA REQUEST] Morning Chapel Service

Department / Organizer: Department of Student Affairs
Venue: Main Auditorium
Date: 2026-11-20
Event Time: 10:00 AM
Setup Deadline: 08:30 AM
Audio Gear:
- 4 Wireless Microphones
- 1 Podium Mic
- 2 PA Speakers
Video Gear:
- 1 LED Wall Display
- 2 HD Cameras
Contact Person: Dr. John (9876543210)
Special Notes: Live streaming on YouTube required.`;

export const BLANK_MEDIA_REQUEST_TEMPLATE = `Email Subject: [MEDIA REQUEST] <Event Name>

Department / Organizer: 
Venue: 
Date: YYYY-MM-DD
Event Time: 10:00 AM
Setup Deadline: 08:30 AM
Audio Gear: 
- 
Video Gear: 
- 
Contact Person: 
Special Notes: `;

export default function TemplateSettings() {
  const { colors: c } = useTheme();
  const [copiedBlank, setCopiedBlank] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  async function handleCopy(text: string, setCopied: (v: boolean) => void) {
    let success = false;
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          success = true;
        } else {
          const el = document.createElement('textarea');
          el.value = text;
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
          success = true;
        }
      } catch (err) {
        success = false;
      }
    } else {
      try {
        await Share.share({ message: text });
        success = true;
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      Alert.alert('Copy Template', text);
    }
  }

  async function handleShare(text: string) {
    try {
      await Share.share({
        title: 'Karunya Media Desk Request Template',
        message: text,
      });
    } catch {
      // User dismissed
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        gap: 20,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
        paddingBottom: 60,
      }}
    >
      {/* Intro Banner */}
      <View
        style={{
          padding: 16,
          backgroundColor: c.blueSoft,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.blue,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles size={20} color={c.blue} />
          <Label bold size={16} style={{ color: c.blue }}>
            Automated Request Extraction
          </Label>
        </View>
        <Label size={13} style={{ color: c.ink, lineHeight: 19 }}>
          Share this standard format with organizers and departments. When requesters send emails using this format, the app instantly extracts equipment lists, venues, setup deadlines, and dates deterministically without delays.
        </Label>
      </View>

      {/* Blank Reusable Template */}
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.line,
          padding: 18,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color={c.blue} />
            <Label bold size={16}>Standard Template (Fill-in)</Label>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share blank template"
              onPress={() => handleShare(BLANK_MEDIA_REQUEST_TEMPLATE)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: c.input,
              }}
            >
              <Share2 size={15} color={c.ink} />
              <Label size={12} bold>Share</Label>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copy blank template"
              onPress={() => handleCopy(BLANK_MEDIA_REQUEST_TEMPLATE, setCopiedBlank)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: copiedBlank ? c.greenSoft : c.blue,
              }}
            >
              {copiedBlank ? (
                <>
                  <Check size={15} color={c.green} />
                  <Label size={12} bold style={{ color: c.green }}>Copied!</Label>
                </>
              ) : (
                <>
                  <Copy size={15} color="#fff" />
                  <Label size={12} bold style={{ color: '#fff' }}>Copy</Label>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <View
          style={{
            backgroundColor: c.bg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: c.line,
            padding: 14,
          }}
        >
          <Label
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              fontSize: 13,
              lineHeight: 20,
              color: c.ink,
            }}
          >
            {BLANK_MEDIA_REQUEST_TEMPLATE}
          </Label>
        </View>
      </View>

      {/* Field Guidelines */}
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.line,
          padding: 18,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Info size={18} color={c.blue} />
          <Label bold size={16}>Field Reference & Supported Formats</Label>
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ gap: 3 }}>
            <Label bold size={13}>Email Subject: [MEDIA REQUEST]</Label>
            <Label size={12} muted>Always include [MEDIA REQUEST] in the subject line (e.g., "[MEDIA REQUEST] Youth Summit"). This ensures the app immediately identifies the email, while automatically ignoring newsletters, campus circulars, and job alerts.</Label>
          </View>
          <View style={{ height: 1, backgroundColor: c.line }} />

          <View style={{ gap: 3 }}>
            <Label bold size={13}>[MEDIA REQUEST] Body Tag</Label>
            <Label size={12} muted>Header marker placed at the top of the email body.</Label>
          </View>
          <View style={{ height: 1, backgroundColor: c.line }} />

          <View style={{ gap: 3 }}>
            <Label bold size={13}>Date</Label>
            <Label size={12} muted>Supports YYYY-MM-DD (2026-11-20), DD/MM/YYYY (20/11/2026), or DD Mon YYYY (20 Nov 2026).</Label>
          </View>
          <View style={{ height: 1, backgroundColor: c.line }} />

          <View style={{ gap: 3 }}>
            <Label bold size={13}>Event Time & Setup Deadline</Label>
            <Label size={12} muted>Supports 12-hour (10:00 AM) or 24-hour (14:30) formats. If Setup Deadline is omitted, it defaults to 1 hour prior to event start.</Label>
          </View>
          <View style={{ height: 1, backgroundColor: c.line }} />

          <View style={{ gap: 3 }}>
            <Label bold size={13}>Audio Gear & Video Gear</Label>
            <Label size={12} muted>Itemized lists with quantities (e.g., "4 Wireless Microphones", "Podium Mic: 1", "2 LED Walls"). Items can be separated by new lines or commas.</Label>
          </View>
          <View style={{ height: 1, backgroundColor: c.line }} />

          <View style={{ gap: 3 }}>
            <Label bold size={13}>Unformatted Emails</Label>
            <Label size={12} muted>If a requester sends a casual email without the template, the app flags it as "Needs Review" so staff can verify and confirm details manually.</Label>
          </View>
        </View>
      </View>

      {/* Sample Complete Request */}
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.line,
          padding: 18,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color={c.green} />
            <Label bold size={16}>Completed Example</Label>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy sample template"
            onPress={() => handleCopy(STANDARD_MEDIA_REQUEST_TEMPLATE, setCopiedSample)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: copiedSample ? c.greenSoft : c.input,
            }}
          >
            {copiedSample ? (
              <>
                <Check size={14} color={c.green} />
                <Label size={12} bold style={{ color: c.green }}>Copied!</Label>
              </>
            ) : (
              <>
                <Copy size={14} color={c.ink} />
                <Label size={12} bold>Copy Example</Label>
              </>
            )}
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: c.bg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: c.line,
            padding: 14,
          }}
        >
          <Label
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              fontSize: 12,
              lineHeight: 18,
              color: c.ink,
            }}
          >
            {STANDARD_MEDIA_REQUEST_TEMPLATE}
          </Label>
        </View>
      </View>

      {/* Back Button */}
      <View style={{ marginTop: 10 }}>
        <Button
          title="Back to Settings"
          quiet
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
        />
      </View>
    </ScrollView>
  );
}
