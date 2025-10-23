# NFC ATTENDANCE SYSTEM | NFC-Based Event Attendance System | NFCentry

**Proponents:** Jabez Rafael Abella
**Date:** 08/19/2025

## 1. Project Overview

[cite_start]This project is an automated attendance tracking system that utilizes the Web NFC API to streamline event check-ins directly from a mobile browser. [cite: 9] [cite_start]The system is built around a central database and a web-based management interface where administrators can create events, manage user access, and monitor attendance in real-time. [cite: 10] [cite_start]Each student or employee is issued an NFC tag linked to their profile. [cite: 11] [cite_start]Designated "Attendance Takers" use the web application on a compatible smartphone (Android with Chrome) to scan attendees. [cite: 12] [cite_start]Upon a successful scan, the user is marked as present, which automatically unlocks access to essential event details, files, and resources directly on their user profile. [cite: 13] [cite_start]This ensures that only verified attendees can access event-specific materials. [cite: 14]

## 2. Problem Statement

[cite_start]Traditional attendance tracking methods such as manual roll calls, paper-based sign-ins, and barcode or QR scanning are time-consuming, prone to human error, and vulnerable to fraudulent practices like proxy attendance. [cite: 16] [cite_start]Educational institutions and organizations need a reliable, efficient, and secure method to accurately track attendance while minimizing administrative overhead and preventing attendance fraud. [cite: 17] [cite_start]These inefficiencies can lead to inaccurate attendance records, reduced accountability, and increased administrative workload. [cite: 18]

## 3. Objectives

### General Objective:

[cite_start]To develop and implement a comprehensive NFC-based attendance management system that streamlines attendance tracking, reduces administrative workload, and provides accurate, real-time attendance data for educational institutions and organizations. [cite: 21]

### Specific Objectives:

* [cite_start]Design and develop a mobile-first web application capable of reading and writing to NFC tags via the Web NFC API for attendance tracking. [cite: 23]
* [cite_start]Implement a real-time database system for storing and managing user profiles and attendance records. [cite: 24]
* [cite_start]Develop a comprehensive web-based administration panel for event creation, attendance monitoring, and reporting. [cite: 25]
* [cite_start]Implement a robust security model with role-based access control (e.g., Administrator, Attendance Taker, Attendee) that prevents common vulnerabilities like proxy attendance. [cite: 26]
* [cite_start]Ensure the system can securely manage multiple NFC tags linked to a single user account. [cite: 27]
* [cite_start]Enable data export in formats like CSV or PDF for reporting. [cite: 28]

## 4. Scope and Limitations

### Scope:

* [cite_start]Creation of a real-time attendance tracking and recording system within a web application, with security verification like geolocking the attendance system to certain spots only. [cite: 31]
* [cite_start]Implementation of the user registration and NFC card/tag assignment system. [cite: 32]
* [cite_start]Implementation of a secure user registration and multi-tag assignment system. [cite: 33]
* [cite_start]Database design and management system. [cite: 34]
* [cite_start]System testing and deployment documentation. [cite: 35]

### Limitations:

* [cite_start]The system requires users and attendance takers to have NFC-enabled smartphones. [cite: 37]
* [cite_start]The web application's core NFC scanning functionality is **strictly limited to Android devices using a compatible browser (e.g., Google Chrome)** due to the lack of Web NFC API support on all iOS browsers. [cite: 38]
* [cite_start]The system will not be functional for scanning on iPhones. [cite: 39]
* [cite_start]Initial setup costs for NFC hardware infrastructure. [cite: 40]
* [cite_start]The system is limited to proximity-based attendance, as users must be physically present to be scanned. [cite: 41]

## 5. Target Users

* [cite_start]Students [cite: 43]
* [cite_start]Faculty [cite: 44]
* [cite_start]Organizations [cite: 45]

## 6. Expected Output

* [cite_start]**A Functional Web Application:** A deployed, user-friendly web app for event management, user registration, and content access that works on desktop and mobile devices. [cite: 47] [cite_start]The NFC scanning feature will be functional on compatible Android devices. [cite: 48]
* [cite_start]**Secure Database System:** A scalable and secure database managing all user profiles, event details, and attendance records. [cite: 49]
* [cite_start]**Security Framework:** Implemented security measures that include role-based access controls and a unique verification method to prevent attendance fraud and support multiple tags per user securely. [cite: 50]