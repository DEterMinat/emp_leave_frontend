FROM nginx:alpine

# Copy frontend files to Nginx static root
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
