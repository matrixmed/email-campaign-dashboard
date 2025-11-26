import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()
    cursor.execute('SELECT version();')
    version = cursor.fetchone()
    print(f'PostgreSQL version: {version[0]}')
    cursor.close()
    conn.close()
    print('Database connection successful!')
except Exception as e:
    print(f'Database connection failed: {e}')