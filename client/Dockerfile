# Use Node.js as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Build the frontend
RUN npm run build

# Expose frontend port
EXPOSE 3000

# Start the frontend
CMD ["npm", "start"]
