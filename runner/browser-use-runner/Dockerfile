FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set non-interactive frontend to avoid debconf prompts
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000 \
    PLAYWRIGHT_HEADLESS=0 \
    GUNICORN_WORKERS=2

# Update pip to the latest version
RUN pip install --upgrade pip

# Install Python dependencies directly
RUN pip install --no-cache-dir \
    flask==2.3.3 \
    playwright==1.52.0 \
    python-dotenv==1.0.1 \
    requests==2.32.3 \
    uvicorn==0.28.0 \
    argparse==1.4.0 \
    supabase==1.1.0 \
    asgiref==3.7.2 \
    gunicorn==22.0.0 \
    psutil==5.9.5

# Install system dependencies
RUN apt-get update && apt-get install -y \
    xvfb \
    git \
    iputils-ping \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libxss1 \
    libasound2 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libdrm2 \
    libgbm1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxinerama1 \
    libxcursor1 \
    libxi6 \
    libgl1-mesa-glx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright dependencies and Chromium
RUN playwright install-deps \
    && playwright install chromium

# Copy application code
COPY . .

RUN pip install -e .

# Expose port for Flask
EXPOSE 10000

# Run Flask app with Xvfb, binding to Render's PORT
CMD ["sh", "-c", "xvfb-run --auto-servernum --server-args='-screen 0 1280x720x16' python app.py --debug --port $PORT"]