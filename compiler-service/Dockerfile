# Start with a lightweight Linux image that has Node.js installed
FROM node:20-bullseye-slim

# Install curl (needed to download arduino-cli) as root
RUN apt-get update && apt-get install -y curl

# Download and install the official Arduino CLI into /bin (requires root)
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Set up your Node.js application directory
WORKDIR /app

# Copy your package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your server code
COPY . .

# SECURITY SANDBOX: Transfer ownership to the restricted 'node' user
RUN chown -R node:node /app

# Switch execution from 'root' to the restricted 'node' user
USER node

# FIX: Install the Arduino core *as the node user* so it goes to /home/node/.arduino15
RUN /bin/arduino-cli core update-index
RUN /bin/arduino-cli core install arduino:avr

# Expose the port that Fly.io is looking for
EXPOSE 8080

# Start your microservice
CMD ["npm", "start"]
