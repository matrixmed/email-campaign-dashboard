import os
import time
import psycopg2
from psycopg2 import pool

_connection_pool = None
_db_params = {
    'keepalives': 1,
    'keepalives_idle': 30,
    'keepalives_interval': 10,
    'keepalives_count': 3
}

def init_pool(min_conn=2, max_conn=10):
    global _connection_pool
    if _connection_pool is None:
        database_url = os.getenv('DATABASE_URL')
        if database_url:
            _connection_pool = pool.ThreadedConnectionPool(
                min_conn, max_conn, database_url, **_db_params
            )
    return _connection_pool

def get_pool():
    global _connection_pool
    if _connection_pool is None:
        init_pool()
    return _connection_pool

def close_pool():
    global _connection_pool
    if _connection_pool:
        try:
            _connection_pool.closeall()
        except Exception:
            pass
        _connection_pool = None

def _make_fresh():
    return psycopg2.connect(os.getenv('DATABASE_URL'), **_db_params)

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
        if exc_type and self._pool and self._conn:
            try:
                self._pool.putconn(self._conn, close=True)
            except Exception:
                pass
            self._conn = None
        else:
            self.close()
        return False

class FreshConnection:
    def __init__(self, conn):
        self._conn = conn

    def cursor(self, *args, **kwargs):
        return self._conn.cursor(*args, **kwargs)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        if self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False

def get_db_connection():
    p = get_pool()
    if p:
        try:
            conn = p.getconn()
        except Exception:
            close_pool()
            return FreshConnection(_make_fresh())

        try:
            cur = conn.cursor()
            cur.execute('SELECT 1')
            cur.close()
        except Exception:
            try:
                p.putconn(conn, close=True)
            except Exception:
                pass
            close_pool()
            return FreshConnection(_make_fresh())

        return PooledConnection(conn, p)
    else:
        return FreshConnection(_make_fresh())

def execute_query(query, params=None, cursor_factory=None, max_retries=2):
    for attempt in range(max_retries + 1):
        conn = get_db_connection()
        try:
            kwargs = {}
            if cursor_factory:
                kwargs['cursor_factory'] = cursor_factory
            cursor = conn.cursor(**kwargs)
            cursor.execute(query, params)
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            return rows
        except psycopg2.OperationalError:
            try:
                conn.close()
            except Exception:
                pass
            if attempt < max_retries:
                close_pool()
                time.sleep(0.5 * (attempt + 1))
                continue
            raise
        except Exception:
            try:
                conn.close()
            except Exception:
                pass
            raise