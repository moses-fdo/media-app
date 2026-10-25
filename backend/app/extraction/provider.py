import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from .schemas import AnalysisResult
from ..schemas import RequestCreate, Requirement

HEADERS_MAP = {
    'title': ['event name', 'event title', 'title of event', 'event', 'title', 'email subject', 'subject'],
    'organizer': ['department / organizer', 'organizer', 'department', 'requested by', 'organized by'],
    'venue': ['venue', 'location', 'hall', 'room', 'place'],
    'date': ['event date', 'date'],
    'start_time': ['event time', 'starts at', 'start time', 'time'],
    'setup_deadline': ['setup deadline', 'setup by', 'setup time', 'setup'],
    'contact': ['contact person', 'contact', 'phone', 'mobile'],
    'audio': ['audio gear', 'audio equipment', 'audio requirements', 'audio'],
    'video': ['video gear', 'video equipment', 'video requirements', 'video'],
    'other_gear': ['other gear', 'other equipment', 'equipment', 'gear'],
    'notes': ['special notes', 'notes', 'summary', 'remarks', 'description']
}

ALL_KEYS = []
for k, aliases in HEADERS_MAP.items():
    for a in aliases:
        ALL_KEYS.append((a, k))
ALL_KEYS.sort(key=lambda x: -len(x[0]))

def parse_time_str(value):
    match = re.search(r'(?<![\d:])(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?![\w:])', value or '', re.I)
    if not match or (not match[2] and not match[3]):
        return None
    hour, minute, meridian = int(match[1]), int(match[2] or 0), match[3]
    if minute > 59 or (meridian and not 1 <= hour <= 12) or (not meridian and hour > 23):
        return None
    if meridian:
        hour = hour % 12 + (12 if meridian.lower() == 'pm' else 0)
    return hour, minute


def parse_date_str(value):
    value = value or ''
    parts = None
    match = re.search(r'(?<!\d)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)', value)
    if match:
        parts = tuple(map(int, match.groups()))
    else:
        match = re.search(r'(?<!\d)(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?!\d)', value)
        if match:
            parts = int(match[3]), int(match[2]), int(match[1])
        else:
            match = re.search(r'(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})', value)
            months = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
            if match and match[2][:3].lower() in months:
                parts = int(match[3]), months[match[2][:3].lower()], int(match[1])
    if parts:
        try:
            date(*parts)
            return parts
        except ValueError:
            pass
    return None


def parse_gear_items(raw, department, issues=None):
    issues = issues if issues is not None else []
    items = []
    for line in re.split(r'[\n,;]+', raw):
        cleaned = re.sub(r'^\s*(?:[-*•]\s+)+', '', line).strip()
        cleaned = re.sub(r'^\d+[.)]\s+', '', cleaned).strip()
        if not cleaned:
            continue
        quantity = None
        leading = re.match(r'^(-?\d+)\s*(?:[x×]\s*)?(.+)$', cleaned, re.I)
        trailing = re.match(r'^(.+?)\s*(?:[:x×]|\()\s*(\d+)\s*\)?$', cleaned, re.I)
        if leading:
            quantity, name = int(leading[1]), leading[2].strip()
        elif trailing:
            name, quantity = trailing[1].strip(), int(trailing[2])
        else:
            name = cleaned
        if quantity is not None and not 0 < quantity <= 100000:
            issues.append('Invalid equipment quantity; verify the equipment list.')
            quantity = None
        if len(name) >= 2:
            items.append(Requirement(title=name[:200], quantity=quantity, department=department))
        if len(items) == 100:
            issues.append('Equipment list was truncated; review the original email.')
            break
    return items


def current_message_text(text):
    lines = []
    for line in (text or '').splitlines():
        stripped = line.strip()
        if re.match(r'^(?:On .+wrote:|-----Original Message-----|--)$', stripped, re.I):
            break
        if not stripped.startswith('>'):
            lines.append(line)
    return '\n'.join(lines)


