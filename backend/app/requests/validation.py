"""Shared deterministic checks for extraction, manual review and reminders."""

def required_review_reasons(data):
    reasons = []
    if not data.get('event_start'):
        reasons.append('Confirm event date and time.')
    if not data.get('setup_deadline'):
        reasons.append('Confirm setup deadline.')
    if not data.get('venue', '').strip():
        reasons.append('Confirm event venue.')
    if not data.get('requirements'):
        reasons.append('Confirm equipment requirements.')
    elif any(item.get('quantity') is None for item in data['requirements']):
        reasons.append('Confirm equipment quantities before confirming this request.')
    return reasons


def editable_email_changes(changes):
    # An omitted/empty email field is never an instruction to erase existing data.
    allowed = {'title', 'organizer', 'venue', 'contact', 'summary', 'event_start',
               'event_end', 'setup_deadline', 'requirements'}
    return {key: value for key, value in changes.items()
            if key in allowed and value is not None and value != '' and value != []}
