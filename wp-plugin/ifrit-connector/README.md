# Ifrit Connector - WordPress Plugin

Lightweight connector between WordPress and Ifrit dashboard. Enables analytics sync, content publishing, webhooks, and remote management.

## Installation

1. Download the `ifrit-connector` folder
2. Upload to `/wp-content/plugins/` on your WordPress site
3. Activate via WordPress Admin → Plugins
4. Configure at Settings → Ifrit Connector

## Features

### 🔗 REST API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ifrit/v1/health` | GET | Health check (public) |
| `/ifrit/v1/site` | GET | Site information |
| `/ifrit/v1/analytics` | GET | Analytics data |
| `/ifrit/v1/posts` | POST | Create new post |
| `/ifrit/v1/posts/{id}` | PUT | Update existing post |
| `/ifrit/v1/media` | POST | Upload media |
| `/ifrit/v1/plugins` | GET | List plugins |
| `/ifrit/v1/plugins/install` | POST | Install plugin |

### 📡 Webhooks

Sends notifications to Ifrit when:
- `post.published` - New post is published
- `post.updated` - Published post is updated
- `post.deleted` - Post is deleted
- `post.status_changed` - Post status changes

### 📊 Analytics Bridge

Fetches data from:
- **Site Kit by Google** (if installed): Search Console, Analytics, AdSense
- **WordPress Stats**: Post counts, comments, top content
- **PageSpeed Insights**: Core Web Vitals (public API)

### 📝 Content Receiver

Accepts content from Ifrit campaigns:
- Create posts with title, content, excerpt
- Set categories, tags, author
- Upload featured image from URL or base64
- Store custom meta fields
- Track Ifrit campaign source

### ⚙️ Remote Management

**Disabled by default for security.**

When enabled, allows Ifrit to:
- Install plugins from WordPress.org
- Activate/deactivate plugins

## Authentication

All endpoints (except `/health`) require authentication via API token.

**Header authentication:**
```
X-Ifrit-Token: your-64-character-token
```

**Or query parameter:**
```
/ifrit/v1/site?token=your-64-character-token
```

## Connecting to Ifrit

1. Install and activate the plugin
2. Go to Settings → Ifrit Connector
3. Copy the **API Token**
4. In Ifrit, add a new WP Site with:
   - Site URL
   - API Token
5. Optionally configure webhook URL for real-time events

## Security

- API token is 64 random characters
- Token can be regenerated anytime
- Webhooks include HMAC signature
- Remote management disabled by default
- All inputs are sanitized

## Requirements

- WordPress 6.0+
- PHP 8.0+
- HTTPS (recommended)

## Changelog

### 1.0.0
- Initial release
- REST API endpoints
- Webhook system
- Analytics bridge (Site Kit + WP stats)
- Content receiver
- Remote plugin management
- Admin settings page

## License

GPL v2 or later
