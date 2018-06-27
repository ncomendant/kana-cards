-- phpMyAdmin SQL Dump
-- version 4.8.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 27, 2018 at 09:41 PM
-- Server version: 10.1.33-MariaDB
-- PHP Version: 7.2.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `study_amigo`
--

-- --------------------------------------------------------

--
-- Table structure for table `masteries`
--

CREATE TABLE `masteries` (
  `username` varchar(254) NOT NULL,
  `cardId` varchar(50) NOT NULL,
  `value` int(11) NOT NULL,
  `nextDue` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `username` varchar(254) NOT NULL,
  `password` varchar(64) DEFAULT NULL,
  `salt` varchar(8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`username`, `password`, `salt`) VALUES
('DEMO', 'b6ad4704db43b57ee8aee4d82b88f923d55a3cc571228bad3f886c64d36d19b2', 'fb8c545e');

-- --------------------------------------------------------

--
-- Table structure for table `vocabulary`
--

CREATE TABLE `vocabulary` (
  `spanish` varchar(50) NOT NULL,
  `english` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `vocabulary`
--

INSERT INTO `vocabulary` (`spanish`, `english`) VALUES
('Adiós', 'Goodbye'),
('Amarillo', 'Yellow'),
('Antes', 'Before'),
('Azul', 'Blue'),
('Blanco', 'White'),
('Cero', 'Zero'),
('Cinco', 'Five'),
('Cuatro', 'Four'),
('De nada', 'You\'re welcome'),
('Derecha', 'Right'),
('Después', 'After'),
('Diez', 'Ten'),
('Dos', 'Two'),
('Gracias', 'Thank you'),
('Gris', 'Grey'),
('Hasta luego', 'See you later'),
('Hola', 'Hello'),
('Izquierda', 'Left'),
('Lo siento', 'I\'m sorry'),
('Marrón', 'Brown'),
('Muchas gracias', 'Thank you very much'),
('Naranja', 'Orange'),
('Negro', 'Black'),
('No', 'No'),
('No entiendo', 'I don\'t understand'),
('No importa', 'It doesn\'t matter'),
('No lo sé', 'I don\'t know'),
('Nueve', 'Nine'),
('Ocho', 'Eight'),
('Perdón', 'Excuse me'),
('Por favor', 'Please'),
('Quiero', 'I want / I would like'),
('Rojo', 'Red'),
('Rosa', 'Pink'),
('Seis', 'Six'),
('Sí', 'Yes'),
('Siete', 'Seven'),
('Tres', 'Three'),
('Uno', 'One'),
('Vale', 'OK'),
('Verde', 'Green');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `masteries`
--
ALTER TABLE `masteries`
  ADD UNIQUE KEY `username` (`username`,`cardId`),
  ADD UNIQUE KEY `username_2` (`username`,`cardId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`username`);

--
-- Indexes for table `vocabulary`
--
ALTER TABLE `vocabulary`
  ADD PRIMARY KEY (`spanish`),
  ADD UNIQUE KEY `spanish` (`spanish`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
