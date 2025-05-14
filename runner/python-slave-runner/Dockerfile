FROM python:3.9-slim

# Update and install system dependencies
RUN apt-get update && apt-get install -y \
    iperf3 \
    git \
    curl \
    iproute2 \
    iputils-ping \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

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

# Command to run the Flask application
CMD ["python", "app.py"] 