import os
import psycopg2
from psycopg2 import pool

_connection_pool = None

def init_pool(min_conn=2, max_conn=10):
    global _connection_pool
    if _connection_pool is None:
        database_url = os.getenv('DATABASE_URL')
        if database_url:
            _connection_pool = pool.ThreadedConnectionPool(
                min_conn,
                max_conn,
                database_url
            )
    return _connection_pool

def get_pool():
    global _connection_pool
    if _connection_pool is None:
        init_pool()
    return _connection_pool

class PooledConnection:
    def __init__(self, conn, pool_ref):
        self._conn = conn
        self._pool = pool_ref

    def cursor(self, *args, **kwargs):
        return self._conn.cursor(*args, **kwargs)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        if self._pool and self._conn:
            self._pool.putconn(self._conn)
            self._conn = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False

def get_db_connection():
    p = get_pool()
    if p:
        conn = p.getconn()
        return PooledConnection(conn, p)
    else:
        return psycopg2.connect(os.getenv('DATABASE_URL'))

def close_pool():
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
