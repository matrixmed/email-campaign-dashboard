from models import init_db
from dotenv import load_dotenv

load_dotenv()

if __name__ == '__main__':
    print("Initializing database schema...")
    engine = init_db()
    print("Database schema created successfully!")
    print(f"Connected to: {engine.url}")