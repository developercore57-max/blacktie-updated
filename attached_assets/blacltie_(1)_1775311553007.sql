-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:4306
-- Generation Time: Apr 03, 2026 at 02:33 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `blacltie`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `name` text NOT NULL,
  `phone` text DEFAULT NULL,
  `role` text NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `email`, `password_hash`, `name`, `phone`, `role`, `is_active`, `created_at`) VALUES
(1, 'admin@blacktievoip.co.za', '$2b$10$5rKgxglwaVZ2CFHp1pBvIeHbZlTBzQsJPhg76cEcaW88xJi7uWa3K', 'Super Admin', '+27 11 000 0000', 'admin', 1, '2026-03-29 18:56:55');

-- --------------------------------------------------------

--
-- Table structure for table `area_codes`
--

CREATE TABLE `area_codes` (
  `id` int(11) NOT NULL,
  `code` text NOT NULL,
  `region` text NOT NULL,
  `province` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `area_codes`
--

INSERT INTO `area_codes` (`id`, `code`, `region`, `province`, `created_at`) VALUES
(1, '010', 'Johannesburg', 'Gauteng', '2026-03-29 18:57:16'),
(2, '011', 'Johannesburg', 'Gauteng', '2026-03-29 18:57:16'),
(3, '012', 'Pretoria', 'Gauteng', '2026-03-29 18:57:16'),
(4, '013', 'Mpumalanga', 'Mpumalanga', '2026-03-29 18:57:16'),
(5, '014', 'Rustenburg', 'North West', '2026-03-29 18:57:16'),
(6, '015', 'Polokwane', 'Limpopo', '2026-03-29 18:57:16'),
(7, '016', 'Vaal Triangle', 'Gauteng', '2026-03-29 18:57:16'),
(8, '017', 'Ermelo', 'Mpumalanga', '2026-03-29 18:57:16'),
(9, '018', 'Potchefstroom', 'North West', '2026-03-29 18:57:16'),
(10, '021', 'Cape Town', 'Western Cape', '2026-03-29 18:57:16'),
(11, '022', 'Malmesbury', 'Western Cape', '2026-03-29 18:57:16'),
(12, '023', 'Worcester', 'Western Cape', '2026-03-29 18:57:16'),
(13, '027', 'Springbok', 'Northern Cape', '2026-03-29 18:57:16'),
(14, '028', 'Hermanus', 'Western Cape', '2026-03-29 18:57:16'),
(15, '031', 'Durban', 'KwaZulu-Natal', '2026-03-29 18:57:16'),
(16, '032', 'KwaDukuza', 'KwaZulu-Natal', '2026-03-29 18:57:16'),
(17, '033', 'Pietermaritzburg', 'KwaZulu-Natal', '2026-03-29 18:57:16'),
(18, '034', 'Newcastle', 'KwaZulu-Natal', '2026-03-29 18:57:16'),
(19, '035', 'Richards Bay', 'KwaZulu-Natal', '2026-03-29 18:57:16'),
(20, '036', 'Ladysmith', 'KwaZulu-Natal', '2026-03-29 18:57:16'),
(21, '039', 'Port Shepstone', 'KwaZulu-Natal', '2026-03-29 18:57:16'),
(22, '041', 'Gqeberha', 'Eastern Cape', '2026-03-29 18:57:16'),
(23, '042', 'Humansdorp', 'Eastern Cape', '2026-03-29 18:57:16'),
(24, '043', 'East London', 'Eastern Cape', '2026-03-29 18:57:16'),
(25, '044', 'George', 'Western Cape', '2026-03-29 18:57:16'),
(26, '045', 'Queenstown', 'Eastern Cape', '2026-03-29 18:57:16'),
(27, '046', 'Makhanda', 'Eastern Cape', '2026-03-29 18:57:16'),
(28, '047', 'Mthatha', 'Eastern Cape', '2026-03-29 18:57:16'),
(29, '048', 'Cathcart', 'Eastern Cape', '2026-03-29 18:57:16'),
(30, '049', 'Graaff-Reinet', 'Eastern Cape', '2026-03-29 18:57:16'),
(31, '051', 'Bloemfontein', 'Free State', '2026-03-29 18:57:16'),
(32, '053', 'Kimberley', 'Northern Cape', '2026-03-29 18:57:16'),
(33, '054', 'Upington', 'Northern Cape', '2026-03-29 18:57:16'),
(34, '056', 'Welkom', 'Free State', '2026-03-29 18:57:16'),
(35, '057', 'Odendaalsrus', 'Free State', '2026-03-29 18:57:16'),
(36, '058', 'Bethlehem', 'Free State', '2026-03-29 18:57:16'),
(37, '086', 'National', 'Virtual', '2026-03-29 18:57:16'),
(38, '087', 'National VoIP', 'Virtual', '2026-03-29 18:57:16');

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL,
  `thread_id` int(11) NOT NULL,
  `author_role` text NOT NULL,
  `reseller_id` int(11) DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `thread_id`, `author_role`, `reseller_id`, `admin_id`, `message`, `created_at`) VALUES
(1, 1, 'reseller', 2, NULL, 'Good day', '2026-03-30 17:23:57'),
(2, 1, 'admin', NULL, 1, 'How can we assist', '2026-03-30 17:24:54'),
(3, 1, 'reseller', 2, NULL, 'Test', '2026-04-01 15:35:19'),
(4, 3, 'admin', NULL, 1, 'Hello from admin! How can we help?', '2026-04-02 04:40:24'),
(5, 3, 'reseller', 1, NULL, 'Hi! I need help with my VoIP setup.', '2026-04-02 04:42:12'),
(6, 3, 'reseller', 1, NULL, 'Test message from full test', '2026-04-02 07:11:24'),
(7, 3, 'reseller', 1, NULL, 'Test message from full test', '2026-04-02 07:13:31');

-- --------------------------------------------------------

--
-- Table structure for table `chat_threads`
--

