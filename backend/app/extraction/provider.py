import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from .schemas import AnalysisResult
from ..schemas import RequestCreate, Requirement

HEADERS_MAP = {
    'title': ['event name', 'event title', 'title of event', 'event', 'title'],
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

IRRELEVANT_PATTERNS = [
    r'\bunsubscribe\b', r'\bnewsletter\b', r'\bmailer-daemon\b',
    r'\bautomated response\b', r'\bout of office\b', r'\bnotification only\b',
    r'\bno-reply@\b', r'\bdonotreply@\b'
]

def parse_time_str(s: str) -> tuple[int, int] | None:
    if not s: return None
    m = re.search(r'(\d{1,2}):(\d{2})\s*(am|pm)?', s, re.IGNORECASE)
    if not m: return None
    h, mn, mer = int(m.group(1)), int(m.group(2)), m.group(3)
    if mer:
        mer = mer.lower()
        if mer == 'pm' and h < 12: h += 12
        elif mer == 'am' and h == 12: h = 0
    if 0 <= h <= 23 and 0 <= mn <= 59: return h, mn
    return None

def parse_date_str(s: str) -> tuple[int, int, int] | None:
    if not s: return None
    m = re.search(r'(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})', s)
    if m: return int(m.group(1)), int(m.group(2)), int(m.group(3))
    m = re.search(r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', s)
    if m: return int(m.group(3)), int(m.group(2)), int(m.group(1))
    months = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
    m = re.search(r'(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})', s)
    if m:
        mo = months.get(m.group(2)[:3].lower())
        if mo: return int(m.group(3)), mo, int(m.group(1))
    return None

def parse_gear_items(raw: str, dept: str) -> list[Requirement]:
    items = []
    lines = re.split(r'[\n,]+', raw)
    for line in lines:
        cleaned = re.sub(r'^[\s\-*•]+', '', line)
        cleaned = re.sub(r'^\s*\d+[\.)]\s+', '', cleaned).strip()
        if not cleaned: continue
        qty = 1
        m = re.match(r'^(\d+)\s*(?:x\s*)?(.+)', cleaned, re.IGNORECASE)
        if m:
            qty = int(m.group(1))
            name = m.group(2).strip()
        else:
            m = re.match(r'^(.+?)\s*[:(x]\s*(\d+)\s*\)?$', cleaned, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
                qty = int(m.group(2))
            else:
                name = cleaned
        if len(name) >= 2:
            items.append(Requirement(title=name[:200], quantity=qty, department=dept))
    return items

def parse_template_sections(text: str) -> dict[str, str]:
    sections = {}
    current_key = None
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or (line.startswith('[') and line.endswith(']')):
            continue
        matched_key = None
        rest_val = ''
        for alias, key in ALL_KEYS:
            pattern = r'^(?:[-*•]\s*)?' + re.escape(alias) + r'\s*[:=-]\s*(.*)$'
            m = re.match(pattern, line, re.IGNORECASE)
            if m:
                matched_key = key
                rest_val = m.group(1).strip()
                break
        if matched_key:
            current_key = matched_key
            if rest_val:
                sections[current_key] = sections.get(current_key, '') + ('\n' if current_key in sections else '') + rest_val
        elif current_key:
            sections[current_key] = sections.get(current_key, '') + '\n' + line
    return sections

NON_MEDIA_SUBJECT_PATTERNS = [
    r'\bcircular\b',
    r'\budemy\b',
    r'\bfellowship\b',
    r'\bhackathon\b',
    r'\bawareness\s*pledge\b',
    r'\bstudent\s*representatives\b',
    r'\belection\b',
    r'\bfeedback\s*form\b',
    r'\bjob\s*alert\b',
    r'\bcongratulations\b',
    r'\bcondolence\b',
    r'\bwebinar\b',
    r'\bcourse\s*access\b',
    r'\bcall\s*for\s*applications\b',
    r'\bquantumania\b',
    r'\bastras?\b',
]

MEDIA_SUBJECT_PATTERNS = [
    r'\[media\s*request\]',
    r'\[media\]',
    r'\bmedia\s*request\b',
    r'\bmedia\s*requirement[s]?\b',
]

def has_media_subject(subject: str) -> bool:
    if not subject:
        return False
    for pat in MEDIA_SUBJECT_PATTERNS:
        if re.search(pat, subject, re.IGNORECASE):
            return True
    return False

class ExtractionProvider:
    def __init__(self, settings=None):
        self.settings = settings
        self.tz_name = getattr(settings, 'workspace_timezone', 'Asia/Kolkata') if settings else 'Asia/Kolkata'

    def analyze(self, message) -> AnalysisResult:
        body = (message.body or '').strip()
        subject = (message.subject or '').strip()
        full_text = f"{subject}\n{body}"

        if not body and not subject:
            return AnalysisResult(classification='irrelevant', events=[])
        for pat in IRRELEVANT_PATTERNS:
            if re.search(pat, full_text, re.IGNORECASE):
                return AnalysisResult(classification='irrelevant', events=[])

        is_media_subject = has_media_subject(subject)

        # Discard generic university circulars, academic notices, and non-media alerts unless explicit media request in subject
        if not is_media_subject:
            for pat in NON_MEDIA_SUBJECT_PATTERNS:
                if re.search(pat, subject, re.IGNORECASE):
                    return AnalysisResult(classification='irrelevant', events=[])

        sections = parse_template_sections(body)
        if not sections:
            sections = parse_template_sections(full_text)

        # Parse gear requirements
        reqs: list[Requirement] = []
        if 'audio' in sections:
            reqs.extend(parse_gear_items(sections['audio'], 'audio'))
        if 'video' in sections:
            reqs.extend(parse_gear_items(sections['video'], 'video'))
        if 'other_gear' in sections:
            reqs.extend(parse_gear_items(sections['other_gear'], 'other'))

        venue = sections.get('venue') or ''
        date_parts = parse_date_str(sections.get('date', ''))
        start_parts = parse_time_str(sections.get('start_time', ''))
        setup_parts = parse_time_str(sections.get('setup_deadline', ''))

        # STRICT MEDIA CRITERIA:
        # 1. If subject explicitly has [MEDIA REQUEST], accept it (staff will review if gear is missing)
        # 2. If subject does NOT have [MEDIA REQUEST], it MUST have parsed gear requirements (reqs > 0)
        # Emails without [MEDIA REQUEST] and without gear requirements are 100% IRRELEVANT.
        if not is_media_subject:
            if len(reqs) == 0:
                return AnalysisResult(classification='irrelevant', events=[])
            if not venue and not date_parts:
                return AnalysisResult(classification='irrelevant', events=[])

        # It is confirmed as a media request email
        title = sections.get('title') or subject or 'Untitled Media Request'
        # Clean title if subject had [MEDIA REQUEST] prefix
        clean_title = (re.sub(r'^\s*\[?(?:media\s*request|media)\]?\s*[:-]?\s*', '', title, flags=re.IGNORECASE).strip() or title or 'Untitled Media Request')
        organizer = sections.get('organizer') or getattr(message, 'sender', '') or 'Media Requester'
        venue = sections.get('venue') or ''
        contact = sections.get('contact') or ''
        notes = sections.get('notes') or ''

        tz = ZoneInfo(self.tz_name)
        event_start = None
        setup_deadline = None
        review_reasons = []

        if date_parts:
            y, m, d = date_parts
            if start_parts:
                sh, sm = start_parts
                event_start = datetime(y, m, d, sh, sm, tzinfo=tz)
            else:
                event_start = datetime(y, m, d, 9, 0, tzinfo=tz)

            if setup_parts:
                dh, dm = setup_parts
                setup_deadline = datetime(y, m, d, dh, dm, tzinfo=tz)
            elif event_start:
                setup_deadline = event_start - timedelta(hours=1)
        else:
            review_reasons.append('Event date not specified or could not be parsed.')

        if not reqs:
            review_reasons.append('Audio / Video equipment requirements not specified.')
        if not venue:
            review_reasons.append('Event venue not specified.')

        is_complete = bool(event_start and reqs and venue)
        event = RequestCreate(
            title=clean_title[:250],
            organizer=organizer[:500],
            venue=venue[:500],
            contact=contact[:500],
            summary=notes[:5000] or f"Media request for {clean_title} at {venue or 'designated venue'}",
            event_start=event_start,
            setup_deadline=setup_deadline,
            timezone=self.tz_name,
            requirements=reqs,
            status='new' if is_complete else 'needs_review'
        )

        return AnalysisResult(
            classification='request',
            events=[event],
            review_reasons=review_reasons,
            source_excerpts=[body[:300]] if body else []
        )

