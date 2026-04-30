# Start with a lightweight Linux image that has Node.js installed
FROM node:18-bullseye-slim

# Install curl (needed to download arduino-cli)
RUN apt-get update && apt-get install -y curl

# Download and install the official Arduino CLI
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Initialize Arduino CLI and install the AVR core (for Arduino Uno)
RUN /bin/arduino-cli core update-index
RUN /bin/arduino-cli core install arduino:avr

# Set up your Node.js application directory
WORKDIR /app

# Copy your package files and install dependencies (like express)
COPY package*.json ./
RUN npm install

# Copy the rest of your server code
COPY . .

# Expose the port that Fly.io is looking for
EXPOSE 8080

# Start your microservice
CMD ["node", "server.js"]