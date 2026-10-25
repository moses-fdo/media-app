from copy import deepcopy
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import select
from ..models import RequestRecord, Message, Mailbox, Workspace, uid
from ..requests.service import create_request, save_data
from ..requests.validation import editable_email_changes
from ..reminders.service import schedule_request_reminders


def apply_schedule_parts(changes, parts, existing):
    zone = ZoneInfo(existing.get('timezone', 'Asia/Kolkata'))
    original = datetime.fromisoformat(existing['event_start']).astimezone(zone) if existing.get('event_start') else None
    day = parts.get('date') or (original.date().isoformat() if original else None)
    start = parts.get('start_time') or (original.strftime('%H:%M') if original else None)
    if day and start and ('date' in parts or 'start_time' in parts):
        updated = datetime.fromisoformat(day + 'T' + start).replace(tzinfo=zone)
        changes['event_start'] = updated.isoformat()
        if 'date' in parts and original and existing.get('setup_deadline') and 'setup_time' not in parts:
            setup = datetime.fromisoformat(existing['setup_deadline']).astimezone(zone)
            changes['setup_deadline'] = (setup + timedelta(days=(updated.date() - original.date()).days)).isoformat()
    if day and parts.get('setup_time'):
        changes['setup_deadline'] = datetime.fromisoformat(day + 'T' + parts['setup_time']).replace(tzinfo=zone).isoformat()
    return changes


def process_message(db, message, provider):
    # Serialize extraction within a mailbox as well as for the message itself.
    # This prevents separate workers from creating two events for the same thread.
    db.scalar(select(Mailbox).where(Mailbox.id == message.mailbox_id).with_for_update())
    message = db.scalar(select(Message).where(Message.id == message.id).with_for_update().execution_options(populate_existing=True))
    if not message or message.status == 'processed':
        return
    related = []
    for record in db.scalars(select(RequestRecord).where(RequestRecord.workspace_id == message.workspace_id)):
        if record.data.get('status') == 'dismissed' and record.data.get('template_excluded'):
            continue
        for source_id in record.data.get('sources', []):
            source = db.get(Message, source_id)
            if source and source.mailbox_id == message.mailbox_id and source.thread_id == message.thread_id:
                related.append(record)
                break
    message.related_request = bool(related)
    workspace = db.get(Workspace, message.workspace_id)
    if workspace and hasattr(provider, 'tz_name'):
        provider.tz_name = workspace.timezone
    forced_review = message.classification == 'uncertain'
    analysis = provider.analyze(message)
    attachment_review = any(a.get('status') == 'manual_review' for a in (message.attachments or []))
    message.classification = analysis.classification
    if analysis.classification == 'irrelevant':
        message.body = ''
        message.attachments = []
    else:
        events = analysis.events
        if not events:
            from ..schemas import RequestCreate
            events = [RequestCreate(title=message.subject or 'Request needs review')]
        for index, event in enumerate(events):
            payload = event.model_dump(mode='json')
            payload['status'] = 'new'
            for req in payload['requirements']:
                req.update(id=uid(), status='pending', assignee_id=None, version=1)
            reasons = list(analysis.review_reasons)
            if forced_review or analysis.classification == 'uncertain':
                reasons.append('Confirm this is a media request')
            if attachment_review:
                reasons.append('Review unsupported or incomplete attachment')
            candidates = [record for record in related if record.data['title'].casefold() == payload['title'].casefold()]
            if not candidates and len(related) == 1 and len(events) == 1:
                candidates = related
            if candidates:
                record = candidates[0]
                data = deepcopy(record.data)
                fields = analysis.event_fields[index] if index < len(analysis.event_fields) else event.model_fields_set
                changes = editable_email_changes({key: value for key, value in payload.items() if key in fields})
                if index < len(analysis.schedule_parts):
                    changes = apply_schedule_parts(changes, analysis.schedule_parts[index], data)
                update_reasons = list(analysis.update_review_reasons if analysis.event_fields else reasons)
                if attachment_review:
                    update_reasons.append('Review unsupported or incomplete attachment')
                # No changes is still a reviewable note; staff must decide what it means.
                if not changes:
                    update_reasons.append('Follow-up contains no unambiguous field changes; review the source email.')
                data['proposed_updates'].append({
                    'id': uid(), 'source_id': message.id, 'base_version': record.version,
                    'base_values': {key: deepcopy(data.get(key)) for key in changes},
                    'changes': changes, 'review_reasons': list(dict.fromkeys(update_reasons)),
                })
                data['sources'] = list(dict.fromkeys(data['sources'] + [message.id]))
                save_data(db, record, data, record.version, 'Email processing', 'New email update requires review')
            elif not related:
                record = create_request(db, message.workspace_id, payload, sources=[message.id], review_reasons=reasons)
                schedule_request_reminders(db, record)
        message.attachments = [{key: value for key, value in a.items() if key != 'inline_data'} for a in (message.attachments or [])]
    message.status = 'processed'
    message.error = None
    db.commit()
