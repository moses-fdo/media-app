"""Add an explicit Google identity owner to private account workspaces."""
from alembic import op
from sqlalchemy import Column, String, inspect

revision = '003'
down_revision = '002'


def upgrade():
    inspector = inspect(op.get_bind())
    # The first migration creates current metadata on fresh installations.
    if 'owner_subject' not in {column['name'] for column in inspector.get_columns('workspaces')}:
        op.add_column('workspaces', Column('owner_subject', String(), nullable=True))
    inspector = inspect(op.get_bind())
    unique_columns = [item['column_names'] for item in inspector.get_unique_constraints('workspaces')]
    unique_columns += [item['column_names'] for item in inspector.get_indexes('workspaces') if item.get('unique')]
    if ['owner_subject'] not in unique_columns:
        op.create_index('ux_workspaces_owner_subject', 'workspaces', ['owner_subject'], unique=True)


def downgrade():
    indexes = {item['name'] for item in inspect(op.get_bind()).get_indexes('workspaces')}
    if 'ux_workspaces_owner_subject' in indexes:
        op.drop_index('ux_workspaces_owner_subject', table_name='workspaces')
    with op.batch_alter_table('workspaces') as batch:
        batch.drop_column('owner_subject')