CREATE TABLE `chat_threads` (
  `id` int(11) NOT NULL,
  `reseller_id` int(11) NOT NULL,
  `subject` text NOT NULL DEFAULT 'Support chat',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_threads`
--

INSERT INTO `chat_threads` (`id`, `reseller_id`, `subject`, `created_at`, `updated_at`) VALUES
(1, 2, 'Support chat', '2026-03-30 17:23:51', '2026-04-01 13:35:19'),
(3, 1, 'Support chat', '2026-04-02 04:40:15', '2026-04-02 05:13:31');

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `reseller_id` int(11) NOT NULL,
  `company_name` text NOT NULL,
  `contact_name` text NOT NULL,
  `email` text NOT NULL,
  `phone` text DEFAULT NULL,
  `unit_street_number` text DEFAULT NULL,
  `building_complex` text DEFAULT NULL,
  `street_name` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `address2` text DEFAULT NULL,
  `city` text DEFAULT NULL,
  `province` text DEFAULT NULL,
  `sip_extensions` int(11) NOT NULL DEFAULT 1,
  `monthly_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` text NOT NULL DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `proof_of_identity` text DEFAULT NULL,
  `proof_of_residence` text DEFAULT NULL,
  `registration_document` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `reseller_id`, `company_name`, `contact_name`, `email`, `phone`, `unit_street_number`, `building_complex`, `street_name`, `address`, `address2`, `city`, `province`, `sip_extensions`, `monthly_fee`, `status`, `notes`, `proof_of_identity`, `proof_of_residence`, `registration_document`, `created_at`) VALUES
(1, 1, 'Black Tie VoIP Customer Demo', 'Demo Customer', 'customer@blacktievoip.co.za', '+27 11 000 0002', NULL, NULL, NULL, NULL, NULL, 'Johannesburg', 'Gauteng', 3, 299.00, 'active', 'Demo customer account created automatically.', NULL, NULL, NULL, '2026-03-29 19:34:04'),
(2, 2, '122 Call Me', 'John Doe', 'johndoe@123callme.co.za', '0833305189', '', '', '', NULL, '', '', '', 1, 0.00, 'active', '', NULL, NULL, NULL, '2026-03-30 04:31:44');

-- --------------------------------------------------------

--
-- Table structure for table `company_settings`
--

CREATE TABLE `company_settings` (
  `id` int(11) NOT NULL,
  `company_name` text NOT NULL DEFAULT 'Black Tie VoIP',
  `email` text DEFAULT NULL,
  `phone` text DEFAULT NULL,
  `unit_street_number` text DEFAULT NULL,
  `building_complex` text DEFAULT NULL,
  `street_name` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `address2` text DEFAULT NULL,
  `city` text DEFAULT NULL,
  `province` text DEFAULT NULL,
  `postal_code` text DEFAULT NULL,
  `country` text NOT NULL DEFAULT 'South Africa',
  `vat_number` text DEFAULT NULL,
  `website` text DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `primary_color` text NOT NULL DEFAULT '#4BA3E3',
  `smtp_host` text DEFAULT NULL,
  `smtp_port` text DEFAULT '587',
  `smtp_user` text DEFAULT NULL,
  `smtp_pass` text DEFAULT NULL,
  `smtp_from` text DEFAULT NULL,
  `smtp_secure` tinyint(1) DEFAULT 0,
  `bank_name` text DEFAULT NULL,
  `bank_account_holder` text DEFAULT NULL,
  `bank_account_number` text DEFAULT NULL,
  `bank_account_type` text DEFAULT NULL,
  `bank_branch_code` text DEFAULT NULL,
  `bank_swift_code` text DEFAULT NULL,
  `bank_reference` text DEFAULT NULL,
  `did_reseller_price_excl_vat` text DEFAULT NULL,
  `did_reseller_price_incl_vat` text DEFAULT NULL,
  `did_sheet_url` text DEFAULT NULL,
  `did_sheet_enabled` tinyint(1) DEFAULT 0,
  `did_sheet_last_run_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `did_sheet_last_run_result` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `api_secrets` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `company_settings`
--

INSERT INTO `company_settings` (`id`, `company_name`, `email`, `phone`, `unit_street_number`, `building_complex`, `street_name`, `address`, `address2`, `city`, `province`, `postal_code`, `country`, `vat_number`, `website`, `logo_url`, `primary_color`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from`, `smtp_secure`, `bank_name`, `bank_account_holder`, `bank_account_number`, `bank_account_type`, `bank_branch_code`, `bank_swift_code`, `bank_reference`, `did_reseller_price_excl_vat`, `did_reseller_price_incl_vat`, `did_sheet_url`, `did_sheet_enabled`, `did_sheet_last_run_at`, `did_sheet_last_run_result`, `updated_at`, `api_secrets`) VALUES
(1, 'Black Tie VoIP', 'info@blacktievoip.co.za', '+27 11 000 0000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'South Africa', NULL, NULL, NULL, '#1a1a2e', NULL, '587', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://docs.google.com/spreadsheets/d/1EtucNx-GhyomSG4bMm-Vm95tWpLcI831RSrF2cB7ggg', 1, '2026-04-02 11:31:12', 'created: 0, skipped: 218, areaCodes: 0', '2026-03-29 17:30:08', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `connectivity_categories`
--

CREATE TABLE `connectivity_categories` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `connectivity_items`
--

CREATE TABLE `connectivity_items` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `speed` text DEFAULT NULL,
  `provider` text DEFAULT NULL,
  `contention` text DEFAULT NULL,
  `contract_months` int(11) DEFAULT 12,
  `setup_fee_excl_vat` decimal(10,2) DEFAULT NULL,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `retail_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coverage_check_comments`
--

CREATE TABLE `coverage_check_comments` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `author_role` text NOT NULL,
  `reseller_id` int(11) DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `coverage_check_comments`
--

INSERT INTO `coverage_check_comments` (`id`, `request_id`, `author_role`, `reseller_id`, `admin_id`, `message`, `created_at`) VALUES
(1, 1, 'admin', NULL, 1, 'Checking feasability', '2026-03-30 16:27:59');

-- --------------------------------------------------------

--
-- Table structure for table `coverage_check_requests`
--

CREATE TABLE `coverage_check_requests` (
  `id` int(11) NOT NULL,
  `reseller_id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `service_type` text NOT NULL DEFAULT 'fibre',
  `address` text NOT NULL,
  `suburb` text DEFAULT NULL,
  `city` text DEFAULT NULL,
  `province` text DEFAULT NULL,
  `contact_name` text DEFAULT NULL,
  `contact_email` text DEFAULT NULL,
  `contact_phone` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `unit_street_number` text DEFAULT NULL,
  `building_complex` text DEFAULT NULL,
  `street_name` text DEFAULT NULL,
  `address2` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `coverage_check_requests`
--

INSERT INTO `coverage_check_requests` (`id`, `reseller_id`, `client_id`, `service_type`, `address`, `suburb`, `city`, `province`, `contact_name`, `contact_email`, `contact_phone`, `notes`, `status`, `created_at`, `updated_at`, `unit_street_number`, `building_complex`, `street_name`, `address2`) VALUES
(1, 2, NULL, 'fibre', '123 , Sunshine Building, Piet Street', NULL, 'Cape Town', 'Western Cape', 'Piet', 'piet@pietplace.co.za', '0831234567', 'Coverage ', 'in_progress', '2026-03-30 16:22:37', '2026-03-30 14:27:57', '123 ', 'Sunshine Building', 'Piet Street', NULL),
(2, 1, NULL, 'fibre', '123 Test Street', NULL, 'Cape Town', 'Western Cape', 'Test User', 'test@example.com', NULL, 'Full test coverage request', 'pending', '2026-04-02 07:11:27', '2026-04-02 05:11:27', 'Unit 1', NULL, NULL, NULL),
(3, 1, NULL, 'fibre', '123 Test Street', NULL, 'Cape Town', 'Western Cape', 'Test User', 'test@example.com', NULL, 'Full test coverage request', 'pending', '2026-04-02 07:13:31', '2026-04-02 05:13:31', 'Unit 1', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `cybersecurity_categories`
--

CREATE TABLE `cybersecurity_categories` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cybersecurity_items`
--

CREATE TABLE `cybersecurity_items` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `unit` text NOT NULL DEFAULT 'month',
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `data_security_categories`
--

CREATE TABLE `data_security_categories` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `data_security_items`
--

CREATE TABLE `data_security_items` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `unit` text NOT NULL DEFAULT 'month',
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dids`
--

CREATE TABLE `dids` (
  `id` int(11) NOT NULL,
  `area_code_id` int(11) NOT NULL,
  `number` text NOT NULL,
  `status` text NOT NULL DEFAULT 'available',
  `reseller_id` int(11) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reserved_by_order_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dids`
--

INSERT INTO `dids` (`id`, `area_code_id`, `number`, `status`, `reseller_id`, `client_id`, `assigned_at`, `reserved_by_order_id`, `notes`, `created_at`) VALUES
(1, 1, '27100166063', 'available', NULL, NULL, '2026-03-29 19:29:21', NULL, NULL, '2026-03-29 19:29:21'),
(2, 1, '27100166064', 'available', NULL, NULL, '2026-03-29 19:29:21', NULL, NULL, '2026-03-29 19:29:21'),
(3, 1, '27100166065', 'available', NULL, NULL, '2026-03-29 19:29:21', NULL, NULL, '2026-03-29 19:29:21'),
(4, 1, '27100166067', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(5, 1, '27100166068', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(6, 1, '27100166069', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(7, 1, '27100166070', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(8, 1, '27100166071', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(9, 1, '27100166072', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(10, 1, '27100166073', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(11, 1, '27100166074', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(12, 1, '27100166075', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(13, 1, '27100166076', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(14, 1, '27100166077', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(15, 3, '27120190053', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(16, 3, '27120190054', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(17, 3, '27120190055', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(18, 3, '27120190057', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(19, 3, '27120190058', 'available', NULL, NULL, '2026-03-29 19:29:22', NULL, NULL, '2026-03-29 19:29:22'),
(20, 3, '27120190059', 'available', NULL, NULL, '2026-03-29 19:29:23', NULL, NULL, '2026-03-29 19:29:23'),
(21, 3, '27128838031', 'available', NULL, NULL, '2026-03-29 19:29:23', NULL, NULL, '2026-03-29 19:29:23'),
(22, 3, '27128838035', 'available', NULL, NULL, '2026-03-29 19:29:23', NULL, NULL, '2026-03-29 19:29:23'),
(23, 3, '27128838039', 'available', NULL, NULL, '2026-03-29 19:29:23', NULL, NULL, '2026-03-29 19:29:23'),
(24, 3, '27128850915', 'available', NULL, NULL, '2026-03-29 19:29:23', NULL, NULL, '2026-03-29 19:29:23'),
(25, 3, '27128850916', 'available', NULL, NULL, '2026-03-29 19:29:23', NULL, NULL, '2026-03-29 19:29:23'),
(26, 3, '27128850917', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(27, 3, '27128850918', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(28, 3, '27128850919', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(29, 3, '27128851912', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(30, 3, '27128851913', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(31, 3, '27128851914', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(32, 3, '27128851915', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(33, 3, '27128851916', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(34, 4, '27131106255', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(35, 4, '27131106256', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(36, 4, '27131106257', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(37, 4, '27131106258', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(38, 4, '27131106259', 'available', NULL, NULL, '2026-03-29 19:29:24', NULL, NULL, '2026-03-29 19:29:24'),
(39, 4, '27131106260', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(40, 4, '27131106261', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(41, 4, '27131106263', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(42, 4, '27131106264', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(43, 4, '27131106265', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(44, 4, '27131106266', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(45, 4, '27131106267', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(46, 4, '27131106268', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(47, 4, '27131106269', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(48, 5, '27141120319', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(49, 5, '27141120320', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(50, 5, '27141120321', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(51, 5, '27141120322', 'reserved', NULL, NULL, '2026-03-30 15:44:50', 3, NULL, '2026-03-29 19:29:25'),
(52, 5, '27141120323', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(53, 5, '27141120324', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(54, 5, '27141120325', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(55, 6, '27151101421', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(56, 6, '27151101422', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(57, 6, '27151101423', 'available', NULL, NULL, '2026-03-29 19:29:25', NULL, NULL, '2026-03-29 19:29:25'),
(58, 6, '27151101424', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(59, 6, '27151101425', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(60, 6, '27151101426', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(61, 6, '27151101427', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(62, 6, '27151101428', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(63, 6, '27151101429', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(64, 7, '27160200351', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(65, 7, '27160200352', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(66, 7, '27160200353', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(67, 7, '27160200354', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(68, 7, '27160200355', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(69, 7, '27160200356', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(70, 7, '27160200357', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(71, 7, '27160200358', 'available', NULL, NULL, '2026-03-29 19:29:26', NULL, NULL, '2026-03-29 19:29:26'),
(72, 7, '27160200359', 'available', NULL, NULL, '2026-03-29 19:29:27', NULL, NULL, '2026-03-29 19:29:27'),
(73, 7, '27161100816', 'available', NULL, NULL, '2026-03-29 19:29:27', NULL, NULL, '2026-03-29 19:29:27'),
(74, 7, '27161100818', 'available', NULL, NULL, '2026-03-29 19:29:27', NULL, NULL, '2026-03-29 19:29:27'),
(75, 7, '27161100819', 'available', NULL, NULL, '2026-03-29 19:29:27', NULL, NULL, '2026-03-29 19:29:27'),
(76, 8, '27170130400', 'reserved', NULL, NULL, '2026-04-01 16:59:57', 4, NULL, '2026-03-29 19:29:27'),
(77, 8, '27170130401', 'available', NULL, NULL, '2026-03-29 19:29:27', NULL, NULL, '2026-03-29 19:29:27'),
(78, 8, '27170130402', 'available', NULL, NULL, '2026-03-29 19:29:27', NULL, NULL, '2026-03-29 19:29:27'),
(79, 8, '27170130403', 'available', NULL, NULL, '2026-03-29 19:29:27', NULL, NULL, '2026-03-29 19:29:27'),
(80, 8, '27170130404', 'available', NULL, NULL, '2026-03-29 19:29:27', NULL, NULL, '2026-03-29 19:29:27'),
(81, 8, '27170130405', 'available', NULL, NULL, '2026-03-29 19:29:28', NULL, NULL, '2026-03-29 19:29:28'),
(82, 8, '27170130406', 'available', NULL, NULL, '2026-03-29 19:29:28', NULL, NULL, '2026-03-29 19:29:28'),
(83, 8, '27170130407', 'available', NULL, NULL, '2026-03-29 19:29:28', NULL, NULL, '2026-03-29 19:29:28'),
(84, 8, '27170130408', 'available', NULL, NULL, '2026-03-29 19:29:28', NULL, NULL, '2026-03-29 19:29:28'),
(85, 8, '27170130409', 'available', NULL, NULL, '2026-03-29 19:29:28', NULL, NULL, '2026-03-29 19:29:28'),
(86, 8, '27171100463', 'available', NULL, NULL, '2026-03-29 19:29:28', NULL, NULL, '2026-03-29 19:29:28'),
(87, 9, '27180005343', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(88, 9, '27180005344', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(89, 9, '27180005345', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(90, 9, '27180005346', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(91, 9, '27180005347', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(92, 9, '27180005348', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(93, 9, '27180005349', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(94, 10, '27210137305', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(95, 10, '27210137306', 'available', NULL, NULL, '2026-03-29 19:29:29', NULL, NULL, '2026-03-29 19:29:29'),
(96, 10, '27210137308', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(97, 10, '27210137309', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(98, 10, '27211097361', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(99, 10, '27211097362', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(100, 10, '27211097363', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(101, 11, '27220220071', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(102, 11, '27220220072', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(103, 11, '27220220073', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(104, 11, '27220220074', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(105, 11, '27220220075', 'available', NULL, NULL, '2026-03-29 19:29:30', NULL, NULL, '2026-03-29 19:29:30'),
(106, 11, '27220220076', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(107, 11, '27220220077', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(108, 11, '27220220078', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(109, 11, '27220220079', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(110, 12, '27230220390', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(111, 12, '27230220391', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(112, 12, '27230220392', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(113, 12, '27230220393', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(114, 12, '27230220394', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(115, 12, '27230220395', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(116, 12, '27230220396', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(117, 12, '27230220397', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(118, 12, '27230220398', 'available', NULL, NULL, '2026-03-29 19:29:31', NULL, NULL, '2026-03-29 19:29:31'),
(119, 12, '27230220399', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(120, 13, '27270220038', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(121, 13, '27270220039', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(122, 13, '27270220040', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(123, 13, '27270220042', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(124, 13, '27270220043', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(125, 13, '27270220044', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(126, 13, '27270220047', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(127, 13, '27270220049', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(128, 13, '27270220090', 'available', NULL, NULL, '2026-03-29 19:29:32', NULL, NULL, '2026-03-29 19:29:32'),
(129, 13, '27270220091', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(130, 15, '27310242134', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(131, 15, '27310242135', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(132, 15, '27310243954', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(133, 15, '27310243957', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(134, 15, '27310243958', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(135, 15, '27310243961', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(136, 15, '27310243962', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(137, 15, '27310243963', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(138, 15, '27310243964', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(139, 15, '27310243965', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(140, 15, '27310243967', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(141, 15, '27310243968', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(142, 15, '27310243969', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(143, 15, '27310243970', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(144, 15, '27310243971', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(145, 15, '27310243972', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(146, 15, '27310243973', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(147, 15, '27311098378', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(148, 15, '27311098745', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(149, 15, '27311098749', 'available', NULL, NULL, '2026-03-29 19:29:33', NULL, NULL, '2026-03-29 19:29:33'),
(150, 15, '27311098751', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(151, 16, '27320320165', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(152, 16, '27320320166', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(153, 16, '27320320168', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(154, 17, '27330320237', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(155, 17, '27330322361', 'reserved', NULL, NULL, '2026-03-30 04:33:00', 2, NULL, '2026-03-29 19:29:34'),
(156, 17, '27330322362', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(157, 17, '27330322363', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(158, 17, '27330322364', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(159, 18, '27340320181', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(160, 18, '27340320183', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(161, 18, '27340320331', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(162, 18, '27340320332', 'available', NULL, NULL, '2026-03-29 19:29:34', NULL, NULL, '2026-03-29 19:29:34'),
(163, 18, '27340320334', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(164, 18, '27340320335', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(165, 19, '27350320125', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(166, 19, '27350320126', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(167, 19, '27350320127', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(168, 19, '27350320128', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(169, 20, '27360320054', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(170, 20, '27360320056', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(171, 20, '27360320473', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(172, 20, '27360320474', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(173, 20, '27360320475', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(174, 20, '27360320477', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(175, 20, '27360320478', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(176, 20, '27360320479', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(177, 21, '27390320067', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(178, 22, '27410110176', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(179, 22, '27410110178', 'available', NULL, NULL, '2026-03-29 19:29:35', NULL, NULL, '2026-03-29 19:29:35'),
(180, 22, '27410110179', 'available', NULL, NULL, '2026-03-29 19:29:36', NULL, NULL, '2026-03-29 19:29:36'),
(181, 24, '27430110105', 'available', NULL, NULL, '2026-03-29 19:29:36', NULL, NULL, '2026-03-29 19:29:36'),
(182, 24, '27430110107', 'available', NULL, NULL, '2026-03-29 19:29:36', NULL, NULL, '2026-03-29 19:29:36'),
(183, 24, '27430110164', 'available', NULL, NULL, '2026-03-29 19:29:36', NULL, NULL, '2026-03-29 19:29:36'),
(184, 24, '27430110165', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(185, 28, '27470110064', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(186, 28, '27470110066', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(187, 28, '27470110067', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(188, 28, '27470110068', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(189, 28, '27470110069', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(190, 31, '27511101270', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(191, 31, '27511101271', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(192, 31, '27511101272', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(193, 31, '27515080050', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(194, 31, '27515080051', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(195, 31, '27515080052', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(196, 31, '27515080053', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(197, 31, '27515080054', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(198, 31, '27515080055', 'available', NULL, NULL, '2026-03-29 19:29:37', NULL, NULL, '2026-03-29 19:29:37'),
(199, 31, '27515080056', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(200, 31, '27515080057', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(201, 31, '27515080058', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(202, 31, '27515080059', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(203, 32, '27530300270', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(204, 32, '27530300271', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(205, 32, '27530300272', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(206, 32, '27530300273', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(207, 32, '27530300274', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(208, 35, '27570300055', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(209, 35, '27570300056', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(210, 35, '27570300057', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(211, 35, '27570300058', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(212, 35, '27570300059', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(213, 38, '27873771041', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(214, 38, '27873771042', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(215, 38, '27873771043', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(216, 38, '27873771044', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(217, 38, '27873771045', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(218, 38, '27873771048', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(219, 38, '27873771049', 'available', NULL, NULL, '2026-03-29 19:29:38', NULL, NULL, '2026-03-29 19:29:38'),
(220, 17, '27330322360', 'available', NULL, NULL, '2026-04-02 08:00:02', NULL, NULL, '2026-04-02 08:00:02');

-- --------------------------------------------------------

--
-- Table structure for table `did_requests`
--

CREATE TABLE `did_requests` (
  `id` int(11) NOT NULL,
  `reseller_id` int(11) NOT NULL,
  `area_code_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `did_ids` text DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `file_name` text NOT NULL,
  `stored_name` text NOT NULL,
  `description` text NOT NULL,
  `mime_type` text DEFAULT NULL,
  `file_size` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_admin_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `file_name`, `stored_name`, `description`, `mime_type`, `file_size`, `is_active`, `created_by_admin_id`, `created_at`, `updated_at`) VALUES
(1, 'BTV-Porting-Docs.pdf', 'ffaa3a51-06c8-4b11-a669-0618f9681f85.pdf', 'BTV Porting Document', 'application/pdf', 961844, 1, 1, '2026-04-01 15:31:34', '2026-04-01 15:31:34');

-- --------------------------------------------------------

--
-- Table structure for table `domain_tlds`
--

CREATE TABLE `domain_tlds` (
  `id` int(11) NOT NULL,
  `tld` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `registration_years` int(11) NOT NULL DEFAULT 1,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `domain_tlds`
--

INSERT INTO `domain_tlds` (`id`, `tld`, `description`, `registration_years`, `retail_price_excl_vat`, `price_incl_vat`, `reseller_price_excl_vat`, `reseller_price_incl_vat`, `status`, `sort_order`, `created_at`) VALUES
(1, '.co.za', 'co.za Domain Registration', 1, 99.00, 113.85, 99.00, 113.85, 'active', 1, '2026-03-29 19:04:11'),
(2, '.com', 'com Domain Registration', 1, 295.00, 339.25, 265.00, 304.75, 'active', 2, '2026-03-30 16:43:50'),
(3, '.net', 'net Domain Registration', 1, 295.00, 339.25, 265.00, 304.75, 'active', 3, '2026-03-30 16:44:23');

-- --------------------------------------------------------

--
-- Table structure for table `email_templates`
--

CREATE TABLE `email_templates` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `subject` text NOT NULL,
  `body` text NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_templates`
--

INSERT INTO `email_templates` (`id`, `name`, `slug`, `subject`, `body`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Reseller Welcome', 'reseller_welcome', 'Welcome to {{companyName}} — Your Account is Approved!', '<div style=\"font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;\"><div style=\"background:#4BA3E3;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;\"><h1 style=\"margin:0;color:#fff;font-size:22px;font-weight:800;\">{{companyName}}</h1><p style=\"margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;\">Reseller Portal</p></div><div style=\"padding:28px 32px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;\"><h2 style=\"color:#1e3a5f;font-size:18px;margin:0 0 12px;\">Welcome, {{contactName}}!</h2><p style=\"color:#555;font-size:14px;line-height:1.6;\">Great news — your reseller application has been <strong>approved</strong>. You can now log in to the {{companyName}} Reseller Portal and start placing orders.</p><p style=\"color:#555;font-size:14px;line-height:1.6;\">If you have any questions, feel free to reach out to our support team.</p><div style=\"margin-top:24px;padding-top:20px;border-top:1px solid #eee;text-align:center;\"><p style=\"margin:0;font-size:12px;color:#aaa;\">&copy; {{year}} {{companyName}}. All rights reserved.</p></div></div></div>', 'Sent to the reseller when their application is approved by admin.', 1, '2026-04-02 06:02:52', '2026-04-02 06:02:52'),
(2, 'New Reseller Signup Notification', 'reseller_signup_notification', 'New Reseller Signup — {{resellerCompanyName}}', '<div style=\"font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;\"><div style=\"background:#4BA3E3;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;\"><h1 style=\"margin:0;color:#fff;font-size:22px;font-weight:800;\">{{companyName}}</h1><p style=\"margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;\">Reseller Portal</p></div><div style=\"padding:28px 32px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;\"><h2 style=\"color:#1e3a5f;font-size:18px;margin:0 0 12px;\">New Reseller Application</h2><p style=\"color:#555;font-size:14px;line-height:1.6;\">A new reseller has signed up and is awaiting your approval.</p><div style=\"margin:16px 0;padding:16px;background:#f7f9fc;border-radius:8px;border:1px solid #eee;\"><p style=\"margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;font-weight:600;\">Company</p><p style=\"margin:0 0 12px;font-size:15px;font-weight:700;color:#333;\">{{resellerCompanyName}}</p><p style=\"margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;font-weight:600;\">Contact</p><p style=\"margin:0 0 12px;font-size:15px;color:#333;\">{{contactName}} ({{resellerEmail}})</p></div><p style=\"color:#555;font-size:14px;\">Log in to the admin portal to review this application.</p><div style=\"margin-top:24px;padding-top:20px;border-top:1px solid #eee;text-align:center;\"><p style=\"margin:0;font-size:12px;color:#aaa;\">&copy; {{year}} {{companyName}}. All rights reserved.</p></div></div></div>', 'Sent to admin when a new reseller signs up (pending approval).', 1, '2026-04-02 06:03:00', '2026-04-02 06:03:00'),
(3, 'Reseller Signup Confirmation', 'reseller_signup_confirmation', 'Thank You for Registering — {{companyName}}', '<div style=\"font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;\"><div style=\"background:#4BA3E3;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;\"><h1 style=\"margin:0;color:#fff;font-size:22px;font-weight:800;\">{{companyName}}</h1><p style=\"margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;\">Reseller Portal</p></div><div style=\"padding:28px 32px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;\"><h2 style=\"color:#1e3a5f;font-size:18px;margin:0 0 12px;\">Hi {{contactName}},</h2><p style=\"color:#555;font-size:14px;line-height:1.6;\">Thank you for registering with {{companyName}}. Your application has been received and is <strong>pending review</strong> by our team.</p><p style=\"color:#555;font-size:14px;line-height:1.6;\">You will receive an email once your account has been reviewed. This usually takes 1–2 business days.</p><div style=\"margin-top:24px;padding-top:20px;border-top:1px solid #eee;text-align:center;\"><p style=\"margin:0;font-size:12px;color:#aaa;\">&copy; {{year}} {{companyName}}. All rights reserved.</p></div></div></div>', 'Sent to the reseller after they complete the signup form.', 1, '2026-04-02 06:03:01', '2026-04-02 06:03:01');

-- --------------------------------------------------------

--
-- Table structure for table `minute_bundles`
--

CREATE TABLE `minute_bundles` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `minutes` int(11) NOT NULL,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `minute_bundles`
--

INSERT INTO `minute_bundles` (`id`, `name`, `description`, `minutes`, `retail_price_excl_vat`, `reseller_price_excl_vat`, `reseller_price_incl_vat`, `price_incl_vat`, `status`, `sort_order`, `created_at`) VALUES
(1, '150 Minutes', '150 Minutes', 150, 90.00, 80.00, 92.00, 103.50, 'active', 1, '2026-03-29 19:15:34');

-- --------------------------------------------------------

--
-- Table structure for table `notices`
--

CREATE TABLE `notices` (
  `id` int(11) NOT NULL,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `type` text NOT NULL DEFAULT 'info',
  `priority` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by_admin_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notices`
--

INSERT INTO `notices` (`id`, `title`, `content`, `type`, `priority`, `is_active`, `expires_at`, `created_by_admin_id`, `created_at`, `updated_at`) VALUES
(1, 'NEW Telkom LTE in catalog', 'NEW Telkom LTE in catalog', 'info', 1, 1, '2026-04-07 02:52:00', 1, '2026-03-30 04:52:13', '2026-03-30 04:52:13');

-- --------------------------------------------------------

--
-- Table structure for table `number_porting_requests`
--

CREATE TABLE `number_porting_requests` (
  `id` int(11) NOT NULL,
  `reseller_id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `porting_numbers` text NOT NULL,
  `current_provider` text NOT NULL,
  `account_number` text DEFAULT NULL,
  `contact_name` text NOT NULL,
  `contact_email` text DEFAULT NULL,
  `contact_phone` text DEFAULT NULL,
  `porting_date` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `attachments` text DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `number_porting_requests`
--

INSERT INTO `number_porting_requests` (`id`, `reseller_id`, `client_id`, `porting_numbers`, `current_provider`, `account_number`, `contact_name`, `contact_email`, `contact_phone`, `porting_date`, `notes`, `admin_notes`, `attachments`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, NULL, '0121234567, 0111234567', 'Telkom', '1234', 'Telkom Client', 'someone@telkom.co.za', '0820001234', '2026-04-30', NULL, NULL, '[{\"storedName\":\"8b0b2ef2-c2fd-4607-b133-5a2216255a94.pdf\",\"originalName\":\"BTV-Porting-Docs.pdf\",\"mimeType\":\"application/pdf\",\"size\":961844}]', 'in_progress', '2026-04-01 16:12:43', '2026-04-01 16:14:32');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `reseller_id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `total_excl_vat` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_incl_vat` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `reseller_id`, `client_id`, `status`, `notes`, `admin_notes`, `total_excl_vat`, `total_incl_vat`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'pending', 'Admin created order', 'Internal note', 100.00, 115.00, '2026-03-29 19:27:14', '2026-03-29 19:27:14'),
(2, 2, NULL, 'pending', NULL, NULL, 115.00, 132.25, '2026-03-30 04:32:58', '2026-03-30 04:32:58'),
(3, 2, NULL, 'processing', NULL, NULL, 115.00, 132.25, '2026-03-30 15:44:50', '2026-03-30 14:16:11'),
(4, 2, NULL, 'pending', NULL, NULL, 115.00, 132.25, '2026-04-01 16:59:57', '2026-04-01 16:59:57');

-- --------------------------------------------------------

--
-- Table structure for table `order_comments`
--

CREATE TABLE `order_comments` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `author_role` text NOT NULL,
  `reseller_id` int(11) DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `kind` text NOT NULL DEFAULT 'comment',
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `item_type` text NOT NULL DEFAULT 'product',
  `reference_id` int(11) DEFAULT NULL,
  `name` text NOT NULL,
  `sku` text DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price_excl_vat` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unit_price_incl_vat` decimal(10,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `item_type`, `reference_id`, `name`, `sku`, `quantity`, `unit_price_excl_vat`, `unit_price_incl_vat`, `line_total`, `created_at`) VALUES
(1, 1, 'service', NULL, 'Test Service', NULL, 1, 100.00, 115.00, 115.00, '2026-03-29 19:27:15'),
(2, 2, 'voip-solutions', 1, 'Single Line', NULL, 1, 35.00, 40.25, 40.25, '2026-03-30 04:32:59'),
(3, 2, 'did', 155, 'DID: 27330322361', NULL, 1, 0.00, 0.00, 0.00, '2026-03-30 04:32:59'),
(4, 2, 'minute-bundle', 1, '150 Minutes (150 min)', NULL, 1, 80.00, 92.00, 92.00, '2026-03-30 04:32:59'),
(5, 3, 'voip-solutions', 1, 'Single Line', NULL, 1, 35.00, 40.25, 40.25, '2026-03-30 15:44:50'),
(6, 3, 'did', 51, 'DID: 27141120322', NULL, 1, 0.00, 0.00, 0.00, '2026-03-30 15:44:50'),
(7, 3, 'minute-bundle', 1, '150 Minutes (150 min)', NULL, 1, 80.00, 92.00, 92.00, '2026-03-30 15:44:50'),
(8, 4, 'voip-solutions', 1, 'Single Line', NULL, 1, 35.00, 40.25, 40.25, '2026-04-01 16:59:57'),
(9, 4, 'did', 76, 'DID: 27170130400', NULL, 1, 0.00, 0.00, 0.00, '2026-04-01 16:59:57'),
(10, 4, 'minute-bundle', 1, '150 Minutes (150 min)', NULL, 1, 80.00, 92.00, 92.00, '2026-04-01 16:59:57');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `sku` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `stock_count` int(11) NOT NULL DEFAULT 0,
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `name`, `description`, `sku`, `image_url`, `price`, `retail_price_excl_vat`, `reseller_price_excl_vat`, `reseller_price_incl_vat`, `price_incl_vat`, `stock_count`, `status`, `sort_order`, `created_at`) VALUES
(1, 2, 'Grandstream Enterprise Cordless WiFi 6 Phone', 'The Grandstream WP816 is a cordless Wi-Fi IP phone with dual-band 802.11a/b/g/n/ac/ax support, ideal for seamless mobility and communication. Featuring advanced antenna design and roaming support, it offers 6-hour talk time and HD voice with dual microphones for crystal-clear audio. Equipped with 2 SIP accounts, Bluetooth connectivity, push-to-talk, and a Type C USB port for fast charging, it’s perfect for portable telephony needs. The WP816 also includes a 1500mAh rechargeable battery, an emergency button, and a durable design to ensure reliable communication in any environment. Cordless WiFi 6 Phone.', 'WP816', '/objects/uploads/617fec9d-34ad-4e7a-b337-7106807e7f43.png', 1750.00, 1750.00, 1750.00, 2012.50, 2012.50, 0, 'active', 0, '2026-03-30 16:51:38');

-- --------------------------------------------------------

--
-- Table structure for table `product_categories`
--

CREATE TABLE `product_categories` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_categories`
--

INSERT INTO `product_categories` (`id`, `name`, `description`, `parent_id`, `sort_order`, `created_at`) VALUES
(1, 'VoIP Hardware', 'VoIP Hardware', NULL, 1, '2026-03-30 16:49:09'),
(2, 'Cordless Phones', 'Cordless Phones', 1, 1, '2026-03-30 16:49:25');

-- --------------------------------------------------------

--
-- Table structure for table `resellers`
--

CREATE TABLE `resellers` (
  `id` int(11) NOT NULL,
  `company_name` text NOT NULL,
  `contact_name` text NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `phone` text DEFAULT NULL,
  `unit_street_number` text DEFAULT NULL,
  `building_complex` text DEFAULT NULL,
  `street_name` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `address2` text DEFAULT NULL,
  `city` text DEFAULT NULL,
  `province` text DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `resellers`
--

INSERT INTO `resellers` (`id`, `company_name`, `contact_name`, `email`, `password_hash`, `phone`, `unit_street_number`, `building_complex`, `street_name`, `address`, `address2`, `city`, `province`, `status`, `created_at`) VALUES
(1, 'Test Reseller Co', 'Test User', 'reseller@blacktievoip.co.za', '$2b$10$epKG0HrKtZOZhiEuOAiVLOEV5UvRuW7wVCwfoJKOIHWWV2p1isNA.', '0123456789', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-03-29 18:57:15'),
(2, 'Demo RA', 'John Doe', 'demoreseller@blacktievoip.co.za', '$2b$10$KjndSia4UFQGpxX9xiMGEe69OSXuQn.d3IsIemcHzBWOj0hw0XR7m', '+27836000152', '', '', '', NULL, '', '', '', 'active', '2026-03-29 19:08:51'),
(3, 'ABC Telecoms', 'Mr Smith', 'smith@abctel.com', '$2b$10$EcoXE/4vzdqDt.nP28ZiTuN0hgfxCOpODmvDYSJduzQalx1YkOwRu', '0820021234', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', '2026-04-01 16:55:04'),
(4, 'Test Reseller Co', 'Test User', 'test_reseller_fulltest@example.com', '$2b$10$PuYYH8BGXI1wD9u/kg4Oj.79kNmOIEhavVKYKHyONp7j6vwo5GNoi', '0123456789', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', '2026-04-02 07:09:40');

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `unit` text NOT NULL DEFAULT 'month',
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_categories`
--

CREATE TABLE `service_categories` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `session`
--

CREATE TABLE `session` (
  `sid` varchar(255) NOT NULL,
  `sess` text DEFAULT NULL,
  `expire` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voip_categories`
--

CREATE TABLE `voip_categories` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `voip_categories`
--

INSERT INTO `voip_categories` (`id`, `name`, `description`, `parent_id`, `sort_order`, `created_at`) VALUES
(1, 'Single Line', 'Single Line', NULL, 1, '2026-03-29 19:17:56'),
(2, 'Hosted PBX Extension', 'Hosted PBX Extension', NULL, 2, '2026-03-29 19:18:17');

-- --------------------------------------------------------

--
-- Table structure for table `voip_items`
--

CREATE TABLE `voip_items` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `unit` text NOT NULL DEFAULT 'month',
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `voip_items`
--

INSERT INTO `voip_items` (`id`, `category_id`, `name`, `description`, `price`, `retail_price_excl_vat`, `reseller_price_excl_vat`, `reseller_price_incl_vat`, `price_incl_vat`, `unit`, `status`, `sort_order`, `created_at`) VALUES
(1, 1, 'Single Line', 'Singe Line', 60.00, 60.00, 35.00, 40.25, 69.00, 'month', 'active', 1, '2026-03-29 19:18:42'),
(2, 2, 'Hosted PBX Extension', 'Hosted PBX Extension', 99.00, 99.00, 60.00, 69.00, 113.85, 'month', 'active', 2, '2026-03-29 19:19:23');

-- --------------------------------------------------------

--
-- Table structure for table `web_dev_categories`
--

CREATE TABLE `web_dev_categories` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `web_dev_items`
--

CREATE TABLE `web_dev_items` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `unit` text NOT NULL DEFAULT 'month',
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `web_hosting_packages`
--

CREATE TABLE `web_hosting_packages` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT NULL,
  `disk_space_gb` int(11) NOT NULL DEFAULT 1,
  `bandwidth_gb` int(11) NOT NULL DEFAULT 10,
  `email_accounts` int(11) NOT NULL DEFAULT 5,
  `databases` int(11) NOT NULL DEFAULT 1,
  `subdomains` int(11) NOT NULL DEFAULT 1,
  `ssl_included` tinyint(1) NOT NULL DEFAULT 1,
  `retail_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_excl_vat` decimal(10,2) DEFAULT NULL,
  `reseller_price_incl_vat` decimal(10,2) DEFAULT NULL,
  `price_incl_vat` decimal(10,2) DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'active',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `web_hosting_packages`
--

INSERT INTO `web_hosting_packages` (`id`, `name`, `description`, `disk_space_gb`, `bandwidth_gb`, `email_accounts`, `databases`, `subdomains`, `ssl_included`, `retail_price_excl_vat`, `reseller_price_excl_vat`, `reseller_price_incl_vat`, `price_incl_vat`, `status`, `sort_order`, `created_at`) VALUES
(1, 'Sterter', 'Sterter web hosting', 5, 50, 10, 5, 5, 1, 99.00, 99.00, 113.85, 113.85, 'active', 0, '2026-03-29 19:05:35');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `admins_email_unique` (`email`) USING HASH;

--
-- Indexes for table `area_codes`
--
ALTER TABLE `area_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `area_codes_code_unique` (`code`) USING HASH;

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_messages_thread_id` (`thread_id`),
  ADD KEY `idx_chat_messages_created_at` (`created_at`);

--
-- Indexes for table `chat_threads`
--
ALTER TABLE `chat_threads`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_chat_threads_reseller` (`reseller_id`),
  ADD KEY `idx_chat_threads_reseller_id` (`reseller_id`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `clients_reseller_id_resellers_id_fk` (`reseller_id`);

--
-- Indexes for table `company_settings`
--
ALTER TABLE `company_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `connectivity_categories`
--
ALTER TABLE `connectivity_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `connectivity_items`
--
ALTER TABLE `connectivity_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `coverage_check_comments`
--
ALTER TABLE `coverage_check_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ccc_request_id` (`request_id`);

--
-- Indexes for table `coverage_check_requests`
--
ALTER TABLE `coverage_check_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ccr_reseller_id` (`reseller_id`);

--
-- Indexes for table `cybersecurity_categories`
--
ALTER TABLE `cybersecurity_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cybersecurity_items`
--
ALTER TABLE `cybersecurity_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `data_security_categories`
--
ALTER TABLE `data_security_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `data_security_items`
--
ALTER TABLE `data_security_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `dids`
--
ALTER TABLE `dids`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dids_number_unique` (`number`) USING HASH,
  ADD KEY `dids_area_code_id_area_codes_id_fk` (`area_code_id`),
  ADD KEY `dids_reseller_id_resellers_id_fk` (`reseller_id`),
  ADD KEY `dids_client_id_clients_id_fk` (`client_id`);

--
-- Indexes for table `did_requests`
--
ALTER TABLE `did_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reseller_id` (`reseller_id`),
  ADD KEY `area_code_id` (`area_code_id`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_documents_admin` (`created_by_admin_id`);

--
-- Indexes for table `domain_tlds`
--
ALTER TABLE `domain_tlds`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `email_templates`
--
ALTER TABLE `email_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `minute_bundles`
--
ALTER TABLE `minute_bundles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notices`
--
ALTER TABLE `notices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notices_created_by_admin_id_admins_id_fk` (`created_by_admin_id`);

--
-- Indexes for table `number_porting_requests`
--
ALTER TABLE `number_porting_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_number_porting_reseller` (`reseller_id`),
  ADD KEY `fk_number_porting_client` (`client_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `orders_reseller_id_resellers_id_fk` (`reseller_id`),
  ADD KEY `orders_client_id_clients_id_fk` (`client_id`);

--
-- Indexes for table `order_comments`
--
ALTER TABLE `order_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_comments_order_id` (`order_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_items_order_id_orders_id_fk` (`order_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `products_category_id_product_categories_id_fk` (`category_id`);

--
-- Indexes for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `resellers`
--
ALTER TABLE `resellers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `resellers_email_unique` (`email`) USING HASH;

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `services_category_id_service_categories_id_fk` (`category_id`);

--
-- Indexes for table `service_categories`
--
ALTER TABLE `service_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `session`
--
ALTER TABLE `session`
  ADD PRIMARY KEY (`sid`);

--
-- Indexes for table `voip_categories`
--
ALTER TABLE `voip_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `voip_items`
--
ALTER TABLE `voip_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `web_dev_categories`
--
ALTER TABLE `web_dev_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `web_dev_items`
--
ALTER TABLE `web_dev_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `web_hosting_packages`
--
ALTER TABLE `web_hosting_packages`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `area_codes`
--
ALTER TABLE `area_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `chat_threads`
--
ALTER TABLE `chat_threads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `company_settings`
--
ALTER TABLE `company_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `connectivity_categories`
--
ALTER TABLE `connectivity_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `connectivity_items`
--
ALTER TABLE `connectivity_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coverage_check_comments`
--
ALTER TABLE `coverage_check_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `coverage_check_requests`
--
ALTER TABLE `coverage_check_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `cybersecurity_categories`
--
ALTER TABLE `cybersecurity_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cybersecurity_items`
--
ALTER TABLE `cybersecurity_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `data_security_categories`
--
ALTER TABLE `data_security_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `data_security_items`
--
ALTER TABLE `data_security_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dids`
--
ALTER TABLE `dids`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=221;

--
-- AUTO_INCREMENT for table `did_requests`
--
ALTER TABLE `did_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `domain_tlds`
--
ALTER TABLE `domain_tlds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `email_templates`
--
ALTER TABLE `email_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `minute_bundles`
--
ALTER TABLE `minute_bundles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notices`
--
ALTER TABLE `notices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `number_porting_requests`
--
ALTER TABLE `number_porting_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `order_comments`
--
ALTER TABLE `order_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `product_categories`
--
ALTER TABLE `product_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `resellers`
--
ALTER TABLE `resellers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_categories`
--
ALTER TABLE `service_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `voip_categories`
--
ALTER TABLE `voip_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `voip_items`
--
ALTER TABLE `voip_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `web_dev_categories`
--
ALTER TABLE `web_dev_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `web_dev_items`
--
ALTER TABLE `web_dev_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `web_hosting_packages`
--
ALTER TABLE `web_hosting_packages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `fk_chat_messages_thread_id` FOREIGN KEY (`thread_id`) REFERENCES `chat_threads` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_threads`
--
ALTER TABLE `chat_threads`
  ADD CONSTRAINT `fk_chat_threads_reseller_id` FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clients`
--
ALTER TABLE `clients`
  ADD CONSTRAINT `clients_reseller_id_resellers_id_fk` FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `coverage_check_comments`
--
ALTER TABLE `coverage_check_comments`
  ADD CONSTRAINT `fk_ccc_request_id` FOREIGN KEY (`request_id`) REFERENCES `coverage_check_requests` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `coverage_check_requests`
--
ALTER TABLE `coverage_check_requests`
  ADD CONSTRAINT `fk_ccr_reseller_id` FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `dids`
--
ALTER TABLE `dids`
  ADD CONSTRAINT `dids_area_code_id_area_codes_id_fk` FOREIGN KEY (`area_code_id`) REFERENCES `area_codes` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `dids_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `dids_reseller_id_resellers_id_fk` FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `did_requests`
--
ALTER TABLE `did_requests`
  ADD CONSTRAINT `did_requests_ibfk_1` FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `did_requests_ibfk_2` FOREIGN KEY (`area_code_id`) REFERENCES `area_codes` (`id`);

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `fk_documents_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notices`
--
ALTER TABLE `notices`
  ADD CONSTRAINT `notices_created_by_admin_id_admins_id_fk` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `number_porting_requests`
--
ALTER TABLE `number_porting_requests`
  ADD CONSTRAINT `fk_number_porting_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_number_porting_reseller` FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `orders_reseller_id_resellers_id_fk` FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `order_comments`
--
ALTER TABLE `order_comments`
  ADD CONSTRAINT `fk_order_comments_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_category_id_product_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `services_category_id_service_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
