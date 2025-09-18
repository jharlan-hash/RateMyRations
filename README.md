# RateMyRations - UIowa

A web application for viewing and rating dining hall menus at the University of Iowa. Students can browse daily menus from Burge, Catlett, and Hillcrest dining halls and rate individual food items.

Check out my hosted version at https://rations.jacksovern.xyz

## Features

- **Menu Display**: View daily menus from all three UIowa dining halls (Burge, Catlett, Hillcrest)
- **Food Rating System**: Rate individual food items with a 5-star system
- **Date Selection**: Browse menus for different dates (up to 14 days ahead)
- **Real-time Data**: Fetches live menu data from the University of Iowa's Nutrislice API
- **Caching**: Implements intelligent caching to reduce API calls and improve performance
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Responsive Design**: Mobile-friendly interface

## Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLite (for storing ratings)
- **Frontend**: HTML, CSS, JavaScript
- **Deployment**: Gunicorn WSGI server
- **Caching**: In-memory LRU cache with TTL
- **Rate Limiting**: Flask-Limiter (supports Redis for distributed deployments)

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
- `RATE_LIMIT_DEFAULT`: Default rate limit (default: "10 per minute")
- `RATE_LIMIT_STORAGE_URI`: Storage backend for rate limiting (default: "memory://", supports Redis)

### Admin Features
- `ADMIN_TOKEN`: Token for admin operations (default: "change-me")
- `ENABLE_DELETE_RATINGS`: Enable rating deletion endpoint (default: "false")

### Caching
- `CACHE_MINUTES`: Cache duration in minutes (default: 30)
- `CACHE_MAX_SIZE`: Maximum number of cached entries (default: 64)

### Date Constraints
- `MAX_DAYS_AHEAD`: Maximum days ahead for menu queries (default: 14)

## API Endpoints

### Public Endpoints

- `GET /` - Main application interface
- `GET /api/menus?date=YYYY-MM-DD&refresh=true` - Get menus for a specific date
- `GET /api/ratings` - Get all food ratings
- `POST /api/rate` - Submit a food rating
- `GET /healthz` - Health check endpoint
- `GET /readyz` - Readiness check endpoint

### Admin Endpoints

- `POST /api/delete-ratings` - Delete all ratings (requires admin token)

## Project Structure

```
RateMyRations/
├── ratemyrations/           # Main application package
│   ├── app.py              # Flask application and API routes
│   ├── config.py           # Configuration settings
│   ├── database.py         # Database operations
│   ├── wsgi.py            # WSGI entry point
│   ├── requirements.txt   # Python dependencies
│   ├── static/            # Static assets
│   │   ├── styles.css     # CSS styles
│   │   └── script.js      # Frontend JavaScript
│   ├── templates/         # HTML templates
│   │   └── index.html     # Main page template
│   └── ratings.db         # SQLite database
├── get_menus.py           # Utility script to open menu URLs
├── menu_parser.py         # Standalone menu parsing utility
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

### Docker Deployment

The application includes SELinux policies (`gunicorn.pp`, `gunicorn.te`) for containerized deployments.

### Production Considerations

- Set a strong `ADMIN_TOKEN` environment variable
- Configure Redis for distributed rate limiting: `RATE_LIMIT_STORAGE_URI=redis://host:port/db`
- Use a reverse proxy (nginx) for SSL termination
- Monitor the `/healthz` and `/readyz` endpoints

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
