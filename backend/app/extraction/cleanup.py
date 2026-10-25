"""Reversibly exclude untouched legacy imports that fail the template policy."""
from copy import deepcopy
from sqlalchemy import select
from ..models import Message, RequestRecord
from ..requests.service import save_data
from ..reminders.service import schedule_request_reminders
from .provider import matches_media_template, has_template_subject


def exclude_non_template_imports(db, box):
    count = 0
    records = db.scalars(select(RequestRecord).where(RequestRecord.workspace_id == box.workspace_id).with_for_update()).all()
    for record in records:
        data = record.data
        if data.get('status') != 'needs_review' or data.get('manual_fields') or not data.get('sources'):
            continue
        if any(item.get('actor') != 'Email processing' for item in data.get('activity', [])):
            continue
        sources = [db.get(Message, source_id) for source_id in data['sources']]
        if any(source and source.workspace_id != box.workspace_id for source in sources):
            continue
        valid_sources = [s for s in sources if s is not None]
        if not valid_sources:
            if not has_template_subject(data.get('title')):
                updated = deepcopy(data)
                updated['status'] = 'dismissed'
                updated['template_excluded'] = True
                save_data(db, record, updated, record.version, 'Email processing', 'Excluded non-template email under strict media-request policy')
                schedule_request_reminders(db, record)
                count += 1
            continue
        # Retention may already have removed the source. Lack of evidence is not
        # evidence of junk: preserve tagged records when their body is unavailable.
        if any(has_template_subject(source.subject) and (not source.body or source.body == 'Source expired under retention policy') for source in valid_sources):
            continue
        if any(matches_media_template(source) for source in valid_sources):
            continue
        updated = deepcopy(data)
        updated['status'] = 'dismissed'
        updated['template_excluded'] = True
        save_data(db, record, updated, record.version, 'Email processing', 'Excluded non-template email under strict media-request policy')
        schedule_request_reminders(db, record)
        count += 1
    db.commit()
    return count