def parse_template_sections(text):
    sections, current = {}, None
    for raw in current_message_text(text).splitlines():
        line = raw.strip()
        if not line or (line.startswith('[') and line.endswith(']')):
            continue
        matched = False
        for alias, key in ALL_KEYS:
            match = re.match(r'^(?:[-*•]\s*)?' + re.escape(alias) + r'\s*[:=]\s*(.*)$', line, re.I)
            if match:
                # Preserve distinct values for ambiguity detection; never select one silently.
                value = match[1].strip()
                sections[key] = sections[key] + '\n' + value if key in sections and value != sections[key] else value
                current, matched = key, True
                break
        if not matched and current in ('audio', 'video', 'other_gear', 'notes'):
            if re.match(r'^(thanks|thank you|regards|sincerely|unsubscribe)\b', line, re.I):
                current = None
            else:
                sections[current] += '\n' + line
    return sections


def has_template_subject(subject, body=None):
    clean_sub = re.sub(r'^(?:(?:re|fw|fwd)\s*:\s*)+', '', (subject or '').strip(), flags=re.I)
    match = re.search(r'\[media\s+request\](?:\s*[:-]?\s*(.+))?', clean_sub, re.I)
    if match:
        remainder = (match.group(1) or '').strip()
        if not remainder or not re.fullmatch(r'<[^>]+>', remainder):
            return True
    if body and re.search(r'\[media\s+request\]', body[:2000], re.I):
        return True
    return False


def matches_template_fields(subject, sections, body=None):
    required = ('organizer', 'venue', 'date', 'start_time', 'setup_deadline')
    has_tag = has_template_subject(subject, body)
    return has_tag and all(sections.get(key, '').strip() for key in required) and any(sections.get(key, '').strip() for key in ('audio', 'video', 'other_gear'))


def matches_media_template(message):
    sections = {}
    sources = [message.body or ''] + [item.get('text', '') for item in (message.attachments or []) if item.get('status') == 'parsed']
    for text in sources:
        for key, value in parse_template_sections(text[:100000]).items():
            if key not in sections or not sections[key]:
                sections[key] = value
    return matches_template_fields(message.subject, sections, message.body)


