import sqlite3

DB_FILE = "ratings.db"

def create_tables():
    """Creates the database tables if they don't exist."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
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
            rating INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (food_id) REFERENCES foods (id)
        )
    """)
    conn.commit()
    conn.close()

def add_food(name, station, dining_hall, meal):
    """Adds a food item to the database and returns its ID."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO foods (name, station, dining_hall, meal) VALUES (?, ?, ?, ?)", (name, station, dining_hall, meal))
        food_id = c.lastrowid
    except sqlite3.IntegrityError:
        c.execute("SELECT id FROM foods WHERE name = ? AND station = ? AND dining_hall = ? AND meal = ?", (name, station, dining_hall, meal))
        food_id = c.fetchone()[0]
    conn.commit()
    conn.close()
    return food_id

def add_rating(food_id, rating):
    """Adds or updates a rating for a food item."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    if rating == 0:
        # This is a simplified approach. In a real application, you would need user authentication
        # to identify which user's rating to remove. For this example, we'll remove the most recent rating for the food item.
        c.execute("DELETE FROM ratings WHERE id = (SELECT id FROM ratings WHERE food_id = ? ORDER BY timestamp DESC LIMIT 1)", (food_id,))
    else:
        # Check if a rating from this user already exists. Since we don't have users, we'll just update the last rating.
        c.execute("SELECT id FROM ratings WHERE food_id = ? ORDER BY timestamp DESC LIMIT 1", (food_id,))
        last_rating = c.fetchone()
        if last_rating:
            c.execute("UPDATE ratings SET rating = ? WHERE id = ?", (rating, last_rating[0]))
        else:
            c.execute("INSERT INTO ratings (food_id, rating) VALUES (?, ?)", (food_id, rating))
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
    food_ratings = {f"{row[0]}_{row[1]}_{row[2]}_{row[3]}": {"avg_rating": row[4], "rating_count": row[5]} for row in c.fetchall()}

    # Station ratings
    c.execute("""
        SELECT f.station, f.dining_hall, AVG(r.rating), COUNT(r.rating)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        GROUP BY f.station, f.dining_hall
    """)
    station_ratings = {f"{row[0]}_{row[1]}": {"avg_rating": row[2], "rating_count": row[3]} for row in c.fetchall()}

    # Dining hall ratings
    c.execute("""
        SELECT f.dining_hall, AVG(r.rating), COUNT(r.rating)
        FROM foods f
        JOIN ratings r ON f.id = r.food_id
        GROUP BY f.dining_hall
    """)
    dining_hall_ratings = {row[0]: {"avg_rating": row[1], "rating_count": row[2]} for row in c.fetchall()}

    conn.close()

    return {
        "foods": food_ratings,
        "stations": station_ratings,
        "dining_halls": dining_hall_ratings
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