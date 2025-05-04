FROM python:3.9-slim

# Update and install system dependencies
RUN apt-get update && apt-get install -y \
    iperf3 \
    git \
    iputils-ping \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up ping to work without root permissions (doesn't always work in all environments)
RUN chmod +s /bin/ping

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port for Flask
EXPOSE 10000

# Temporarily run as root for testing to resolve permission issues with ping
USER root

# Command to run the Flask application
CMD ["python", "app.py"]

# Note: For Render deployment, you may need to add the following to your service configuration:
# Docker Command: --cap-add=NET_RAW 