class ExtractionProvider:
    def __init__(self, settings=None):
        self.tz_name = getattr(settings, 'workspace_timezone', 'Asia/Kolkata')

    def analyze(self, message):
        subject = (message.subject or '').strip()
        body = current_message_text(message.body or '')
        attachments = [a.get('text', '') for a in (message.attachments or []) if a.get('status') == 'parsed']
        sources = [body] + attachments
        sections, issues = {}, []
        for text in sources:
            parsed = parse_template_sections(text[:100000])
            for key, value in parsed.items():
                if key in sections and sections[key] and value and sections[key] != value:
                    issues.append('Conflicting ' + key.replace('_', ' ') + ' fields; review the original sources.')
                elif value or key not in sections:
                    sections[key] = value
        for key, value in sections.items():
            if key not in ('audio', 'video', 'other_gear', 'notes') and '\n' in value:
                issues.append('Multiple ' + key.replace('_', ' ') + ' values; separate events need separate requests.')
        full_text = (subject + '\n' + '\n'.join(sources))[:200000]
        followup = bool(getattr(message, 'related_request', False))
        templated = matches_template_fields(subject, sections, body)
        # A subject tag or a mention of AV equipment is not a request template.
        # Partial, structured replies are accepted only after the service links
        # the thread to an existing request; they must never create a new event.
        structured_reply = followup and has_template_subject(subject, body) and any(sections.get(key, '').strip() for key in ('venue', 'date', 'start_time', 'setup_deadline', 'audio', 'video', 'other_gear', 'contact'))
        if not templated and not structured_reply:
            return AnalysisResult(classification='irrelevant')
        unstructured = not any(sections.get(key) for key in ('date', 'venue', 'audio', 'video', 'other_gear', 'start_time'))
        if unstructured:
            issues.append('Unstructured request; verify dates, venue and equipment against the source.')
        requirements = []
        for key, department in [('audio', 'audio'), ('video', 'video'), ('other_gear', 'other')]:
            requirements.extend(parse_gear_items(sections.get(key, ''), department, issues))
        if len(requirements) > 100:
            requirements = requirements[:100]
            issues.append('Equipment list was truncated; review the original email.')
        if any(item.quantity is None for item in requirements):
            issues.append('Confirm equipment quantities before confirming this request.')
        raw_title = sections.get('title') or subject or 'Media request needs review'
        clean_title = re.sub(r'^(?:(?:re|fw|fwd)\s*:\s*)+', '', raw_title, flags=re.I)
        clean_title = re.sub(r'^\s*\[?(?:media\s*request|media)\]?\s*[:-]?\s*', '', clean_title, flags=re.I).strip() or raw_title
        payload = {'title': clean_title[:250], 'timezone': self.tz_name}
        fields, parts = [], {}
        for key in ('organizer', 'venue', 'contact', 'notes'):
            value = sections.get(key, '')
            if value:
                target = 'summary' if key == 'notes' else key
                limit = 5000 if target == 'summary' else 500
                payload[target] = value[:limit]
                fields.append(target)
        if sections.get('title'):
            fields.append('title')
        if requirements:
            payload['requirements'] = requirements
            fields.append('requirements')
        if not payload.get('organizer'):
            payload['organizer'] = (getattr(message, 'sender', '') or 'Media requester')[:500]
        if not payload.get('summary'):
            payload['summary'] = (body[:5000] if unstructured else 'Media request for ' + clean_title)[:5000]
        tz = ZoneInfo(self.tz_name)
        date_parts = parse_date_str(sections.get('date', ''))
        start = parse_time_str(sections.get('start_time', ''))
        setup = parse_time_str(sections.get('setup_deadline', ''))
        if date_parts:
            parts['date'] = date(*date_parts).isoformat()
        elif sections.get('date'):
            issues.append('Invalid event date; enter a valid calendar date.')
        for key, value, label in [('start_time', start, 'event time'), ('setup_deadline', setup, 'setup time')]:
            if sections.get(key) and not value:
                issues.append('Invalid ' + label + '; enter an explicit time.')
        if start:
            parts['start_time'] = f'{start[0]:02}:{start[1]:02}'
        if setup:
            parts['setup_time'] = f'{setup[0]:02}:{setup[1]:02}'
        if date_parts and start:
            payload['event_start'] = datetime(*date_parts, *start, tzinfo=tz)
            fields.append('event_start')
        if date_parts and setup:
            payload['setup_deadline'] = datetime(*date_parts, *setup, tzinfo=tz)
            fields.append('setup_deadline')
        elif payload.get('event_start') and not sections.get('setup_deadline'):
            payload['setup_deadline'] = payload['event_start'] - timedelta(hours=1)
            # This suggestion is review-only and is not applied to a partial follow-up.
            issues.append('Setup deadline suggested one hour before the event; confirm it before enabling reminders.')
        if payload.get('event_start') and payload.get('setup_deadline') and payload['setup_deadline'] > payload['event_start']:
            payload.pop('setup_deadline')
            fields = [key for key in fields if key != 'setup_deadline']
            issues.append('Setup deadline is after the event; correct the schedule.')
        reasons = list(issues)
        if not payload.get('event_start'):
            reasons.append('Confirm event date and time.')
        if not payload.get('setup_deadline'):
            reasons.append('Confirm setup deadline.')
        if not payload.get('venue'):
            reasons.append('Confirm event venue.')
        if not requirements:
            reasons.append('Confirm equipment requirements.')
        payload['status'] = 'needs_review' if reasons else 'new'
        return AnalysisResult(
            classification='update' if followup else 'request',
            events=[RequestCreate(**payload)],
            review_reasons=list(dict.fromkeys(reasons)),
            update_review_reasons=list(dict.fromkeys(issues)),
            event_fields=[list(dict.fromkeys(fields))],
            schedule_parts=[parts],
            source_excerpts=[full_text[:500]],
        )
