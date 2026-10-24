from alembic import context
from app.config import Settings
from app.database import database, Base
from app import models
config=context.config
engine,_=database(Settings().database_url)
with engine.connect() as connection:
    context.configure(connection=connection,target_metadata=Base.metadata,render_as_batch=engine.dialect.name=='sqlite')
    with context.begin_transaction():context.run_migrations()
