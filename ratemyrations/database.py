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
    
    # Ensure date column exists for older DBs
    try:
        c.execute("SELECT date FROM ratings LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE ratings ADD COLUMN date TEXT")
        # Set default date for existing ratings (today)
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        c.execute("UPDATE ratings SET date = ? WHERE date IS NULL", (today,))

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
    
    # User management table
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            nickname TEXT,
            is_banned BOOLEAN DEFAULT FALSE,
            ban_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
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


def add_rating(food_id, user_id, rating, date=None):
    """Upserts a per-user rating. If rating == 0, delete the user's rating."""
    if date is None:
        from datetime import datetime
        date = datetime.now().strftime("%Y-%m-%d")
    
    # Debug logging
    print(f"Debug DB - add_rating: food_id={food_id}, user_id={user_id}, rating={rating}, date={date}")
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    if rating == 0:
        if user_id is not None:
            for _ in range(3):
                try:
                    c.execute("DELETE FROM ratings WHERE food_id = ? AND user_id = ? AND date = ?", (food_id, user_id, date))
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
                        "DELETE FROM ratings WHERE id = (SELECT id FROM ratings WHERE food_id = ? AND date = ? ORDER BY timestamp DESC LIMIT 1)",
                        (food_id, date),
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
                    c.execute("INSERT INTO ratings (food_id, rating, date) VALUES (?, ?, ?)", (food_id, rating, date))
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
                        "UPDATE ratings SET rating = ?, timestamp = CURRENT_TIMESTAMP WHERE food_id = ? AND user_id = ? AND date = ?",
                        (rating, food_id, user_id, date),
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
                            "INSERT OR IGNORE INTO ratings (food_id, user_id, rating, date) VALUES (?, ?, ?, ?)",
                            (food_id, user_id, rating, date),
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


def get_ratings(date=None):
    """Calculates and returns the average ratings for a specific date."""
    if date is None:
        from datetime import datetime
        date = datetime.now().strftime("%Y-%m-%d")
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Food ratings - only for foods that have ratings on the given date
    c.execute("""
        SELECT f.name, f.station, f.dining_hall, f.meal, AVG(r.rating), COUNT(r.rating)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        WHERE r.date = ?
        GROUP BY f.id
    """, (date,))
    food_ratings = {}
    for row in c.fetchall():
        key = f"{row[0]}_{row[1]}_{row[2]}_{row[3]}"
        food_ratings[key] = {"avg_rating": row[4], "rating_count": row[5]}
        
        # Debug logging for Catlett items
        if row[2] == 'Catlett':  # dining_hall
            print(f"Debug DB - Catlett food: {key} -> avg: {row[4]}, count: {row[5]}")

    # Food rating distributions (1..5)
    c.execute("""
        SELECT f.name, f.station, f.dining_hall, f.meal, r.rating, COUNT(*)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        WHERE r.date = ?
        GROUP BY f.id, r.rating
    """, (date,))
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
        WHERE r.date = ?
        GROUP BY f.station, f.dining_hall
    """, (date,))
    station_ratings = {
        f"{row[0]}_{row[1]}": {"avg_rating": row[2], "rating_count": row[3]}
        for row in c.fetchall()
    }

    # Dining hall ratings
    c.execute("""
        SELECT f.dining_hall, AVG(r.rating), COUNT(r.rating)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        WHERE r.date = ?
        GROUP BY f.dining_hall
    """, (date,))
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
        WHERE r.date = ?
        GROUP BY f.dining_hall, meal_base
    """, (date,))
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


def get_all_ratings():
    """Gets all ratings with food details for admin console."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute("""
        SELECT r.id, r.user_id, r.rating, r.date, r.timestamp,
               f.name, f.station, f.dining_hall, f.meal,
               u.nickname, u.is_banned
        FROM ratings r
        JOIN foods f ON r.food_id = f.id
        LEFT JOIN users u ON r.user_id = u.user_id
        ORDER BY r.timestamp DESC
    """)
    
    ratings = []
    for row in c.fetchall():
        ratings.append({
            "id": row[0],
            "user_id": row[1],
            "rating": row[2],
            "date": row[3],
            "timestamp": row[4],
            "food_name": row[5],
            "station": row[6],
            "dining_hall": row[7],
            "meal": row[8],
            "nickname": row[9],
            "is_banned": bool(row[10]) if row[10] is not None else False
        })
    
    conn.close()
    return ratings


def update_user_nickname(user_id, nickname):
    """Updates or creates a user nickname."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    for _ in range(3):
        try:
            c.execute("""
                INSERT OR REPLACE INTO users (user_id, nickname, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (user_id, nickname))
            break
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                import time; time.sleep(0.1)
                continue
            else:
                raise
    
    conn.commit()
    conn.close()


def ban_user(user_id, ban_reason=""):
    """Bans a user."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    for _ in range(3):
        try:
            c.execute("""
                INSERT OR REPLACE INTO users (user_id, is_banned, ban_reason, updated_at)
                VALUES (?, TRUE, ?, CURRENT_TIMESTAMP)
            """, (user_id, ban_reason))
            break
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                import time; time.sleep(0.1)
                continue
            else:
                raise
    
    conn.commit()
    conn.close()


def unban_user(user_id):
    """Unbans a user."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    for _ in range(3):
        try:
            c.execute("""
                UPDATE users 
                SET is_banned = FALSE, ban_reason = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (user_id,))
            break
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                import time; time.sleep(0.1)
                continue
            else:
                raise
    
    conn.commit()
    conn.close()


def is_user_banned(user_id):
    """Checks if a user is banned."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute("SELECT is_banned FROM users WHERE user_id = ?", (user_id,))
    result = c.fetchone()
    conn.close()
    
    return bool(result[0]) if result else False


def delete_rating_by_id(rating_id):
    """Deletes a specific rating by ID."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    for _ in range(3):
        try:
            c.execute("DELETE FROM ratings WHERE id = ?", (rating_id,))
            break
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                import time; time.sleep(0.1)
                continue
            else:
                raise
    
    conn.commit()
    conn.close()
    return c.rowcount > 0


def delete_all_ratings():
    """Deletes all ratings from the database."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    for _ in range(3):
        try:
            c.execute("DELETE FROM ratings")
            break
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                import time; time.sleep(0.1)
                continue
            else:
                raise
    
    conn.commit()
    conn.close()
    return c.rowcount


if __name__ == '__main__':
    create_tables()
    print("Database tables created successfully.")

