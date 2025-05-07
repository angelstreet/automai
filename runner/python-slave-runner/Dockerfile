FROM docker pull mcr.microsoft.com/playwright/python:v1.50.0-noble

# Update and install system dependencies
RUN apt-get update && apt-get install -y \
    iperf3 \
    git \
    iputils-ping

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install python-dotenv requests

# Copy the application code
COPY . .

# Expose the port for Flask
EXPOSE 10000

# Command to run the Flask application
CMD ["python", "app.py"] 