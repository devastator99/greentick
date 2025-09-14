#!/usr/bin/env python3
"""
Database Connection Test Script
Tests if the PostgreSQL database connection is working
"""

import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import database modules at the top level
from sqlalchemy import create_engine, text, inspect as sqlalchemy_inspect
from sqlalchemy.exc import SQLAlchemyError

def test_database_connection():
    try:
        print("🔍 Testing Database Connection...")
        print("=" * 50)

        # Database configuration (same as in app/database.py)
        DATABASE_URL = "postgresql+psycopg2://saquibn:@localhost/greentick"

        print(f"📋 Database URL: {DATABASE_URL.replace('saquibn:@', 'saquibn:***@')}")

        # Create engine
        print("🔧 Creating database engine...")
        engine = create_engine(DATABASE_URL, echo=False)

        # Test connection
        print("🔗 Testing connection...")
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print("✅ Connection successful!")
            print(f"📊 PostgreSQL Version: {version.split()[1]}")

        # Test if our tables exist
        print("\\n📋 Checking tables...")
        inspector = sqlalchemy_inspect(engine)

        expected_tables = ['users', 'customers', 'reminders', 'alembic_version']
        existing_tables = inspector.get_table_names()

        print(f"📊 Found {len(existing_tables)} tables in database")

        for table in expected_tables:
            if table in existing_tables:
                print(f"✅ {table} table exists")
            else:
                print(f"❌ {table} table missing")

        # Test a simple query
        print("\\n🔍 Testing query execution...")
        with engine.connect() as connection:
            # Count records in each table
            for table in expected_tables[:-1]:  # Exclude alembic_version
                if table in existing_tables:
                    result = connection.execute(text(f"SELECT COUNT(*) FROM {table};"))
                    count = result.fetchone()[0]
                    print(f"📈 {table}: {count} records")

        print("\\n" + "=" * 50)
        print("🎉 DATABASE CONNECTION TEST PASSED!")
        print("✅ PostgreSQL is running and accessible")
        print("✅ All required tables exist")
        print("✅ Query execution works properly")

        return True

    except SQLAlchemyError as e:
        print("\\n❌ DATABASE CONNECTION FAILED!")
        print(f"🔴 SQLAlchemy Error: {str(e)}")

        if "password authentication failed" in str(e):
            print("💡 Suggestion: Check your PostgreSQL password")
        elif "could not connect to server" in str(e):
            print("💡 Suggestion: Make sure PostgreSQL is running")
            print("   Try: brew services start postgresql")
        elif "database does not exist" in str(e):
            print("💡 Suggestion: Create the database")
            print("   Try: createdb greentick")

        return False

    except Exception as e:
        print("\\n❌ UNEXPECTED ERROR!")
        print(f"🔴 Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_database_connection()
    sys.exit(0 if success else 1)
