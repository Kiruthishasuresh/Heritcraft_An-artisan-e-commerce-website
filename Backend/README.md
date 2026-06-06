# HeritCraft Backend Microservices

Welcome to the backend for **HeritCraft** ecommerce platform! This backend contains two decoupled Spring Boot 3+ microservices running on Maven, Java 17, and MySQL. It is built to seamlessly feed data into your React + Vite frontend.

---

## Folder Structure

```text
heritcraft-backend
 ├── user-service         # Port 8081 (User Auth, Roles, Seller approvals)
 └── product-service      # Port 8082 (Product CRUD, category/seller filters, dynamic collections)
```

---

## 1. Prerequisites & Database Setup

1. Make sure you have **Java 17 (JDK 17)** and **Maven** installed.
2. Log in to your local MySQL database and run the following command to create the database:
   ```sql
   CREATE DATABASE heritcraft_db;
   ```

---

## 2. Configuration (Update MySQL Password)

Open `application.properties` in **both** services and replace `YOUR_PASSWORD` with your actual MySQL database password.

* **User Service Location**: `user-service/src/main/resources/application.properties`
* **Product Service Location**: `product-service/src/main/resources/application.properties`

```properties
spring.datasource.password=YOUR_MYSQL_PASSWORD_HERE
```

---

## 3. How to Run the Services

You can run both microservices directly from VS Code or using the terminal.

### Start `user-service` (Port 8081)
```bash
cd user-service
mvn spring-boot:run
```

### Start `product-service` (Port 8082)
```bash
cd product-service
mvn spring-boot:run
```

---

## 4. Test Verification URLs

Once running, you can test baseline listings:
* **User Service base URL**: [http://localhost:8081/api/users](http://localhost:8081/api/users)
* **Product Service base URL**: [http://localhost:8082/api/products](http://localhost:8082/api/products)

---

## 5. Postman Integration / Test Examples

Here is a guide on how to send payloads using Postman or `curl`.

### A. User Service (Port 8081)

#### 1. Register a Buyer (Auto-approved by default)
* **Method**: `POST`
* **URL**: `http://localhost:8081/api/users/register`
* **Headers**: `Content-Type: application/json`
* **Body**:
```json
{
  "name": "Alex Buyer",
  "email": "buyer@gmail.com",
  "password": "buyerpassword",
  "role": "buyer"
}
```

#### 2. Register a Seller (Pending approval by default)
* **Method**: `POST`
* **URL**: `http://localhost:8081/api/users/register`
* **Headers**: `Content-Type: application/json`
* **Body**:
```json
{
  "name": "Sowndarya",
  "email": "seller@gmail.com",
  "password": "123456",
  "role": "seller",
  "shopName": "Golden Artisan Studio",
  "shopDescription": "Handmade traditional products"
}
```

#### 3. Seller Login (Should fail while pending approval)
* **Method**: `POST`
* **URL**: `http://localhost:8081/api/users/login`
* **Headers**: `Content-Type: application/json`
* **Body**:
```json
{
  "email": "seller@gmail.com",
  "password": "123456"
}
```
* **Expected Response (400 Bad Request)**:
```json
{
  "message": "Seller account pending approval"
}
```

#### 4. Approve Seller (Admin/System action)
* **Method**: `PUT`
* **URL**: `http://localhost:8081/api/users/2/approve` *(Assuming Seller registered with ID 2)*

#### 5. Seller Login (Succeeds after approval)
* **Method**: `POST`
* **URL**: `http://localhost:8081/api/users/login`
* **Body**:
```json
{
  "email": "seller@gmail.com",
  "password": "123456"
}
```

#### 6. Disable a User
* **Method**: `PUT`
* **URL**: `http://localhost:8081/api/users/1/disable`

#### 7. Enable a User
* **Method**: `PUT`
* **URL**: `http://localhost:8081/api/users/1/enable`

---

### B. Product Service (Port 8082)

#### 1. Add a Product (Handmade Snacks Category)
* **Method**: `POST`
* **URL**: `http://localhost:8082/api/products`
* **Headers**: `Content-Type: application/json`
* **Body**:
```json
{
  "name": "Handmade Pickle",
  "category": "Handmade Snacks",
  "price": 399,
  "oldPrice": 799,
  "stock": 16,
  "description": "Traditional homemade pickle with authentic spices",
  "sellerId": 2,
  "sellerName": "Sowndarya",
  "sellerShopName": "Golden Artisan Studio",
  "sizes": [],
  "weights": ["100 g", "250 g", "500 g", "1 kg"],
  "media": [
    {
      "url": "https://images.unsplash.com/photo-1589135799797-2a4c8a8dc08e",
      "type": "image/jpeg",
      "name": "pickle.jpg"
    }
  ]
}
```

#### 2. Get All Products (Returns Frontend Compatible Format)
* **Method**: `GET`
* **URL**: `http://localhost:8082/api/products`
* **Expected Response Example**:
```json
[
  {
    "id": 1,
    "_id": "1",
    "name": "Handmade Pickle",
    "category": "Handmade Snacks",
    "price": 399.0,
    "oldPrice": 799.0,
    "stock": 16,
    "description": "Traditional homemade pickle with authentic spices",
    "sellerId": 2,
    "sellerName": "Sowndarya",
    "sellerShopName": "Golden Artisan Studio",
    "averageRating": 0.0,
    "numReviews": 0,
    "offer": 50,
    "createdAt": "2026-05-21T15:30:00",
    "seller": {
      "shopName": "Golden Artisan Studio"
    },
    "images": [
      "https://images.unsplash.com/photo-1589135799797-2a4c8a8dc08e"
    ],
    "videos": [],
    "sizes": [],
    "weights": [
      "100 g",
      "250 g",
      "500 g",
      "1 kg"
    ]
  }
]
```

#### 3. Add a Product (Handmade Clothes / Textiles Category)
* **Method**: `POST`
* **URL**: `http://localhost:8082/api/products`
* **Headers**: `Content-Type: application/json`
* **Body**:
```json
{
  "name": "Traditional Cotton Kurta",
  "category": "Handmade Clothes",
  "price": 899,
  "oldPrice": 1299,
  "stock": 35,
  "description": "Pure cotton handmade traditional block print kurta",
  "sellerId": 2,
  "sellerName": "Sowndarya",
  "sellerShopName": "Golden Artisan Studio",
  "sizes": ["S", "M", "L", "XL"],
  "weights": [],
  "media": [
    {
      "url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
      "type": "image/jpeg",
      "name": "kurta.jpg"
    }
  ]
}
```

#### 4. Get Dynamic Categories List
* **Method**: `GET`
* **URL**: `http://localhost:8082/api/products/categories`
* **Expected Response**:
```json
[
  "Handmade Snacks",
  "Handmade Clothes"
]
```

#### 5. Get Products By Category
* **Method**: `GET`
* **URL**: `http://localhost:8082/api/products/category/Handmade Snacks`

#### 6. Get Products By Seller
* **Method**: `GET`
* **URL**: `http://localhost:8082/api/products/seller/2`

#### 7. Edit a Product
* **Method**: `PUT`
* **URL**: `http://localhost:8082/api/products/1`
* **Body**: *(Send same format as POST with updated fields)*

#### 8. Delete a Product
* **Method**: `DELETE`
* **URL**: `http://localhost:8082/api/products/1`
