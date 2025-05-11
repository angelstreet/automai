# Use a specific Python 3.11 slim image as the base
FROM python:3.11.3-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000 \
    DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_HEADLESS=1 \
    DISPLAY=:99

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl unzip xvfb xauth dbus libnss3 libatk-bridge2.0-0 libgtk-3-0 libxss1 \
    libasound2 libx11-xcb1 libxcb-dri3-0 libdrm2 libgbm1 libxcomposite1 \
    libxdamage1 libxrandr2 libxinerama1 libxcursor1 libxi6 libgl1-mesa-glx \
    tightvncserver websockify wget \
    && rm -rf /var/lib/apt/lists/*

# Install noVNC
RUN wget https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.tar.gz && \
    tar -xzf v1.4.0.tar.gz && mv noVNC-1.4.0 /noVNC

# Install Python dependencies directly
RUN pip install --upgrade pip && \
    pip install --no-cache-dir \
    flask==2.3.3 \
    flask-sock==0.7.0 \
    playwright \
    python-dotenv==1.0.1 \
    requests==2.32.3 \
    gunicorn==21.2.0 \
    supabase==1.1.0 \
    gevent==24.2.1 \
    boto3==1.35.24

# Install Playwright dependencies and browser
RUN playwright install-deps && playwright install chromium

# Copy project files, including .env
COPY . .
COPY .env .env

# Install the package from the current directory
RUN pip install -e .

# Expose port for Render
EXPOSE 10000 6080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/healthz || exit 1

# Run Flask with Gunicorn and xvfb-run
CMD ["sh", "-c", "xvfb-run --auto-servernum --server-args='-screen 0 1280x720x24' gunicorn -w 4 -b 0.0.0.0:$PORT app:app"]