#!/bin/bash

# Script to push Android platform fixes to GitHub
# Run this script from the nfc-smart-home directory

echo "Pushing Android platform fixes to GitHub..."

# Add the remote origin (if not already added)
git remote add origin https://github.com/alohaworld42/NFCminimax.git

# Push to GitHub
git push -u origin master

echo "✅ Changes pushed to GitHub successfully!"
echo "Your CI/CD pipeline should now pick up the fixes:"