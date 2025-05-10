# Use a specific Python 3.11 slim image as the base
FROM python:3.11.3-slim

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl unzip xvfb libnss3 libatk-bridge2.0-0 libgtk-3-0 libxss1 \
    libasound2 libx11-xcb1 libxcb-dri3-0 libdrm2 libgbm1 libxcomposite1 \
    libxdamage1 libxrandr2 libxinerama1 libxcursor1 libxi6 libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies directly
RUN pip install --no-cache-dir \
    flask==2.3.3 \
    flask-sock==0.7.0 \
    playwright==1.47.0 \
    python-dotenv==1.0.1 \
    requests==2.32.3 \
    uvicorn==0.28.0 \
    argparse==1.4.0 \
    asgiref==3.7.2 \
    gunicorn==21.2.0

# Install Playwright dependencies and Chromium
RUN playwright install-deps \
    && playwright install chromium

# Copy project files
COPY . .

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port for Render
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/healthz || exit 1

# Run Flask and browser_use
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT app:app"]