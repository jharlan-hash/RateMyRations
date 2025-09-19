# RateMyRations - UIowa

A web application for viewing and rating dining hall menus at the University of Iowa. Students can browse daily menus from Burge, Catlett, and Hillcrest dining halls and rate individual food items.

Check out my hosted version at https://rations.jacksovern.xyz

## Features

- **Menu Display**: View daily menus from all three UIowa dining halls (Burge, Catlett, Hillcrest)
- **Dual Rating System**: See both your personal rating and community average for each food item
- **Per-Browser Ratings**: One rating per food item per browser (can re-rate, but not multiple initial ratings)
- **Date Selection**: Browse menus for different dates (up to 14 days ahead)
- **Real-time Data**: Fetches live menu data from the University of Iowa's Nutrislice API
- **Smart Caching**: LRU + TTL caching with automatic cache warming for Gunicorn workers
- **Rate Limiting**: Built-in rate limiting to prevent abuse (configurable, supports Redis)
- **Admin Console**: Full admin interface for managing ratings, users, and nicknames
- **Health Monitoring**: `/healthz` and `/readyz` endpoints for production monitoring
- **Collapsible Interface**: Expandable dining halls, meals, and stations
- **Responsive Design**: Mobile-friendly interface

## Technology Stack

- **Backend**: Flask (Python) with WSGI support
- **Database**: SQLite with WAL mode and retry logic for concurrency
- **Frontend**: HTML, CSS, JavaScript with localStorage for user data
- **Deployment**: Gunicorn WSGI server with automated cache warming
- **Caching**: In-memory LRU + TTL cache (supports Redis for distributed deployments)
- **Rate Limiting**: Flask-Limiter with configurable limits
- **Security**: Input validation, SQL injection protection, admin token authentication

## Installation

### Prerequisites

- Python 3.9+
- pip

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd RateMyRations
```

2. Install dependencies:
```bash
cd ratemyrations
pip install -r requirements.txt
```

3. Run the application:
```bash
python -m ratemyrations.app
```

The application will be available at `http://localhost:8000`

## Configuration

The application can be configured using environment variables:

### Rate Limiting
- `RATE_LIMIT_DEFAULT`: Default rate limit (default: "60 per minute")
- `RATE_LIMIT_STORAGE_URI`: Storage backend for rate limiting (default: "memory://", supports Redis)

### Admin Features
- `ADMIN_TOKEN`: Token for admin operations (required environment variable)
- `ENABLE_DELETE_RATINGS`: Enable rating deletion endpoint (default: "false")

### Caching
- `CACHE_MINUTES`: Cache duration in minutes (default: 30)
- `CACHE_MAX_SIZE`: Maximum number of cached entries (default: 64)

### Date Constraints
- `MAX_DAYS_AHEAD`: Maximum days ahead for menu queries (default: 14)

## API Endpoints

### Public Endpoints

- `GET /` - Main application interface
- `GET /about` - About page with project information
- `GET /api/menus?date=YYYY-MM-DD&refresh=true` - Get menus for a specific date
- `GET /api/ratings?date=YYYY-MM-DD` - Get all food ratings (optionally filtered by date)
- `POST /api/rate` - Submit a food rating (per-browser, one rating per food)
- `GET /healthz` - Health check endpoint
- `GET /readyz` - Readiness check endpoint (includes database and Redis connectivity)
- `GET /warm-cache` - Warm up cache for Gunicorn workers

### Admin Endpoints

- `GET /admin?token=ADMIN_TOKEN` - Admin console interface
- `GET /api/admin/ratings?token=ADMIN_TOKEN` - Get all ratings with details
- `POST /api/admin/delete-rating` - Delete a specific rating
- `POST /api/admin/update-nickname` - Set user nickname
- `POST /api/admin/ban-user` - Ban a user
- `POST /api/admin/unban-user` - Unban a user
- `POST /api/delete-ratings` - Delete all ratings (disabled by default, requires admin token)

## Project Structure

```
RateMyRations/
├── ratemyrations/           # Main application package
│   ├── app.py              # Flask application and API routes
│   ├── config.py           # Configuration settings
│   ├── database.py         # Database operations with WAL mode
│   ├── wsgi.py            # WSGI entry point for Gunicorn
│   ├── requirements.txt   # Python dependencies
│   ├── static/            # Static assets
│   │   ├── styles.css     # CSS styles with responsive design
│   │   └── script.js      # Frontend JavaScript with localStorage
│   ├── templates/         # HTML templates
│   │   ├── index.html     # Main page template
│   │   ├── about.html     # About page template
│   │   └── admin.html     # Admin console template
│   └── ratings.db         # SQLite database (auto-created)
├── get_menus.py           # Utility script to open menu URLs
├── menu_parser.py         # Standalone menu parsing utility
├── warm_cache.py          # Cache warming script for Gunicorn
├── start.sh              # Production startup script
├── API_DOCUMENTATION.md   # Comprehensive API documentation
└── urls                   # Menu URL references
```

## Development

### Running in Development Mode

```bash
cd ratemyrations
python -m ratemyrations.app
```

### Database

The application uses SQLite for storing ratings. The database is automatically created when the application starts.

### Menu Data Source

The application fetches menu data from the University of Iowa's Nutrislice API:
- API Base: `https://dininguiowa.api.nutrislice.com/menu/api/weeks/school/`
- Supports breakfast, lunch, and dinner menus
- Data is categorized by dining stations (excluding beverages, condiments, etc.)

## Deployment

### Using Gunicorn

```bash
cd ratemyrations
gunicorn -w 4 -b 0.0.0.0:8000 ratemyrations.wsgi:application
```

### Using the Production Startup Script

```bash
./start.sh
```

This script will:
- Start Gunicorn with 4 workers
- Wait for the application to be ready
- Warm the cache for all workers
- Provide process monitoring

### Docker Deployment

The application includes SELinux policies (`gunicorn.pp`, `gunicorn.te`) for containerized deployments.

### Production Considerations

- **Required**: Set a strong `ADMIN_TOKEN` environment variable
- **Optional**: Configure Redis for distributed rate limiting: `RATE_LIMIT_STORAGE_URI=redis://host:port/db`
- **Security**: Use a reverse proxy (nginx) for SSL termination
- **Monitoring**: Monitor the `/healthz` and `/readyz` endpoints
- **Performance**: Use the `start.sh` script for automatic cache warming
- **Database**: SQLite WAL mode provides good concurrency for moderate load
- **Rate Limiting**: Default is 60 requests/minute per IP (configurable)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues or questions, please [create an issue](link-to-issues) in the repository.
