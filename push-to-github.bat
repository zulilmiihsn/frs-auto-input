@echo off
echo ========================================
echo    BPS-FRS Auto Input - Push to GitHub
echo ========================================
echo.

echo [1/6] Initializing Git repository...
git init

echo.
echo [2/6] Adding all files...
git add .

echo.
echo [3/6] Making initial commit...
git commit -m "Initial commit: BPS-FRS Auto Input Chrome Extension v1.0.0

Features:
- Auto fill dropdown form BPS FRS
- Drag & drop floating button
- Hotkey simpan dengan konfigurasi
- Dynamic Kecamatan/Kelurahan settings
- Smart detection untuk halaman siap
- Slow internet support dengan 6 trigger methods
- Chrome Extension Manifest V3"

echo.
echo [4/6] Setting up remote repository...
echo Please create a new repository on GitHub first!
echo Repository name: bps-frs-auto-input
echo Description: Chrome Extension untuk otomatisasi input form BPS FRS
echo.
echo After creating the repository, run:
echo git remote add origin https://github.com/YOUR_USERNAME/bps-frs-auto-input.git
echo git branch -M main
echo git push -u origin main

echo.
echo [5/6] Repository setup instructions:
echo 1. Go to https://github.com/new
echo 2. Repository name: bps-frs-auto-input
echo 3. Description: Chrome Extension untuk otomatisasi input form BPS FRS
echo 4. Make it Public
echo 5. Don't initialize with README (we already have one)
echo 6. Click Create repository
echo.

echo [6/6] Ready to push!
echo After setting up the remote repository, run:
echo git remote add origin https://github.com/YOUR_USERNAME/bps-frs-auto-input.git
echo git branch -M main
echo git push -u origin main

echo.
echo ========================================
echo    Setup Complete! 
echo ========================================
pause
