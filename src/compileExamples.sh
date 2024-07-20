#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Build the project to ensure the latest version of the CLI is available
echo "Building the project..."
npm run build

# Define the path to the file where regex circuits will be appended
FILE_PATH="./src/examples.ts"

# Delete the file if it exists
if [ -f "$FILE_PATH" ]; then
  rm "$FILE_PATH"
fi

# Append various regex circuits to the file
echo "Appending regex circuits to $FILE_PATH..."

node build/src/cli.js '1=(a|b) (2=(b|c)+ )+d' -s '(a|b)' '(b|c)' d -n simpleRegex -f "$FILE_PATH"
# Note: this is not the perfect regex pattern for an email: this is just for testing purposes!
node build/src/cli.js '([a-zA-Z0-9._%-=]+@[a-zA-Z0-9-]+.[a-z]+)' -s "[a-zA-Z0-9._%-=]" "[a-zA-Z0-9-]" "[a-z]" -n emailRegex -f "$FILE_PATH"
node build/src/cli.js '([a-zA-Z0-9]|\+|/|=)+' -t [0,1],[1,1] -n base64Regex -c -f "$FILE_PATH"
node build/src/cli.js '(mina|MINA)+' -s mina MINA -n minaRegex -c -f "$FILE_PATH"
node build/src/cli.js 'a:[^abcdefghijklmnopqrstuvwxyz]+.' -s [^abcdefghijklmnopqrstuvwxyz] -n negateRegex -f "$FILE_PATH"
node build/src/cli.js '[^aeiou]+' -s '[^aeiou]+' -n negateVowel -f "$FILE_PATH"

# Format the file with Prettier to ensure consistent code style
echo -e "\nLinting $FILE_PATH with Prettier..."
npx prettier --write --ignore-unknown "$FILE_PATH"

echo -e "\n\x1b[1m\x1b[32m✓\x1b[0m Script execution completed successfully."
