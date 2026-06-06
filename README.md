# HeritCraft

HeritCraft is a full-stack artisan e-commerce web application built for buying and selling handmade products.

## Features

- Buyer, Seller, and Admin roles
- User login and registration
- Seller product management
- Product listing and product details
- Cart and checkout
- Razorpay test mode payment integration
- COD payment support
- Wishlist management
- Order tracking
- Buyer dashboard
- Seller dashboard
- Admin dashboard
- Product reviews and ratings
- Sales reports with export support

## Tech Stack

Frontend:
React.js, Vite, CSS, Axios

Backend:
Java, Spring Boot, REST API

Databases:
Oracle Database for users  
MongoDB for products, cart, orders, reviews, wishlist

Payment:
Razorpay Test Mode

## Project Structure

Frontend:
React UI, pages, components, context, API services

Backend:
Microservices for user, product, cart, order, review, report, and payment handling

## Main Modules

- Authentication
- Product Management
- Cart
- Checkout
- Orders
- Payments
- Wishlist
- Reviews
- Reports
- Admin Management

## Payment Flow

Buyer selects Razorpay payment.  
Backend creates Razorpay order.  
Frontend opens Razorpay checkout.  
Backend verifies payment signature.  
Order is created only after successful verification.

## Security

- JWT authentication
- Role-based access
- Razorpay secret key stored only in backend
- Passwords stored securely using encryption/hashing

## Run Project

Frontend:

npm install
npm run dev

Backend:

mvn spring-boot:run

## Note

Use Razorpay Test Mode keys only for testing.  
Do not commit secret keys to GitHub.
