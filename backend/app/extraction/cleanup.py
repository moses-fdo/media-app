"""Reversibly exclude untouched legacy imports that fail the template policy."""
from copy import deepcopy
from sqlalchemy import select
from ..models import Message, RequestRecord
from ..requests.service import save_data
from ..reminders.service import schedule_request_reminders
from .provider import matches_media_template, has_template_subject


def exclude_non_template_imports(db, box_or_workspace_id):
    workspace_id = box_or_workspace_id.workspace_id if hasattr(box_or_workspace_id, 'workspace_id') else box_or_workspace_id
    mailbox_id = getattr(box_or_workspace_id, 'id', None)
    count = 0
    records = db.scalars(select(RequestRecord).where(RequestRecord.workspace_id == workspace_id).with_for_update()).all()
    # 1. Rescue any requests that were accidentally dismissed under template_excluded but actually match
    for record in records:
        data = record.data
        if data.get('template_excluded') and data.get('status') == 'dismissed':
            sources = [db.get(Message, sid) for sid in data.get('sources', [])]
            valid_sources = [s for s in sources if s is not None and s.workspace_id == workspace_id]
            is_valid = False
            if valid_sources and any(matches_media_template(s) for s in valid_sources):
                is_valid = True
            elif data.get('requirements') and len(data.get('requirements', [])) > 0:
                is_valid = True
            elif has_template_subject(data.get('title')):
                is_valid = True
            if is_valid:
                from ..requests.validation import required_review_reasons
                updated = deepcopy(data)
                updated.pop('template_excluded', None)
                reasons = required_review_reasons(updated)
                updated['status'] = 'needs_review' if reasons else 'new'
                updated['review_reasons'] = reasons
                save_data(db, record, updated, record.version, 'Email processing', 'Restored valid media request')
                schedule_request_reminders(db, record)

    # 2. Exclude untouched non-template imports
    records = db.scalars(select(RequestRecord).where(RequestRecord.workspace_id == workspace_id).with_for_update()).all()
    for record in records:
        data = record.data
        if data.get('status') in ('dismissed', 'cancelled'):
            continue
        if data.get('manual_fields'):
            continue
        if not data.get('sources') and not any(item.get('actor') == 'Email processing' for item in data.get('activity', [])):
            continue
        if any(item.get('actor') not in ('Email processing', 'System') for item in data.get('activity', [])):
            continue
        sources = [db.get(Message, source_id) for source_id in data.get('sources', [])]
        valid_sources = [s for s in sources if s is not None and s.workspace_id == workspace_id]
        if valid_sources:
            if any(matches_media_template(source) for source in valid_sources):
                continue
            if any(has_template_subject(source.subject, source.body) and (not source.body or source.body == 'Source expired under retention policy') for source in valid_sources):
                continue
        else:
            if data.get('requirements') and data.get('venue') and (has_template_subject(data.get('title')) or len(data.get('requirements', [])) >= 1):
                continue
        updated = deepcopy(data)
        updated['status'] = 'dismissed'
        updated['template_excluded'] = True
        save_data(db, record, updated, record.version, 'Email processing', 'Excluded non-template email under strict media-request policy')
        schedule_request_reminders(db, record)
        count += 1
    # Rescue any messages that were previously misclassified as irrelevant but match the media request template
    msg_query = select(Message).where(Message.workspace_id == workspace_id, Message.classification == 'irrelevant')
    if mailbox_id:
        msg_query = msg_query.where(Message.mailbox_id == mailbox_id)
    for msg in db.scalars(msg_query).all():
        if msg.body and matches_media_template(msg):
            msg.status = 'queued'
            msg.classification = None
            db.flush()
    db.commit()
    return count

