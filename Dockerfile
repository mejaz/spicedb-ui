# Use an official Node.js runtime as a parent image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install dependencies (only the necessary files for installing deps)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Run the Next.js application in production
CMD ["npm", "start"]
