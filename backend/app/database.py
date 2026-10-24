from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import event
from sqlalchemy.pool import StaticPool
class Base(DeclarativeBase): pass

def database(url):
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql+psycopg://', 1)
    elif url.startswith('postgresql://') and not url.startswith('postgresql+'):
        url = url.replace('postgresql://', 'postgresql+psycopg://', 1)
    engine = create_engine(url, connect_args={'check_same_thread': False} if url.startswith('sqlite') else {}, pool_pre_ping=True, **({'poolclass': StaticPool} if url in ('sqlite://', 'sqlite:///:memory:') else {}))
    if url.startswith('sqlite'):
        @event.listens_for(engine, 'connect')
        def foreign_keys(conn, _): conn.execute('PRAGMA foreign_keys=ON')
    return engine, sessionmaker(engine, expire_on_commit=False)
