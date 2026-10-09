-- ============================================================================
--  Pizza Shop - MySQL schema (REFERENCE ONLY)
--
--  Tables are created by the knex migration in ../migrations/ when you run
--  "npm run db:setup". This file shows the resulting MySQL DDL so the
--  structure can be read without running anything. Keep it in sync with the
--  migration if you change the schema.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `pizza_shop` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pizza_shop`;

CREATE TABLE `categories` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(60)  NOT NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sizes` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(30)  NOT NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sizes_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pizzas` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id`  INT UNSIGNED NOT NULL,
  `name`         VARCHAR(100) NOT NULL,
  `description`  VARCHAR(500) NULL,
  `image_url`    VARCHAR(500) NULL,
  `is_available` TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pizzas_category` (`category_id`),
  CONSTRAINT `pizzas_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- one row per pizza + size
CREATE TABLE `pizza_prices` (
  `pizza_id` INT UNSIGNED  NOT NULL,
  `size_id`  INT UNSIGNED  NOT NULL,
  `price`    DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`pizza_id`, `size_id`),
  CONSTRAINT `pizza_prices_pizza_id_foreign` FOREIGN KEY (`pizza_id`) REFERENCES `pizzas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pizza_prices_size_id_foreign`  FOREIGN KEY (`size_id`)  REFERENCES `sizes`  (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `toppings` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(60)   NOT NULL,
  `price`        DECIMAL(10,2) NOT NULL DEFAULT 0,
  `is_available` TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `toppings_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100) NOT NULL,
  `phone`      VARCHAR(20)  NOT NULL,
  `email`      VARCHAR(150) NULL,
  `address`    VARCHAR(500) NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_phone_unique` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `id`               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `order_number`     VARCHAR(20)   NOT NULL,
  `customer_id`      INT UNSIGNED  NOT NULL,
  `status`           ENUM('PENDING','CONFIRMED','PREPARING','OUT_FOR_DELIVERY','READY_FOR_PICKUP','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `order_type`       ENUM('DELIVERY','PICKUP') NOT NULL,
  `delivery_address` VARCHAR(500)  NULL,
  `payment_method`   ENUM('CASH','CARD','UPI') NOT NULL,
  `payment_status`   ENUM('PENDING','PAID','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `subtotal`         DECIMAL(10,2) NOT NULL,
  `tax`              DECIMAL(10,2) NOT NULL DEFAULT 0,
  `delivery_fee`     DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total`            DECIMAL(10,2) NOT NULL,
  `notes`            VARCHAR(500)  NULL,
  `created_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_order_number_unique` (`order_number`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_created_at` (`created_at`),
  KEY `idx_orders_customer` (`customer_id`),
  CONSTRAINT `orders_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- snapshot of what was ordered; names/prices are copied so later menu edits
-- never change historical orders
CREATE TABLE `order_items` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `order_id`   INT UNSIGNED  NOT NULL,
  `pizza_id`   INT UNSIGNED  NULL,
  `size_id`    INT UNSIGNED  NULL,
  `pizza_name` VARCHAR(100)  NOT NULL,
  `size_name`  VARCHAR(30)   NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `quantity`   INT UNSIGNED  NOT NULL,
  `line_total` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_pizza_id_foreign` FOREIGN KEY (`pizza_id`) REFERENCES `pizzas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `order_items_size_id_foreign`  FOREIGN KEY (`size_id`)  REFERENCES `sizes`  (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_item_toppings` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `order_item_id` INT UNSIGNED  NOT NULL,
  `topping_id`    INT UNSIGNED  NULL,
  `topping_name`  VARCHAR(60)   NOT NULL,
  `price`         DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_item_toppings_item` (`order_item_id`),
  CONSTRAINT `order_item_toppings_order_item_id_foreign` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_item_toppings_topping_id_foreign`    FOREIGN KEY (`topping_id`)    REFERENCES `toppings`    (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_status_history` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`   INT UNSIGNED NOT NULL,
  `status`     ENUM('PENDING','CONFIRMED','PREPARING','OUT_FOR_DELIVERY','READY_FOR_PICKUP','COMPLETED','CANCELLED') NOT NULL,
  `note`       VARCHAR(255) NULL,
  `changed_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_status_history_order` (`order_id`),
  CONSTRAINT `order_status_history_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(50)  NOT NULL,
  `password_hash` VARCHAR(100) NOT NULL,
  `display_name`  VARCHAR(100) NULL,
  `role`          ENUM('ADMIN','STAFF') NOT NULL DEFAULT 'STAFF',
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
