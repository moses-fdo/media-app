"""Recover interrupted notification jobs and index due work."""
from alembic import op
from sqlalchemy import Column, String, inspect

revision = '002'
down_revision = '001'


def upgrade():
    # The legacy initial migration uses live metadata. Support both its fresh
    # schema and an existing 001 installation without duplicating the column.
    inspector = inspect(op.get_bind())
    if 'claimed_at' not in {item['name'] for item in inspector.get_columns('reminders')}:
        op.add_column('reminders', Column('claimed_at', String(), nullable=True))
    if 'ix_reminders_status_due' not in {item['name'] for item in inspector.get_indexes('reminders')}:
        op.create_index('ix_reminders_status_due', 'reminders', ['status', 'due'])


def downgrade():
    op.drop_index('ix_reminders_status_due', table_name='reminders')
    op.drop_column('reminders', 'claimed_at')
