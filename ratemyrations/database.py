import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "ratings.db")

def create_tables():
    """Creates the database tables if they don't exist."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # SQLite pragmas for better concurrency on reads
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA synchronous=NORMAL")
    c.execute("PRAGMA busy_timeout=3000")
    c.execute("""
        CREATE TABLE IF NOT EXISTS foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            station TEXT NOT NULL,
            dining_hall TEXT NOT NULL,
            meal TEXT NOT NULL,
            UNIQUE(name, station, dining_hall, meal)
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_id INTEGER NOT NULL,
            user_id TEXT,
            rating INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (food_id) REFERENCES foods (id)
        )
    """)
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_ratings_food_id ON ratings (food_id)
    """)
    # Ensure user_id column exists for older DBs
    try:
        c.execute("SELECT user_id FROM ratings LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE ratings ADD COLUMN user_id TEXT")

    # Unique per-user per-food ratings (ignore rows where user_id is NULL)
    c.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_ratings_food_user
        ON ratings (food_id, user_id)
        WHERE user_id IS NOT NULL
    """)
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_foods_unique ON foods (name, station, dining_hall, meal)
    """
    )
    conn.commit()
    conn.close()


def add_food(name, station, dining_hall, meal):
    """Adds a food item to the database and returns its ID."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # Retry on database is locked
    for _ in range(3):
        try:
            c.execute(
                "INSERT OR IGNORE INTO foods (name, station, dining_hall, meal) VALUES (?, ?, ?, ?)",
                (name, station, dining_hall, meal),
            )
            break
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                import time; time.sleep(0.1)
                continue
            else:
                raise
    if c.rowcount:
        food_id = c.lastrowid
    else:
        c.execute(
            "SELECT id FROM foods WHERE name = ? AND station = ? AND dining_hall = ? AND meal = ?",
            (name, station, dining_hall, meal),
        )
        row = c.fetchone()
        food_id = row[0] if row else None
    conn.commit()
    conn.close()
    return food_id


def add_rating(food_id, user_id, rating):
    """Upserts a per-user rating. If rating == 0, delete the user's rating."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    if rating == 0:
        if user_id is not None:
            for _ in range(3):
                try:
                    c.execute("DELETE FROM ratings WHERE food_id = ? AND user_id = ?", (food_id, user_id))
                    break
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e):
                        import time; time.sleep(0.1)
                        continue
                    else:
                        raise
        else:
            # Fallback: delete most recent if no user provided (legacy behavior)
            for _ in range(3):
                try:
                    c.execute(
                        "DELETE FROM ratings WHERE id = (SELECT id FROM ratings WHERE food_id = ? ORDER BY timestamp DESC LIMIT 1)",
                        (food_id,),
                    )
                    break
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e):
                        import time; time.sleep(0.1)
                        continue
                    else:
                        raise
    else:
        if user_id is None:
            # Legacy insert without user tracking
            for _ in range(3):
                try:
                    c.execute("INSERT INTO ratings (food_id, rating) VALUES (?, ?)", (food_id, rating))
                    break
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e):
                        import time; time.sleep(0.1)
                        continue
                    else:
                        raise
        else:
            # Emulate upsert: try update first, then insert if no row updated
            for _ in range(3):
                try:
                    c.execute(
                        "UPDATE ratings SET rating = ?, timestamp = CURRENT_TIMESTAMP WHERE food_id = ? AND user_id = ?",
                        (rating, food_id, user_id),
                    )
                    break
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e):
                        import time; time.sleep(0.1)
                        continue
                    else:
                        raise
            if c.rowcount == 0:
                for _ in range(3):
                    try:
                        c.execute(
                            "INSERT OR IGNORE INTO ratings (food_id, user_id, rating) VALUES (?, ?, ?)",
                            (food_id, user_id, rating),
                        )
                        break
                    except sqlite3.OperationalError as e:
                        if "database is locked" in str(e):
                            import time; time.sleep(0.1)
                            continue
                        else:
                            raise
    conn.commit()
    conn.close()


def get_ratings():
    """Calculates and returns the average ratings."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Food ratings
    c.execute("""
        SELECT f.name, f.station, f.dining_hall, f.meal, AVG(r.rating), COUNT(r.rating)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        GROUP BY f.id
    """)
    food_ratings = {
        f"{row[0]}_{row[1]}_{row[2]}_{row[3]}": {"avg_rating": row[4], "rating_count": row[5]}
        for row in c.fetchall()
    }

    # Food rating distributions (1..5)
    c.execute("""
        SELECT f.name, f.station, f.dining_hall, f.meal, r.rating, COUNT(*)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        GROUP BY f.id, r.rating
    """)
    distributions = {}
    for row in c.fetchall():
        key = f"{row[0]}_{row[1]}_{row[2]}_{row[3]}"
        if key not in distributions:
            distributions[key] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        distributions[key][int(row[4])] = row[5]

    # Merge distributions into food_ratings
    for key, dist in distributions.items():
        if key in food_ratings:
            food_ratings[key]["dist"] = dist
        else:
            food_ratings[key] = {"avg_rating": 0, "rating_count": sum(dist.values()), "dist": dist}

    # Station ratings
    c.execute("""
        SELECT f.station, f.dining_hall, AVG(r.rating), COUNT(r.rating)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        GROUP BY f.station, f.dining_hall
    """)
    station_ratings = {
        f"{row[0]}_{row[1]}": {"avg_rating": row[2], "rating_count": row[3]}
        for row in c.fetchall()
    }

    # Dining hall ratings
    c.execute("""
        SELECT f.dining_hall, AVG(r.rating), COUNT(r.rating)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        GROUP BY f.dining_hall
    """)
    dining_hall_ratings = {
        row[0]: {"avg_rating": row[1], "rating_count": row[2]} for row in c.fetchall()
    }

    # Meal ratings (normalize slugs like 'dinner-3' -> 'dinner')
    c.execute("""
        SELECT 
            f.dining_hall,
            CASE
                WHEN f.meal LIKE 'breakfast%' THEN 'breakfast'
                WHEN f.meal LIKE 'lunch%' THEN 'lunch'
                WHEN f.meal LIKE 'dinner%' THEN 'dinner'
                ELSE f.meal
            END AS meal_base,
            AVG(r.rating),
            COUNT(r.rating)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        GROUP BY f.dining_hall, meal_base
    """)
    meal_ratings = {
        f"{row[0]}_{row[1]}": {"avg_rating": row[2], "rating_count": row[3]}
        for row in c.fetchall()
    }

    conn.close()

    return {
        "foods": food_ratings,
        "stations": station_ratings,
        "dining_halls": dining_hall_ratings,
        "meals": meal_ratings,
    }


def delete_all_ratings():
    """Deletes all ratings from the database."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM ratings")
    conn.commit()
    conn.close()


if __name__ == '__main__':
    create_tables()
    print("Database tables created successfully.")

