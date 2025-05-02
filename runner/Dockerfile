# Dockerfile
FROM node:20

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip

# Set working directory
WORKDIR /app

# Copy Node.js dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy Python dependencies
COPY scripts/requirements.txt ./scripts/
RUN pip3 install -r scripts/requirements.txt

# Copy application code
COPY . .

# Start Node.js app
CMD ["node", "index.js"]